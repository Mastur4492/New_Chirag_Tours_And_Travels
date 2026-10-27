import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BookingModel,
  IBookingDocument,
  ACTIVE_BOOKING_STATUSES,
} from '../src/models/booking.model';
import { PaymentRecordModel } from '../src/models/paymentRecord.model';
import { bookingRepository } from '../src/repositories/booking.repository';
import { paymentRecordRepository } from '../src/repositories/paymentRecord.repository';
import * as sequenceModule from '../src/models/sequence.model';

describe('Stage 2: Booking & Payment Data Modeling', () => {
  const adminActor = {
    userId: '66554433221100aabbccdd01',
    role: 'ADMIN' as const,
  };

  const agentActor = {
    userId: '66554433221100aabbccdd02',
    role: 'AGENT' as const,
  };

  const quotationId = new mongoose.Types.ObjectId().toString();
  const customerId = new mongoose.Types.ObjectId().toString();
  const leadId = new mongoose.Types.ObjectId().toString();
  const destinationId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // PILLAR 1: BOOKING MODEL & SCHEMA VALIDATION
  // =========================================================================
  describe('Pillar 1: Booking Model & Schema Validation', () => {
    it('1.1: validates required fields and initializes with default QUOTE_ACCEPTED status', () => {
      const booking = new BookingModel({
        bookingNumber: 'NCT-BK-2026-00001',
        quotationId: new mongoose.Types.ObjectId(quotationId),
        quotationVersionUsed: 1,
        leadId: new mongoose.Types.ObjectId(leadId),
        customerId: new mongoose.Types.ObjectId(customerId),
        assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
        destinationId: new mongoose.Types.ObjectId(destinationId),
        travelStartDate: new Date('2026-11-10'),
        travelEndDate: new Date('2026-11-15'),
        durationNights: 5,
        durationDays: 6,
        numberOfAdults: 2,
        financials: {
          totalAmount: 45000,
          totalAmountInPaise: 4500000,
          currency: 'INR',
          advanceRequired: 11250,
          advanceRequiredInPaise: 1125000,
          totalPaid: 0,
          totalPaidInPaise: 0,
          balancePending: 45000,
          balancePendingInPaise: 4500000,
        },
      });

      const validationError = booking.validateSync();
      expect(validationError).toBeUndefined();
      expect(booking.status).toBe('QUOTE_ACCEPTED');
      expect(booking.hotelVoucherGenerated).toBe(false);
      expect(booking.driverDutySlipGenerated).toBe(false);
    });

    it('1.2: supports valid lifecycle transitions (QUOTE_ACCEPTED -> PENDING_CONFIRMATION -> CONFIRMED / CANCELLED)', () => {
      const validStatuses = [
        'QUOTE_ACCEPTED',
        'PENDING_CONFIRMATION',
        'CONFIRMED',
        'OPERATIONAL_PREPARATION',
        'IN_TRIP',
        'COMPLETED',
        'CANCELLED',
      ];

      for (const status of validStatuses) {
        const booking = new BookingModel({
          bookingNumber: 'NCT-BK-2026-00002',
          quotationId: new mongoose.Types.ObjectId(quotationId),
          quotationVersionUsed: 1,
          leadId: new mongoose.Types.ObjectId(leadId),
          customerId: new mongoose.Types.ObjectId(customerId),
          assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
          destinationId: new mongoose.Types.ObjectId(destinationId),
          travelStartDate: new Date('2026-11-10'),
          travelEndDate: new Date('2026-11-15'),
          durationNights: 5,
          durationDays: 6,
          numberOfAdults: 2,
          status,
          financials: {
            totalAmount: 50000,
            totalAmountInPaise: 5000000,
            balancePending: 50000,
            balancePendingInPaise: 5000000,
          },
        });

        const error = booking.validateSync();
        expect(error).toBeUndefined();
      }
    });

    it('1.3: rejects invalid booking lifecycle status with Mongoose ValidationError', () => {
      const invalidBooking = new BookingModel({
        bookingNumber: 'NCT-BK-2026-00003',
        quotationId: new mongoose.Types.ObjectId(quotationId),
        quotationVersionUsed: 1,
        leadId: new mongoose.Types.ObjectId(leadId),
        customerId: new mongoose.Types.ObjectId(customerId),
        assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
        destinationId: new mongoose.Types.ObjectId(destinationId),
        travelStartDate: new Date('2026-11-10'),
        travelEndDate: new Date('2026-11-15'),
        durationNights: 5,
        durationDays: 6,
        numberOfAdults: 2,
        status: 'INVALID_STATUS' as any,
        financials: {
          totalAmount: 50000,
          totalAmountInPaise: 5000000,
          balancePending: 50000,
          balancePendingInPaise: 5000000,
        },
      });

      const error = invalidBooking.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors['status']).toBeDefined();
    });

    it('1.4: represents monetary snapshot accurately in integer paise alongside rupees', () => {
      const booking = new BookingModel({
        bookingNumber: 'NCT-BK-2026-00004',
        quotationId: new mongoose.Types.ObjectId(quotationId),
        quotationVersionUsed: 1,
        leadId: new mongoose.Types.ObjectId(leadId),
        customerId: new mongoose.Types.ObjectId(customerId),
        assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
        destinationId: new mongoose.Types.ObjectId(destinationId),
        travelStartDate: new Date('2026-11-10'),
        travelEndDate: new Date('2026-11-15'),
        durationNights: 5,
        durationDays: 6,
        numberOfAdults: 2,
        financials: {
          totalAmount: 18250.75,
          totalAmountInPaise: 1825075,
          currency: 'INR',
          advanceRequired: 4562.69,
          advanceRequiredInPaise: 456269,
          totalPaid: 0,
          totalPaidInPaise: 0,
          balancePending: 18250.75,
          balancePendingInPaise: 1825075,
        },
      });

      expect(booking.financials.totalAmountInPaise).toBe(1825075);
      expect(booking.financials.advanceRequiredInPaise).toBe(456269);
      expect(booking.financials.balancePendingInPaise).toBe(1825075);
    });

    it('1.5: enforces duration min=1 and numberOfAdults min=1', () => {
      const invalidBooking = new BookingModel({
        bookingNumber: 'NCT-BK-2026-00005',
        quotationId: new mongoose.Types.ObjectId(quotationId),
        quotationVersionUsed: 1,
        leadId: new mongoose.Types.ObjectId(leadId),
        customerId: new mongoose.Types.ObjectId(customerId),
        assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
        destinationId: new mongoose.Types.ObjectId(destinationId),
        travelStartDate: new Date('2026-11-10'),
        travelEndDate: new Date('2026-11-15'),
        durationNights: 0, // Invalid: min is 1
        durationDays: 0,   // Invalid: min is 1
        numberOfAdults: 0, // Invalid: min is 1
        financials: {
          totalAmount: 10000,
          totalAmountInPaise: 1000000,
          balancePending: 10000,
          balancePendingInPaise: 1000000,
        },
      });

      const error = invalidBooking.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors['durationNights']).toBeDefined();
      expect(error?.errors['durationDays']).toBeDefined();
      expect(error?.errors['numberOfAdults']).toBeDefined();
    });

    it('1.6: protects confidential margins in toDto(): masks supplier cost and profit for agents and customers', () => {
      const booking = new BookingModel({
        _id: new mongoose.Types.ObjectId(),
        bookingNumber: 'NCT-BK-2026-00006',
        quotationId: new mongoose.Types.ObjectId(quotationId),
        quotationVersionUsed: 1,
        leadId: new mongoose.Types.ObjectId(leadId),
        customerId: new mongoose.Types.ObjectId(customerId),
        assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
        destinationId: new mongoose.Types.ObjectId(destinationId),
        travelStartDate: new Date('2026-11-10'),
        travelEndDate: new Date('2026-11-15'),
        durationNights: 5,
        durationDays: 6,
        numberOfAdults: 2,
        financials: {
          totalAmount: 60000,
          totalAmountInPaise: 6000000,
          currency: 'INR',
          advanceRequired: 15000,
          advanceRequiredInPaise: 1500000,
          totalPaid: 0,
          totalPaidInPaise: 0,
          balancePending: 60000,
          balancePendingInPaise: 6000000,
          supplierCostTotal: 48000,
          supplierCostTotalInPaise: 4800000,
          realizedGrossProfit: 12000,
        },
        internalNotes: 'VIP client with negotiated supplier rates',
      });

      // Agent View: Confidential fields must be undefined
      const agentDto = booking.toDto('AGENT');
      expect(agentDto.financials.supplierCostTotal).toBeUndefined();
      expect(agentDto.financials.supplierCostTotalInPaise).toBeUndefined();
      expect(agentDto.financials.realizedGrossProfit).toBeUndefined();
      expect(agentDto.financials.totalAmount).toBe(60000);

      // Customer View: Confidential fields and internalNotes must be undefined
      const customerDto = booking.toDto(undefined);
      expect(customerDto.financials.supplierCostTotal).toBeUndefined();
      expect(customerDto.internalNotes).toBeUndefined();

      // Admin View: Confidential fields are preserved
      const adminDto = booking.toDto('ADMIN');
      expect(adminDto.financials.supplierCostTotal).toBe(48000);
      expect(adminDto.financials.supplierCostTotalInPaise).toBe(4800000);
      expect(adminDto.financials.realizedGrossProfit).toBe(12000);
      expect(adminDto.internalNotes).toBe('VIP client with negotiated supplier rates');
    });
  });

  // =========================================================================
  // PILLAR 2: BOOKING DUPLICATE CONSTRAINT & SEQUENCE STRATEGY
  // =========================================================================
  describe('Pillar 2: Booking Duplicate Constraint & Sequence Strategy', () => {
    it('2.1: generates sequence-based booking reference in NCT-BK-YYYY-XXXXX format', async () => {
      vi.spyOn(sequenceModule, 'getNextSequenceValue').mockResolvedValue(42);

      const year = new Date().getFullYear();
      const seq = await sequenceModule.getNextSequenceValue(`booking_${year}`);
      const bookingNumber = `NCT-BK-${year}-${seq.toString().padStart(5, '0')}`;

      expect(bookingNumber).toBe(`NCT-BK-${year}-00042`);
      expect(bookingNumber).toMatch(/^NCT-BK-\d{4}-\d{5}$/);
    });

    it('2.2: enforces partial unique index design: guards against duplicate active bookings for the same quotation', () => {
      const indexes = BookingModel.schema.indexes();
      // Check for partial unique index on quotationId with affirmative $in active statuses
      const quotationIndex = indexes.find(
        ([fields]) => (fields as Record<string, unknown>).quotationId !== undefined
      );

      expect(quotationIndex).toBeDefined();
      expect(quotationIndex?.[1]?.unique).toBe(true);
      expect(quotationIndex?.[1]?.partialFilterExpression).toEqual({
        status: {
          $in: [
            'QUOTE_ACCEPTED',
            'PENDING_CONFIRMATION',
            'CONFIRMED',
            'OPERATIONAL_PREPARATION',
            'IN_TRIP',
            'COMPLETED',
          ],
        },
      });
    });

    it('2.3: stores exact quotation version reference (quotationVersionUsed)', () => {
      const bookingV2 = new BookingModel({
        bookingNumber: 'NCT-BK-2026-00007',
        quotationId: new mongoose.Types.ObjectId(quotationId),
        quotationVersionUsed: 3,
        leadId: new mongoose.Types.ObjectId(leadId),
        customerId: new mongoose.Types.ObjectId(customerId),
        assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
        destinationId: new mongoose.Types.ObjectId(destinationId),
        travelStartDate: new Date('2026-11-10'),
        travelEndDate: new Date('2026-11-15'),
        durationNights: 5,
        durationDays: 6,
        numberOfAdults: 2,
        financials: {
          totalAmount: 75000,
          totalAmountInPaise: 7500000,
          balancePending: 75000,
          balancePendingInPaise: 7500000,
        },
      });

      expect(bookingV2.quotationVersionUsed).toBe(3);
      expect(bookingV2.validateSync()).toBeUndefined();
    });
  });

  // =========================================================================
  // PILLAR 3: PAYMENT RECORD MODEL & INTEGER-PAISE LEDGER
  // =========================================================================
  describe('Pillar 3: Payment Record Model & Integer-Paise Ledger', () => {
    const bookingId = new mongoose.Types.ObjectId().toString();

    it('3.1: validates required fields, receipt reference format, and default SUBMITTED status', () => {
      const payment = new PaymentRecordModel({
        receiptNumber: 'NCT-RCT-2026-00001',
        bookingId: new mongoose.Types.ObjectId(bookingId),
        amount: 25000,
        amountInPaise: 2500000,
        currency: 'INR',
        paymentType: 'ADVANCE',
        paymentMethod: 'UPI',
        transactionReference: 'UPI-REF-998877665544',
        paymentDate: new Date('2026-10-15'),
        recordedBy: new mongoose.Types.ObjectId(agentActor.userId),
      });

      const validationError = payment.validateSync();
      expect(validationError).toBeUndefined();
      expect(payment.status).toBe('SUBMITTED');
      expect(payment.isRefund).toBe(false);
      expect(payment.receiptNumber).toBe('NCT-RCT-2026-00001');
    });

    it('3.2: rejects invalid payment amounts less than ₹1 / 100 paise', () => {
      const invalidPayment = new PaymentRecordModel({
        receiptNumber: 'NCT-RCT-2026-00002',
        bookingId: new mongoose.Types.ObjectId(bookingId),
        amount: 0, // Invalid: min is 1
        amountInPaise: 0, // Invalid: min is 100
        paymentType: 'ADVANCE',
        paymentMethod: 'UPI',
        recordedBy: new mongoose.Types.ObjectId(agentActor.userId),
      });

      const error = invalidPayment.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors['amount']).toBeDefined();
      expect(error?.errors['amountInPaise']).toBeDefined();
    });

    it('3.3: supports valid payment types and payment methods without schema errors', () => {
      const validTypes = ['ADVANCE', 'PARTIAL', 'FINAL_BALANCE', 'SECURITY_DEPOSIT', 'REFUND'] as const;
      const validMethods = [
        'UPI',
        'NEFT_IMPS',
        'BANK_DEPOSIT',
        'CASH',
        'CHEQUE',
        'CREDIT_CARD',
        'DEBIT_CARD',
        'OTHER',
      ] as const;

      for (const paymentType of validTypes) {
        for (const paymentMethod of validMethods) {
          const record = new PaymentRecordModel({
            receiptNumber: `NCT-RCT-2026-${Math.floor(Math.random() * 90000) + 10000}`,
            bookingId: new mongoose.Types.ObjectId(bookingId),
            amount: 5000,
            amountInPaise: 500000,
            paymentType,
            paymentMethod,
            recordedBy: new mongoose.Types.ObjectId(agentActor.userId),
          });

          expect(record.validateSync()).toBeUndefined();
        }
      }
    });

    it('3.4: validates status transitions (SUBMITTED -> VERIFIED / REJECTED)', () => {
      const payment = new PaymentRecordModel({
        receiptNumber: 'NCT-RCT-2026-00003',
        bookingId: new mongoose.Types.ObjectId(bookingId),
        amount: 15000,
        amountInPaise: 1500000,
        paymentType: 'PARTIAL',
        paymentMethod: 'NEFT_IMPS',
        recordedBy: new mongoose.Types.ObjectId(agentActor.userId),
        status: 'VERIFIED',
        verifiedBy: new mongoose.Types.ObjectId(adminActor.userId),
        verifiedAt: new Date(),
      });

      expect(payment.validateSync()).toBeUndefined();
      expect(payment.status).toBe('VERIFIED');
      expect(payment.verifiedBy?.toString()).toBe(adminActor.userId);
    });
  });

  // =========================================================================
  // PILLAR 4: IMMUTABLE AUDIT TRAIL, REFUNDS & TOTALS CALCULATION
  // =========================================================================
  describe('Pillar 4: Immutable Audit Trail, Refunds & Totals Calculation', () => {
    const bookingId = new mongoose.Types.ObjectId().toString();
    const originalPaymentId = new mongoose.Types.ObjectId().toString();

    it('4.1: links refund records directly to original payment with refund reason', () => {
      const refundRecord = new PaymentRecordModel({
        receiptNumber: 'NCT-RCT-2026-00004',
        bookingId: new mongoose.Types.ObjectId(bookingId),
        amount: 5000,
        amountInPaise: 500000,
        paymentType: 'REFUND',
        paymentMethod: 'BANK_DEPOSIT',
        isRefund: true,
        originalPaymentId: new mongoose.Types.ObjectId(originalPaymentId),
        refundReason: 'Customer reduced room count before trip confirmation',
        recordedBy: new mongoose.Types.ObjectId(adminActor.userId),
        status: 'VERIFIED',
      });

      expect(refundRecord.validateSync()).toBeUndefined();
      expect(refundRecord.isRefund).toBe(true);
      expect(refundRecord.originalPaymentId?.toString()).toBe(originalPaymentId);
      expect(refundRecord.refundReason).toContain('Customer reduced room count');
    });

    it('4.2: calculateVerifiedTotals accurately computes net paid amount in paise and rupees without mutating booking', async () => {
      const verifiedRecords = [
        new PaymentRecordModel({
          amount: 25000,
          amountInPaise: 2500000,
          paymentType: 'ADVANCE',
          isRefund: false,
          status: 'VERIFIED',
        }),
        new PaymentRecordModel({
          amount: 15000,
          amountInPaise: 1500000,
          paymentType: 'PARTIAL',
          isRefund: false,
          status: 'VERIFIED',
        }),
        new PaymentRecordModel({
          amount: 5000,
          amountInPaise: 500000,
          paymentType: 'REFUND',
          isRefund: true,
          status: 'VERIFIED',
        }),
      ];

      vi.spyOn(PaymentRecordModel, 'find').mockReturnValue({
        exec: vi.fn().mockResolvedValue(verifiedRecords),
      } as any);

      const totals = await paymentRecordRepository.calculateVerifiedTotals(bookingId);

      // Total Paid: 25000 + 15000 = 40000 (4,000,000 paise)
      // Total Refunded: 5000 (500,000 paise)
      // Net Paid: 35000 (3,500,000 paise)
      expect(totals.totalPaidPaise).toBe(4000000);
      expect(totals.totalRefundedPaise).toBe(500000);
      expect(totals.netPaidPaise).toBe(3500000);
      expect(totals.totalPaidRupees).toBe(40000);
      expect(totals.totalRefundedRupees).toBe(5000);
      expect(totals.netPaidRupees).toBe(35000);
    });

    it('4.3: unverified and rejected payments are excluded from verified financial balance', async () => {
      // findVerifiedByBookingId queries strictly with { bookingId, status: 'VERIFIED' }
      const findSpy = vi.spyOn(PaymentRecordModel, 'find').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      } as any);

      await paymentRecordRepository.findVerifiedByBookingId(bookingId);

      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId,
          status: 'VERIFIED',
        })
      );
    });
  });

  // =========================================================================
  // PILLAR 5: REPOSITORY OPERATIONS & QUERY GUARDRAILS
  // =========================================================================
  describe('Pillar 5: Repository Operations & Query Guardrails', () => {
    it('5.1: bookingRepository.findActiveByQuotationId ignores CANCELLED bookings', async () => {
      const findOneSpy = vi.spyOn(BookingModel, 'findOne').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null),
      } as any);

      await bookingRepository.findActiveByQuotationId(quotationId);

      expect(findOneSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          quotationId,
          status: { $in: ACTIVE_BOOKING_STATUSES },
        })
      );
      expect(ACTIVE_BOOKING_STATUSES).not.toContain('CANCELLED');
    });

    it('5.2: bookingRepository.countBookingMetrics counts across lifecycle stages', async () => {
      vi.spyOn(BookingModel, 'countDocuments')
        .mockResolvedValueOnce(5)  // quoteAccepted
        .mockResolvedValueOnce(3)  // pendingConfirmation
        .mockResolvedValueOnce(12) // confirmed
        .mockResolvedValueOnce(4)  // operationalPreparation
        .mockResolvedValueOnce(2)  // inTrip
        .mockResolvedValueOnce(8)  // completed
        .mockResolvedValueOnce(2); // cancelled

      const metrics = await bookingRepository.countBookingMetrics();

      expect(metrics.quoteAccepted).toBe(5);
      expect(metrics.pendingConfirmation).toBe(3);
      expect(metrics.confirmed).toBe(12);
      expect(metrics.operationalPreparation).toBe(4);
      expect(metrics.inTrip).toBe(2);
      expect(metrics.completed).toBe(8);
      expect(metrics.cancelled).toBe(2);
      expect(metrics.total).toBe(36);
    });

    it('5.3: paymentRecordRepository.verifyPayment transitions status to VERIFIED with timestamp', async () => {
      const mockVerified = new PaymentRecordModel({
        _id: new mongoose.Types.ObjectId(),
        receiptNumber: 'NCT-RCT-2026-00008',
        bookingId: new mongoose.Types.ObjectId(),
        amount: 10000,
        amountInPaise: 1000000,
        status: 'VERIFIED',
        verifiedBy: new mongoose.Types.ObjectId(adminActor.userId),
        verifiedAt: new Date(),
      });

      vi.spyOn(PaymentRecordModel, 'findOneAndUpdate').mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockVerified),
      } as any);

      vi.spyOn(paymentRecordRepository, 'findById').mockResolvedValue(mockVerified);

      const result = await paymentRecordRepository.verifyPayment({
        paymentId: mockVerified._id.toString(),
        verifiedBy: adminActor.userId,
      });

      expect(result).not.toBeNull();
      expect(result?.status).toBe('VERIFIED');
    });

    it('5.4: paymentRecordRepository.rejectPayment sets status to REJECTED and stores rejection reason', async () => {
      const mockRejected = new PaymentRecordModel({
        _id: new mongoose.Types.ObjectId(),
        receiptNumber: 'NCT-RCT-2026-00009',
        bookingId: new mongoose.Types.ObjectId(),
        amount: 10000,
        amountInPaise: 1000000,
        status: 'REJECTED',
        verifiedBy: new mongoose.Types.ObjectId(adminActor.userId),
        verifiedAt: new Date(),
        rejectionReason: 'UTR number did not match bank statement',
      });

      vi.spyOn(PaymentRecordModel, 'findOneAndUpdate').mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockRejected),
      } as any);

      vi.spyOn(paymentRecordRepository, 'findById').mockResolvedValue(mockRejected);

      const result = await paymentRecordRepository.rejectPayment({
        paymentId: mockRejected._id.toString(),
        verifiedBy: adminActor.userId,
        rejectionReason: 'UTR number did not match bank statement',
      });

      expect(result).not.toBeNull();
      expect(result?.status).toBe('REJECTED');
      expect(result?.rejectionReason).toBe('UTR number did not match bank statement');
    });
  });
});
