import crypto from 'crypto';
import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingModel } from '../src/models/booking.model';
import { QuotationModel } from '../src/models/quotation.model';
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { bookingRepository } from '../src/repositories/booking.repository';
import { leadRepository } from '../src/repositories/lead.repository';
import { quotationRepository } from '../src/repositories/quotation.repository';
import { quotationService } from '../src/services/quotation.service';
import * as sequenceModule from '../src/models/sequence.model';
import { AppError } from '../src/utils/appError';

describe('Stage 3: Public Quotation Acceptance to Booking Request Workflow', () => {
  const quoteId = '66554433221100aabbccdd10';
  const leadId = '66554433221100aabbccdd20';
  const customerId = '66554433221100aabbccdd30';
  const agentId = '66554433221100aabbccdd40';
  const destinationId = '66554433221100aabbccdd50';

  const rawToken = '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const createMockQuote = (overrides: Record<string, unknown> = {}) =>
    new QuotationModel({
      _id: new mongoose.Types.ObjectId(quoteId),
      quoteNumber: 'NCT-QT-2026-00001',
      leadId: new mongoose.Types.ObjectId(leadId),
      customerId: new mongoose.Types.ObjectId(customerId),
      assignedAgentId: new mongoose.Types.ObjectId(agentId),
      destinationId: new mongoose.Types.ObjectId(destinationId),
      currentVersion: 2,
      status: 'ISSUED',
      shareableTokenHash: tokenHash,
      validUntil: new Date(Date.now() + 86400000 * 5),
      travelStartDate: new Date('2026-11-10'),
      travelEndDate: new Date('2026-11-15'),
      durationNights: 5,
      durationDays: 6,
      numberOfAdults: 2,
      numberOfChildren: 1,
      numberOfInfants: 0,
      hotels: [],
      transports: [],
      pricingSummary: {
        totalBaseSupplierCost: 35000,
        totalMarkupAmount: 7000,
        markupPercent: 20,
        discountAmount: 0,
        discountPercent: 0,
        taxableAmount: 42000,
        taxRatePercent: 5,
        taxAmount: 2100,
        isTaxApplicable: true,
        finalSellingPrice: 44100,
        projectedGrossProfit: 7000,
      },
      ...overrides,
    });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(sequenceModule, 'getNextSequenceValue').mockResolvedValue(101);
    vi.spyOn(leadRepository, 'findById').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(leadId),
      status: 'CONVERTED',
      timeline: [{ type: 'QUOTATION_ACCEPTED', title: 'NCT-BK-2026-00101' }],
    } as any);
    vi.spyOn(leadRepository, 'update').mockResolvedValue({} as any);
    vi.spyOn(leadRepository, 'addTimelineEvent').mockResolvedValue({} as any);
    vi.spyOn(auditLogRepository, 'findQuotationAcceptanceLog').mockResolvedValue({} as any);
    vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null as any);
  });

  // =========================================================================
  // PILLAR 1: SUCCESSFUL ACCEPTANCE & EXACT BOOKING REQUEST CREATION
  // =========================================================================
  describe('Pillar 1: Acceptance to Booking Request Creation', () => {
    it('1.1: creates exactly one booking request with status QUOTE_ACCEPTED on public quotation acceptance', async () => {
      const quote = createMockQuote();

      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(quote);
      vi.spyOn(bookingRepository, 'findActiveByQuotationId').mockResolvedValue(null);

      const acceptedQuote = createMockQuote({ status: 'ACCEPTED', acceptedAt: new Date() });
      vi.spyOn(quotationRepository, 'atomicAcceptQuotation').mockResolvedValue(acceptedQuote);

      let createdBookingData: any = null;
      const mockCreatedBooking = new BookingModel({
        _id: new mongoose.Types.ObjectId(),
        bookingNumber: 'NCT-BK-2026-00101',
        status: 'QUOTE_ACCEPTED',
      });

      vi.spyOn(bookingRepository, 'create').mockImplementation(async (data: any) => {
        createdBookingData = data;
        return new BookingModel({ ...data, _id: new mongoose.Types.ObjectId() });
      });

      const quoteUpdateSpy = vi.spyOn(quotationRepository, 'update').mockResolvedValue(acceptedQuote);

      const result = await quotationService.acceptPublicQuotation(rawToken, 'Please ensure quiet rooms');

      // 1. Status is strictly QUOTE_ACCEPTED (never automatically CONFIRMED)
      expect(createdBookingData).not.toBeNull();
      expect(createdBookingData.status).toBe('QUOTE_ACCEPTED');
      expect(createdBookingData.bookingNumber).toBe(`NCT-BK-${new Date().getFullYear()}-00101`);

      // 2. References & version pinning
      expect(createdBookingData.quotationId.toString()).toBe(quoteId);
      expect(createdBookingData.quotationVersionUsed).toBe(2);
      expect(createdBookingData.customerId.toString()).toBe(customerId);
      expect(createdBookingData.leadId.toString()).toBe(leadId);
      expect(createdBookingData.assignedAgentId.toString()).toBe(agentId);
      expect(createdBookingData.customerNotes).toBe('Please ensure quiet rooms');

      // 3. Financial snapshot with integer paise
      expect(createdBookingData.financials.totalAmount).toBe(44100);
      expect(createdBookingData.financials.totalAmountInPaise).toBe(4410000);
      expect(createdBookingData.financials.currency).toBe('INR');
      expect(createdBookingData.financials.supplierCostTotal).toBe(35000);
      expect(createdBookingData.financials.supplierCostTotalInPaise).toBe(3500000);
      expect(createdBookingData.financials.realizedGrossProfit).toBe(7000);

      // 4. Linked back to quotation
      expect(quoteUpdateSpy).toHaveBeenCalledWith(
        quoteId,
        expect.objectContaining({
          bookingNumber: `NCT-BK-${new Date().getFullYear()}-00101`,
        })
      );

      // 5. Public response receives bookingNumber
      expect(result.bookingNumber).toBe(`NCT-BK-${new Date().getFullYear()}-00101`);
    });

    it('1.2: does not leak confidential supplier cost or profit in public response', async () => {
      const quote = createMockQuote();

      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(quote);
      vi.spyOn(bookingRepository, 'findActiveByQuotationId').mockResolvedValue(null);
      vi.spyOn(quotationRepository, 'atomicAcceptQuotation').mockResolvedValue(quote);
      vi.spyOn(bookingRepository, 'create').mockResolvedValue(
        new BookingModel({
          _id: new mongoose.Types.ObjectId(),
          bookingNumber: 'NCT-BK-2026-00101',
          status: 'QUOTE_ACCEPTED',
        })
      );
      vi.spyOn(quotationRepository, 'update').mockResolvedValue(quote);

      const result = await quotationService.acceptPublicQuotation(rawToken);

      const json = JSON.stringify(result);
      expect(json).not.toContain('totalBaseSupplierCost');
      expect(json).not.toContain('supplierCostTotal');
      expect(json).not.toContain('projectedGrossProfit');
      expect(json).not.toContain('realizedGrossProfit');
    });
  });

  // =========================================================================
  // PILLAR 2: IDEMPOTENCY & DUPLICATE KEY CONFLICT RESILIENCE
  // =========================================================================
  describe('Pillar 2: Idempotency & Concurrency Safety', () => {
    it('2.1: repeated acceptance returns existing booking without creating duplicates or duplicate CRM events', async () => {
      const existingBooking = new BookingModel({
        _id: new mongoose.Types.ObjectId('66554433221100aabbccdd99'),
        bookingNumber: 'NCT-BK-2026-00055',
        status: 'QUOTE_ACCEPTED',
      });

      const alreadyAcceptedQuote = createMockQuote({
        status: 'ACCEPTED',
        bookingId: existingBooking._id,
        bookingNumber: existingBooking.bookingNumber,
      });

      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(alreadyAcceptedQuote);
      vi.spyOn(bookingRepository, 'findActiveByQuotationId').mockResolvedValue(existingBooking);
      vi.spyOn(leadRepository, 'findById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(leadId),
        status: 'CONVERTED',
        timeline: [{ type: 'QUOTATION_ACCEPTED', title: 'Quotation Accepted (NCT-BK-2026-00055)' }],
      } as any);

      const bookingCreateSpy = vi.spyOn(bookingRepository, 'create');
      const timelineSpy = vi.spyOn(leadRepository, 'addTimelineEvent');
      const auditSpy = vi.spyOn(auditLogRepository, 'record');

      const result = await quotationService.acceptPublicQuotation(rawToken);

      expect(result.status).toBe('ACCEPTED');
      expect(result.bookingNumber).toBe('NCT-BK-2026-00055');

      // Idempotency: no second booking created, no duplicate CRM events
      expect(bookingCreateSpy).not.toHaveBeenCalled();
      expect(timelineSpy).not.toHaveBeenCalled();
      expect(auditSpy).not.toHaveBeenCalled();
    });

    it('2.2: handles MongoDB duplicate-key (E11000) collision gracefully by resolving to the active booking', async () => {
      const quote = createMockQuote();
      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(quote);
      vi.spyOn(bookingRepository, 'findActiveByQuotationId').mockResolvedValue(
        new BookingModel({
          _id: new mongoose.Types.ObjectId('66554433221100aabbccdd99'),
          bookingNumber: 'NCT-BK-2026-00077',
          status: 'QUOTE_ACCEPTED',
        })
      );

      const acceptedQuote = createMockQuote({ status: 'ACCEPTED', acceptedAt: new Date() });
      vi.spyOn(quotationRepository, 'atomicAcceptQuotation').mockResolvedValue(acceptedQuote);
      vi.spyOn(quotationRepository, 'update').mockResolvedValue(acceptedQuote);

      // Simulate MongoDB partial unique index collision (code 11000)
      const duplicateKeyError = new Error('E11000 duplicate key error collection: bookings index: quotationId_1');
      (duplicateKeyError as any).code = 11000;
      vi.spyOn(bookingRepository, 'create').mockRejectedValue(duplicateKeyError);

      const result = await quotationService.acceptPublicQuotation(rawToken);

      expect(result.status).toBe('ACCEPTED');
      expect(result.bookingNumber).toBe('NCT-BK-2026-00077');
    });
  });

  // =========================================================================
  // PILLAR 3: ATOMIC ROLLBACK ON CATASTROPHIC BOOKING CREATION FAILURE
  // =========================================================================
  describe('Pillar 3: Atomic Rollback on Booking Creation Failure', () => {
    it('3.1: safely rolls back quotation status to ISSUED if booking creation crashes unexpectedly, avoiding orphaned state', async () => {
      const quote = createMockQuote({ status: 'ISSUED' });
      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(quote);
      vi.spyOn(bookingRepository, 'findActiveByQuotationId').mockResolvedValue(null);
      vi.spyOn(quotationRepository, 'atomicAcceptQuotation').mockResolvedValue(quote);

      // Simulate unexpected database crash (non-11000, e.g. Disk full, Network I/O failure)
      const unexpectedError = new Error('FATAL: Database I/O disk failure during booking write');
      vi.spyOn(bookingRepository, 'create').mockRejectedValue(unexpectedError);

      const rollbackSpy = vi.spyOn(quotationRepository, 'revertQuotationAcceptance').mockResolvedValue(quote);

      await expect(
        quotationService.acceptPublicQuotation(rawToken)
      ).rejects.toThrow(/reverted/i);

      // Verification: Quotation acceptance was rolled back to avoid orphaned accepted quote!
      expect(rollbackSpy).toHaveBeenCalledWith(quoteId, 'ISSUED');
    });

    it('3.2: rejects expired and superseded quotation links before creating any booking', async () => {
      // 1. Expired Quote
      const expiredQuote = createMockQuote({ validUntil: new Date(Date.now() - 3600000) });
      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(expiredQuote);
      const createSpy = vi.spyOn(bookingRepository, 'create');

      await expect(quotationService.acceptPublicQuotation(rawToken)).rejects.toThrow(/expired/i);
      expect(createSpy).not.toHaveBeenCalled();

      // 2. Superseded Quote
      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(null);
      vi.spyOn(quotationRepository, 'findBySupersededTokenHash').mockResolvedValue(createMockQuote());

      await expect(quotationService.acceptPublicQuotation(rawToken)).rejects.toThrow(/updated with a newer version/i);
      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // PILLAR 4: CRASH-RECOVERY & SELF-HEALING SCENARIOS (STAGE 3.1)
  // =========================================================================
  describe('Pillar 4: Acceptance Crash-Recovery & Self-Healing', () => {
    it('4.1: recovers missing booking when quotation was already ACCEPTED but crashed before booking creation, never returning undefined bookingNumber', async () => {
      // Scenario: Server crashed after atomicAcceptQuotation marked ACCEPTED, before booking creation
      const acceptedQuoteNoBooking = createMockQuote({
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        bookingId: undefined,
        bookingNumber: undefined,
      });

      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(acceptedQuoteNoBooking);
      // findActiveByQuotationId returns null because booking was never created before the crash
      vi.spyOn(bookingRepository, 'findActiveByQuotationId').mockResolvedValue(null);

      const bookingCreateSpy = vi.spyOn(bookingRepository, 'create').mockResolvedValue(
        new BookingModel({
          _id: new mongoose.Types.ObjectId('66554433221100aabbccdd88'),
          bookingNumber: 'NCT-BK-2026-00101',
          status: 'QUOTE_ACCEPTED',
          financials: {
            totalAmount: 44100,
            totalAmountInPaise: 4410000,
            currency: 'INR',
            advanceRequired: 0,
            advanceRequiredInPaise: 0,
            totalPaid: 0,
            totalPaidInPaise: 0,
            balancePending: 44100,
            balancePendingInPaise: 4410000,
          },
        })
      );

      const quoteUpdateSpy = vi.spyOn(quotationRepository, 'update').mockResolvedValue(acceptedQuoteNoBooking);
      vi.spyOn(leadRepository, 'findById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(leadId),
        status: 'QUOTED',
        timeline: [],
      } as any);
      vi.spyOn(auditLogRepository, 'findQuotationAcceptanceLog').mockResolvedValue(null);

      const result = await quotationService.acceptPublicQuotation(rawToken);

      // Self-healing: Booking creation was safely resumed!
      expect(bookingCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          quotationId: expect.anything(),
          status: 'QUOTE_ACCEPTED',
          quotationVersionUsed: 2,
        })
      );
      // Link was persisted to MongoDB
      expect(quoteUpdateSpy).toHaveBeenCalledWith(
        quoteId,
        expect.objectContaining({
          bookingNumber: 'NCT-BK-2026-00101',
        })
      );
      // Customer receives real booking number, NEVER undefined!
      expect(result.status).toBe('ACCEPTED');
      expect(result.bookingNumber).toBe('NCT-BK-2026-00101');
      expect(result.bookingNumber).not.toBeUndefined();
    });

    it('4.2: permanently persists unpersisted booking link to MongoDB on retry if previous write crashed mid-flight', async () => {
      const activeBooking = new BookingModel({
        _id: new mongoose.Types.ObjectId('66554433221100aabbccdd77'),
        bookingNumber: 'NCT-BK-2026-00077',
        status: 'QUOTE_ACCEPTED',
      });

      // Quotation is ACCEPTED, but in DB bookingId was never updated due to crash
      const quotationUnlinked = createMockQuote({
        status: 'ACCEPTED',
        bookingId: undefined,
        bookingNumber: undefined,
      });

      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(quotationUnlinked);
      vi.spyOn(bookingRepository, 'findActiveByQuotationId').mockResolvedValue(activeBooking);

      const quoteUpdateSpy = vi.spyOn(quotationRepository, 'update').mockResolvedValue(quotationUnlinked);
      vi.spyOn(leadRepository, 'findById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(leadId),
        status: 'CONVERTED',
        timeline: [{ type: 'QUOTATION_ACCEPTED', title: 'NCT-BK-2026-00077' }],
      } as any);
      vi.spyOn(auditLogRepository, 'findQuotationAcceptanceLog').mockResolvedValue({} as any);

      const result = await quotationService.acceptPublicQuotation(rawToken);

      // Verifies self-healing: quotation document in DB was updated with bookingId & bookingNumber!
      expect(quoteUpdateSpy).toHaveBeenCalledWith(
        quoteId,
        expect.objectContaining({
          bookingId: activeBooking._id,
          bookingNumber: 'NCT-BK-2026-00077',
        })
      );
      expect(result.bookingNumber).toBe('NCT-BK-2026-00077');
    });

    it('4.3: reconciles missing Lead timeline and audit log on retry without creating duplicates if already present', async () => {
      const activeBooking = new BookingModel({
        _id: new mongoose.Types.ObjectId('66554433221100aabbccdd77'),
        bookingNumber: 'NCT-BK-2026-00077',
        status: 'QUOTE_ACCEPTED',
      });

      const acceptedQuote = createMockQuote({
        status: 'ACCEPTED',
        bookingId: activeBooking._id,
        bookingNumber: activeBooking.bookingNumber,
      });

      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(acceptedQuote);
      vi.spyOn(bookingRepository, 'findActiveByQuotationId').mockResolvedValue(activeBooking);

      // Case A: Missing timeline event and missing audit log (reconciliation triggers)
      const mockLeadUnreconciled = {
        _id: new mongoose.Types.ObjectId(leadId),
        status: 'QUOTED',
        timeline: [],
      };
      vi.spyOn(leadRepository, 'findById').mockResolvedValue(mockLeadUnreconciled as any);
      const leadUpdateSpy = vi.spyOn(leadRepository, 'update');
      const timelineSpy = vi.spyOn(leadRepository, 'addTimelineEvent');
      vi.spyOn(auditLogRepository, 'findQuotationAcceptanceLog').mockResolvedValue(null);
      const auditRecordSpy = vi.spyOn(auditLogRepository, 'record');

      await quotationService.acceptPublicQuotation(rawToken);

      expect(leadUpdateSpy).toHaveBeenCalledWith(leadId, { status: 'CONVERTED' });
      expect(timelineSpy).toHaveBeenCalledWith(
        leadId,
        expect.objectContaining({
          type: 'QUOTATION_ACCEPTED',
          title: expect.stringContaining('NCT-BK-2026-00077'),
        })
      );
      expect(auditRecordSpy).toHaveBeenCalled();

      // Case B: Second retry where timeline and audit log already exist (no duplicate created)
      vi.clearAllMocks();
      const mockLeadAlreadyReconciled = {
        _id: new mongoose.Types.ObjectId(leadId),
        status: 'CONVERTED',
        timeline: [{ type: 'QUOTATION_ACCEPTED', title: 'Quotation Accepted (NCT-BK-2026-00077)' }],
      };
      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(acceptedQuote);
      vi.spyOn(bookingRepository, 'findActiveByQuotationId').mockResolvedValue(activeBooking);
      vi.spyOn(leadRepository, 'findById').mockResolvedValue(mockLeadAlreadyReconciled as any);
      vi.spyOn(auditLogRepository, 'findQuotationAcceptanceLog').mockResolvedValue({} as any);

      await quotationService.acceptPublicQuotation(rawToken);

      expect(leadUpdateSpy).not.toHaveBeenCalled();
      expect(timelineSpy).not.toHaveBeenCalled();
      expect(auditRecordSpy).not.toHaveBeenCalled();
    });
  });
});
