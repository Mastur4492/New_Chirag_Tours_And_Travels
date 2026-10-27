import crypto from 'crypto';
import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditLogModel } from '../src/models/auditLog.model';
import { BookingModel } from '../src/models/booking.model';
import { QuotationModel } from '../src/models/quotation.model';
import { QuotationVersionModel } from '../src/models/quotationVersion.model';
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { bookingRepository } from '../src/repositories/booking.repository';
import { leadRepository } from '../src/repositories/lead.repository';
import { quotationRepository } from '../src/repositories/quotation.repository';
import { quotationVersionRepository } from '../src/repositories/quotationVersion.repository';
import { quotationService } from '../src/services/quotation.service';
import { userRepository } from '../src/repositories/user.repository';
import { AppError } from '../src/utils/appError';

describe('Stage 1: Security Fixes — AuditLog Actor Modeling & Quotation Revision Token Revocation', () => {
  const adminActor = {
    userId: '66554433221100aabbccdd01',
    role: 'ADMIN' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'vitest-test-agent',
  };

  const agentActor = {
    userId: '66554433221100aabbccdd02',
    role: 'AGENT' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'vitest-test-agent',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // PILLAR 1: AUDITLOG ACTOR MODELING & ZERO BSON CAST ERRORS
  // =========================================================================
  describe('Pillar 1: AuditLog Actor Modeling', () => {
    it('1.1: successfully records PUBLIC_CUSTOMER audit events without BSON cast error', async () => {
      const mockSavedDoc = new AuditLogModel({
        _id: new mongoose.Types.ObjectId(),
        actorType: 'PUBLIC_CUSTOMER',
        actorId: undefined,
        actorRole: undefined,
        action: 'QUOTATION_STATUS_UPDATED',
        entityType: 'QUOTATION',
        entityId: '66554433221100aabbccdd99',
        notes: 'Quotation accepted by traveler online',
        timestamp: new Date(),
      });

      vi.spyOn(AuditLogModel.prototype, 'save').mockResolvedValue(mockSavedDoc as any);

      // Explicit actorType call with no actorId
      const recorded = await auditLogRepository.record({
        actorType: 'PUBLIC_CUSTOMER',
        action: 'QUOTATION_STATUS_UPDATED',
        entityType: 'QUOTATION',
        entityId: '66554433221100aabbccdd99',
        notes: 'Quotation accepted by traveler online',
        newState: { status: 'ACCEPTED' },
      });

      expect(recorded).not.toBeNull();
      expect(recorded?.actorType).toBe('PUBLIC_CUSTOMER');
      expect(recorded?.actorId).toBeUndefined();

      const dto = recorded?.toDto();
      expect(dto?.actorType).toBe('PUBLIC_CUSTOMER');
      expect(dto?.actorId).toBeUndefined();
      expect(dto?.action).toBe('QUOTATION_STATUS_UPDATED');
    });

    it('1.2: safely handles legacy string actorId="PUBLIC_CUSTOMER" without throwing BSON error', async () => {
      const mockSavedDoc = new AuditLogModel({
        _id: new mongoose.Types.ObjectId(),
        actorType: 'PUBLIC_CUSTOMER',
        actorId: undefined,
        action: 'QUOTATION_STATUS_UPDATED',
        entityType: 'QUOTATION',
        entityId: '66554433221100aabbccdd99',
        notes: 'Legacy customer string call',
        timestamp: new Date(),
      });

      vi.spyOn(AuditLogModel.prototype, 'save').mockResolvedValue(mockSavedDoc as any);

      // Caller passes legacy string actorId="PUBLIC_CUSTOMER"
      const recorded = await auditLogRepository.record({
        actorId: 'PUBLIC_CUSTOMER',
        action: 'QUOTATION_STATUS_UPDATED',
        entityType: 'QUOTATION',
        entityId: '66554433221100aabbccdd99',
        notes: 'Legacy customer string call',
      });

      expect(recorded).not.toBeNull();
      expect(recorded?.actorType).toBe('PUBLIC_CUSTOMER');
      expect(recorded?.actorId).toBeUndefined();
    });

    it('1.3: preserves valid USER actor with ObjectId and actorRole', async () => {
      const validUserId = new mongoose.Types.ObjectId();
      const mockSavedDoc = new AuditLogModel({
        _id: new mongoose.Types.ObjectId(),
        actorType: 'USER',
        actorId: validUserId,
        actorRole: 'ADMIN',
        action: 'QUOTATION_CREATED',
        entityType: 'QUOTATION',
        entityId: '66554433221100aabbccdd99',
        timestamp: new Date(),
      });

      vi.spyOn(AuditLogModel.prototype, 'save').mockResolvedValue(mockSavedDoc as any);

      const recorded = await auditLogRepository.record({
        actorId: validUserId.toString(),
        actorRole: 'ADMIN',
        action: 'QUOTATION_CREATED',
        entityType: 'QUOTATION',
        entityId: '66554433221100aabbccdd99',
      });

      expect(recorded).not.toBeNull();
      expect(recorded?.actorType).toBe('USER');
      expect(recorded?.actorId?.toString()).toBe(validUserId.toString());
      expect(recorded?.actorRole).toBe('ADMIN');

      const dto = recorded?.toDto();
      expect(dto?.actorType).toBe('USER');
      expect(dto?.actorId).toBe(validUserId.toString());
    });

    it('1.4: supports SYSTEM actor without requiring user credentials', async () => {
      const mockSavedDoc = new AuditLogModel({
        _id: new mongoose.Types.ObjectId(),
        actorType: 'SYSTEM',
        actorId: undefined,
        action: 'SETTINGS',
        entityType: 'SETTINGS',
        entityId: 'cron-sync-job',
        notes: 'Automated nightly rate sync',
        timestamp: new Date(),
      });

      vi.spyOn(AuditLogModel.prototype, 'save').mockResolvedValue(mockSavedDoc as any);

      const recorded = await auditLogRepository.record({
        actorType: 'SYSTEM',
        action: 'SETTINGS' as any,
        entityType: 'SETTINGS',
        entityId: 'cron-sync-job',
        notes: 'Automated nightly rate sync',
      });

      expect(recorded?.actorType).toBe('SYSTEM');
      expect(recorded?.actorId).toBeUndefined();
    });

    it('1.5: maintains backward compatibility for legacy audit documents missing actorType', () => {
      const legacyDoc = new AuditLogModel({
        _id: new mongoose.Types.ObjectId(),
        actorId: new mongoose.Types.ObjectId(),
        actorRole: 'AGENT',
        action: 'LEAD_CREATED',
        entityType: 'LEAD',
        entityId: '66554433221100aabbccdd88',
        timestamp: new Date(),
      });

      // Directly call toDto on a doc where actorType is undefined
      (legacyDoc as any).actorType = undefined;
      const dto = legacyDoc.toDto();

      expect(dto.actorType).toBe('USER');
      expect(dto.actorId).toBeDefined();
    });
  });

  // =========================================================================
  // PILLAR 2: QUOTATION REVISION TOKEN REVOCATION & SUPERSEDED HANDLING
  // =========================================================================
  describe('Pillar 2: Quotation Revision Token Revocation', () => {
    const quoteId = '66554433221100aabbccdd10';
    const rawTokenV1 = 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0';
    const tokenHashV1 = crypto.createHash('sha256').update(rawTokenV1).digest('hex');

    it('2.1: revoking/revising a quotation atomically invalidates and supersedes the old token', async () => {
      const existingQuote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(quoteId),
        quoteNumber: 'NCT-QT-2026-00001',
        leadId: new mongoose.Types.ObjectId('66554433221100aabbccdd20'),
        customerId: new mongoose.Types.ObjectId('66554433221100aabbccdd30'),
        destinationId: new mongoose.Types.ObjectId('66554433221100aabbccdd40'),
        currentVersion: 1,
        status: 'ISSUED',
        shareableTokenHash: tokenHashV1,
        validUntil: new Date(Date.now() + 86400000 * 7),
        hotels: [],
        transports: [],
        inclusions: ['Breakfast'],
        exclusions: ['Flight'],
        terms: ['Standard'],
        pricingSummary: {
          totalBaseSupplierCost: 5000,
          totalMarkupAmount: 1000,
          markupPercent: 20,
          discountAmount: 0,
          discountPercent: 0,
          taxableAmount: 6000,
          taxRatePercent: 5,
          taxAmount: 300,
          isTaxApplicable: true,
          finalSellingPrice: 6300,
          projectedGrossProfit: 1000,
        },
      });

      vi.spyOn(quotationRepository, 'findById').mockResolvedValue(existingQuote);
      vi.spyOn(leadRepository, 'findById').mockResolvedValue({
        _id: existingQuote.leadId,
        assignedAgentId: adminActor.userId,
      } as any);
      vi.spyOn(quotationVersionRepository, 'create').mockResolvedValue({} as any);
      vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);

      // Mock calculateQuoteDetails
      vi.spyOn(quotationService, 'calculateQuoteDetails').mockResolvedValue({
        hotels: [],
        transports: [],
        pricingSummary: {
          totalBaseSupplierCost: 6000,
          totalMarkupAmount: 1200,
          markupPercent: 20,
          discountAmount: 0,
          discountPercent: 0,
          taxableAmount: 7200,
          taxRatePercent: 5,
          taxAmount: 360,
          isTaxApplicable: true,
          finalSellingPrice: 7560,
          projectedGrossProfit: 1200,
        },
      } as any);

      const revisedQuote = new QuotationModel({
        ...existingQuote.toObject(),
        currentVersion: 2,
        status: 'APPROVED',
        shareableTokenHash: undefined,
        supersededTokenHashes: [tokenHashV1],
      });

      const atomicReviseSpy = vi
        .spyOn(quotationRepository, 'atomicReviseQuotation')
        .mockResolvedValue(revisedQuote);

      const result = await quotationService.reviseQuotation(
        quoteId,
        {
          changeReason: 'Client requested upgraded rooms',
          travelStartDate: '2026-11-01',
          travelEndDate: '2026-11-05',
          numberOfAdults: 2,
          markupPercent: 20,
          hotels: [],
          transports: [],
        },
        adminActor
      );

      // Assertions
      expect(atomicReviseSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          quotationId: quoteId,
          expectedVersion: 1,
          newVersion: 2,
          tokenToRevoke: tokenHashV1,
        })
      );
      expect(result.currentVersion).toBe(2);
      expect(result.shareableTokenHash).toBeUndefined();
    });

    it('2.2: rejects public viewing when presenting superseded token with clear, informative message', async () => {
      // findByShareableTokenHash returns null because active hash was unset
      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(null);

      // findBySupersededTokenHash returns the quotation indicating this token is outdated
      vi.spyOn(quotationRepository, 'findBySupersededTokenHash').mockResolvedValue(
        new QuotationModel({
          _id: new mongoose.Types.ObjectId(quoteId),
          currentVersion: 2,
          supersededTokenHashes: [tokenHashV1],
        })
      );

      await expect(quotationService.getPublicQuotation(rawTokenV1)).rejects.toThrow(
        /updated with a newer version/i
      );
    });

    it('2.3: rejects public acceptance when presenting superseded token', async () => {
      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(null);
      vi.spyOn(quotationRepository, 'findBySupersededTokenHash').mockResolvedValue(
        new QuotationModel({
          _id: new mongoose.Types.ObjectId(quoteId),
          currentVersion: 2,
          supersededTokenHashes: [tokenHashV1],
        })
      );

      await expect(quotationService.acceptPublicQuotation(rawTokenV1)).rejects.toThrow(
        /updated with a newer version and can no longer be accepted/i
      );
    });

    it('2.4: rejects public modification request when presenting superseded token', async () => {
      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(null);
      vi.spyOn(quotationRepository, 'findBySupersededTokenHash').mockResolvedValue(
        new QuotationModel({
          _id: new mongoose.Types.ObjectId(quoteId),
          currentVersion: 2,
          supersededTokenHashes: [tokenHashV1],
        })
      );

      await expect(
        quotationService.requestModificationPublicQuotation(rawTokenV1, 'Change dates')
      ).rejects.toThrow(/updated with a newer version/i);
    });

    it('2.5: rejects expired quotations server-side even if token hash is current', async () => {
      const expiredQuote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(quoteId),
        status: 'ISSUED',
        shareableTokenHash: tokenHashV1,
        validUntil: new Date(Date.now() - 3600000), // Expired 1 hour ago
      });

      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(expiredQuote);

      await expect(quotationService.getPublicQuotation(rawTokenV1)).rejects.toThrow(/expired/i);
      await expect(quotationService.acceptPublicQuotation(rawTokenV1)).rejects.toThrow(/expired/i);
    });
  });

  // =========================================================================
  // PILLAR 3: CONCURRENCY SAFETY & RACE CONDITIONS
  // =========================================================================
  describe('Pillar 3: Concurrency Safety & Race Condition Protection', () => {
    const quoteId = '66554433221100aabbccdd10';
    const rawToken = 'b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01';
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    it('3.1: prevents customer from accepting outdated pricing if Admin revised while acceptance was in-flight', async () => {
      // Step 1: Customer loaded quotation at version 1
      const initialQuoteV1 = new QuotationModel({
        _id: new mongoose.Types.ObjectId(quoteId),
        quoteNumber: 'NCT-QT-2026-00001',
        leadId: new mongoose.Types.ObjectId('66554433221100aabbccdd20'),
        currentVersion: 1,
        status: 'ISSUED',
        shareableTokenHash: tokenHash,
        validUntil: new Date(Date.now() + 86400000 * 5),
      });

      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(initialQuoteV1);

      // Step 2: During atomic update, version condition fails because Admin bumped currentVersion to 2
      vi.spyOn(quotationRepository, 'atomicAcceptQuotation').mockResolvedValue(null);

      // Step 3: Re-fetch confirms quote is now at currentVersion = 2
      const updatedQuoteV2 = new QuotationModel({
        _id: new mongoose.Types.ObjectId(quoteId),
        quoteNumber: 'NCT-QT-2026-00001',
        currentVersion: 2,
        status: 'DRAFT',
      });
      vi.spyOn(quotationRepository, 'findById').mockResolvedValue(updatedQuoteV2);

      // Assertion: Safe, clear error informs customer rather than accepting stale pricing
      await expect(
        quotationService.acceptPublicQuotation(rawToken, 'Agreed')
      ).rejects.toThrow(/revised while your request was being processed/i);
    });

    it('3.2: prevents Admin revision from silently overwriting an already accepted quotation', async () => {
      const alreadyAcceptedQuote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(quoteId),
        currentVersion: 1,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        leadId: new mongoose.Types.ObjectId('66554433221100aabbccdd20'),
      });

      vi.spyOn(quotationRepository, 'findById').mockResolvedValue(alreadyAcceptedQuote);

      await expect(
        quotationService.reviseQuotation(
          quoteId,
          {
            changeReason: 'Attempted modification on accepted quote',
            travelStartDate: '2026-12-01',
            travelEndDate: '2026-12-05',
            numberOfAdults: 2,
            markupPercent: 15,
            hotels: [],
            transports: [],
          },
          adminActor
        )
      ).rejects.toThrow(/already been accepted/i);
    });

    it('3.3: handles racing revisions: second concurrent revision is safely rejected with optimistic lock conflict', async () => {
      const quoteV1 = new QuotationModel({
        _id: new mongoose.Types.ObjectId(quoteId),
        quoteNumber: 'NCT-QT-2026-00001',
        currentVersion: 1,
        status: 'APPROVED',
        leadId: new mongoose.Types.ObjectId('66554433221100aabbccdd20'),
        customerId: new mongoose.Types.ObjectId('66554433221100aabbccdd30'),
        destinationId: new mongoose.Types.ObjectId('66554433221100aabbccdd40'),
        hotels: [],
        transports: [],
        pricingSummary: {
          totalBaseSupplierCost: 4000,
          totalMarkupAmount: 1000,
          markupPercent: 25,
          discountAmount: 0,
          discountPercent: 0,
          taxableAmount: 5000,
          taxRatePercent: 0,
          taxAmount: 0,
          isTaxApplicable: false,
          finalSellingPrice: 5000,
          projectedGrossProfit: 1000,
        },
      });

      const concurrentModifiedQuote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(quoteId),
        leadId: quoteV1.leadId,
        currentVersion: 2,
        status: 'APPROVED',
      });

      vi.spyOn(quotationRepository, 'findById')
        .mockResolvedValueOnce(quoteV1)
        .mockResolvedValueOnce(concurrentModifiedQuote);

      vi.spyOn(leadRepository, 'findById').mockResolvedValue({
        _id: quoteV1.leadId,
        assignedAgentId: adminActor.userId,
      } as any);
      vi.spyOn(quotationVersionRepository, 'create').mockResolvedValue({} as any);
      vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null as any);
      vi.spyOn(quotationService, 'calculateQuoteDetails').mockResolvedValue({
        hotels: [],
        transports: [],
        pricingSummary: { finalSellingPrice: 5500 },
      } as any);

      // atomicReviseQuotation returns null because another concurrent process already changed version to 2
      vi.spyOn(quotationRepository, 'atomicReviseQuotation').mockResolvedValue(null);

      await expect(
        quotationService.reviseQuotation(
          quoteId,
          {
            changeReason: 'Concurrent revision request',
            travelStartDate: '2026-11-01',
            travelEndDate: '2026-11-05',
            numberOfAdults: 2,
            markupPercent: 20,
            hotels: [],
            transports: [],
          },
          adminActor
        )
      ).rejects.toThrow(/modified concurrently/i);
    });

    it('3.4: handles multiple double-clicks on accept idempotently without duplicate side-effects', async () => {
      const existingBooking = new BookingModel({
        _id: new mongoose.Types.ObjectId(),
        bookingNumber: 'NCT-BK-2026-00001',
        status: 'QUOTE_ACCEPTED',
      });

      const acceptedQuote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(quoteId),
        quoteNumber: 'NCT-QT-2026-00001',
        currentVersion: 1,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        bookingId: existingBooking._id,
        bookingNumber: existingBooking.bookingNumber,
        validUntil: new Date(Date.now() + 86400000 * 5),
        pricingSummary: {
          finalSellingPrice: 8500,
        },
      });

      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(acceptedQuote);
      vi.spyOn(bookingRepository, 'findActiveByQuotationId').mockResolvedValue(existingBooking);
      vi.spyOn(quotationRepository, 'update').mockResolvedValue(acceptedQuote);
      vi.spyOn(leadRepository, 'findById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'CONVERTED',
        timeline: [{ type: 'QUOTATION_ACCEPTED', title: 'NCT-BK-2026-00001' }],
      } as any);
      vi.spyOn(auditLogRepository, 'findQuotationAcceptanceLog').mockResolvedValue({} as any);

      const addEventSpy = vi.spyOn(leadRepository, 'addTimelineEvent');
      const auditRecordSpy = vi.spyOn(auditLogRepository, 'record');

      const result = await quotationService.acceptPublicQuotation(rawToken);

      expect(result.status).toBe('ACCEPTED');
      // Idempotent: must NOT create duplicate timeline events or duplicate audit logs
      expect(addEventSpy).not.toHaveBeenCalled();
      expect(auditRecordSpy).not.toHaveBeenCalled();
    });
  });
});
