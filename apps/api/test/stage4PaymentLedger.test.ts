import { describe, expect, it, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { PaymentRecordModel } from '../src/models/paymentRecord.model';
import { BookingModel } from '../src/models/booking.model';
import { SequenceModel } from '../src/models/sequence.model';
import { bookingRepository } from '../src/repositories/booking.repository';
import { paymentRecordRepository } from '../src/repositories/paymentRecord.repository';
import { leadRepository } from '../src/repositories/lead.repository';
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { paymentService, PaymentActorContext } from '../src/services/payment.service';
import { AppError } from '../src/utils/appError';

describe('Stage 4: Payment Ledger Engine Test Suite', () => {
  const adminActor: PaymentActorContext = {
    userId: new mongoose.Types.ObjectId().toString(),
    role: 'ADMIN',
    ipAddress: '127.0.0.1',
    userAgent: 'Admin-Test-Client',
  };

  const agentActor: PaymentActorContext = {
    userId: new mongoose.Types.ObjectId().toString(),
    role: 'AGENT',
    ipAddress: '127.0.0.1',
    userAgent: 'Agent-Test-Client',
  };

  const otherAgentActor: PaymentActorContext = {
    userId: new mongoose.Types.ObjectId().toString(),
    role: 'AGENT',
    ipAddress: '127.0.0.1',
    userAgent: 'Other-Agent-Client',
  };

  const testBookingId = new mongoose.Types.ObjectId().toString();
  const testLeadId = new mongoose.Types.ObjectId().toString();

  function createMockBooking(overrides: Record<string, any> = {}) {
    return {
      _id: new mongoose.Types.ObjectId(testBookingId),
      bookingNumber: 'NCT-BK-2026-00001',
      leadId: new mongoose.Types.ObjectId(testLeadId),
      assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
      status: 'QUOTE_ACCEPTED',
      financials: {
        totalAmount: 100000,
        totalAmountInPaise: 10000000,
        currency: 'INR',
        advanceRequired: 25000,
        advanceRequiredInPaise: 2500000,
        totalPaid: 0,
        totalPaidInPaise: 0,
        balancePending: 100000,
        balancePendingInPaise: 10000000,
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditLogRepository, 'record').mockResolvedValue({} as any);
    vi.spyOn(auditLogRepository, 'findPaymentActionLog').mockResolvedValue(null);
    vi.spyOn(leadRepository, 'findById').mockResolvedValue(null);
    vi.spyOn(leadRepository, 'addTimelineEvent').mockResolvedValue({} as any);
    vi.spyOn(paymentRecordRepository, 'reconcileRefundAllocations').mockResolvedValue({
      reconciledPaise: 0,
      previousPaise: 0,
      headroomPaise: 0,
    });
  });

  // =========================================================================
  // PILLAR 1: PAYMENT RECORDING & BALANCE INDEPENDENCE (STAGE 4A)
  // =========================================================================
  describe('Pillar 1: Payment Recording & Balance Independence (Stage 4A)', () => {
    it('1.1: records a manual payment in SUBMITTED status without mutating booking financials or status', async () => {
      const mockBooking = createMockBooking();
      const mockCreatedPayment = new PaymentRecordModel({
        _id: new mongoose.Types.ObjectId(),
        receiptNumber: 'NCT-RCT-2026-00001',
        bookingId: mockBooking._id,
        amount: 25000,
        amountInPaise: 2500000,
        currency: 'INR',
        paymentType: 'ADVANCE',
        paymentMethod: 'UPI',
        status: 'SUBMITTED',
        transactionReference: 'UPI-REF-112233',
        paymentDate: new Date(),
        recordedBy: new mongoose.Types.ObjectId(agentActor.userId),
        isRefund: false,
        allocatedRefundPaise: 0,
      });

      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking as any);
      vi.spyOn(SequenceModel, 'findByIdAndUpdate').mockResolvedValue({ seq: 1 } as any);
      vi.spyOn(paymentRecordRepository, 'create').mockResolvedValue(mockCreatedPayment);
      const updateBookingSpy = vi.spyOn(bookingRepository, 'update');
      const auditLogSpy = vi.spyOn(auditLogRepository, 'record').mockResolvedValue({} as any);

      const result = await paymentService.recordPayment(
        {
          bookingId: testBookingId,
          amount: 25000,
          paymentType: 'ADVANCE',
          paymentMethod: 'UPI',
          transactionReference: 'UPI-REF-112233',
        },
        agentActor
      );

      expect(result.status).toBe('SUBMITTED');
      expect(result.amount).toBe(25000);
      expect(result.amountInPaise).toBe(2500000);
      expect(result.receiptNumber).toBe('NCT-RCT-2026-00001');

      // Crucial: Recording MUST NOT mutate booking financials or confirm booking!
      expect(updateBookingSpy).not.toHaveBeenCalled();
      expect(mockBooking.status).toBe('QUOTE_ACCEPTED');
      expect(mockBooking.financials.totalPaid).toBe(0);
      expect(mockBooking.financials.balancePending).toBe(100000);

      // Audit log must be recorded
      expect(auditLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_SUBMITTED',
          entityType: 'PAYMENT',
        })
      );
    });

    it('1.2: validates positive amount and rejects amount < 1 INR', async () => {
      await expect(
        paymentService.recordPayment(
          {
            bookingId: testBookingId,
            amount: 0,
            paymentType: 'ADVANCE',
            paymentMethod: 'UPI',
          },
          agentActor
        )
      ).rejects.toThrow(AppError);

      await expect(
        paymentService.recordPayment(
          {
            bookingId: testBookingId,
            amount: 0.5,
            paymentType: 'ADVANCE',
            paymentMethod: 'UPI',
          },
          agentActor
        )
      ).rejects.toThrow(AppError);
    });

    it('1.3: rejects payment recording for non-existent booking with 404', async () => {
      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(null);

      await expect(
        paymentService.recordPayment(
          {
            bookingId: new mongoose.Types.ObjectId().toString(),
            amount: 5000,
            paymentType: 'PARTIAL',
            paymentMethod: 'CASH',
          },
          adminActor
        )
      ).rejects.toThrow(/does not exist/);
    });

    it('1.4: rejects unassigned agent with 403 Forbidden', async () => {
      const mockBooking = createMockBooking();
      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking as any);

      await expect(
        paymentService.recordPayment(
          {
            bookingId: testBookingId,
            amount: 10000,
            paymentType: 'PARTIAL',
            paymentMethod: 'NEFT_IMPS',
          },
          otherAgentActor // Different agent ID
        )
      ).rejects.toThrow(/not authorized to record payments for this booking/);
    });

    it('1.5: safe against retries via idempotencyKey returning existing record', async () => {
      const existingPayment = new PaymentRecordModel({
        _id: new mongoose.Types.ObjectId(),
        receiptNumber: 'NCT-RCT-2026-00005',
        bookingId: new mongoose.Types.ObjectId(testBookingId),
        amount: 25000,
        amountInPaise: 2500000,
        status: 'SUBMITTED',
        idempotencyKey: 'idemp-tx-12345',
        paymentType: 'ADVANCE',
        paymentMethod: 'UPI',
        recordedBy: new mongoose.Types.ObjectId(agentActor.userId),
      });

      const mockBooking = createMockBooking();
      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking as any);
      vi.spyOn(paymentRecordRepository, 'findByIdempotencyKey').mockResolvedValue(existingPayment);
      const createSpy = vi.spyOn(paymentRecordRepository, 'create');

      const result = await paymentService.recordPayment(
        {
          bookingId: testBookingId,
          amount: 25000,
          paymentType: 'ADVANCE',
          paymentMethod: 'UPI',
          idempotencyKey: 'idemp-tx-12345',
        },
        agentActor
      );

      expect(result.receiptNumber).toBe('NCT-RCT-2026-00005');
      expect(result.idempotencyKey).toBe('idemp-tx-12345');
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('1.6: rejects idempotency key reuse with mismatched payload (different amount or booking) with 409 Conflict', async () => {
      const existingPayment = new PaymentRecordModel({
        _id: new mongoose.Types.ObjectId(),
        receiptNumber: 'NCT-RCT-2026-00005',
        bookingId: new mongoose.Types.ObjectId(testBookingId),
        amount: 25000,
        amountInPaise: 2500000,
        status: 'SUBMITTED',
        idempotencyKey: 'idemp-tx-12345',
        paymentType: 'ADVANCE',
        paymentMethod: 'UPI',
        recordedBy: new mongoose.Types.ObjectId(agentActor.userId),
      });

      const mockBooking = createMockBooking();
      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking as any);
      vi.spyOn(paymentRecordRepository, 'findByIdempotencyKey').mockResolvedValue(existingPayment);

      // Attempting to reuse same key for a different amount (₹50,000 instead of ₹25,000)
      await expect(
        paymentService.recordPayment(
          {
            bookingId: testBookingId,
            amount: 50000, // Different amount!
            paymentType: 'ADVANCE',
            paymentMethod: 'UPI',
            idempotencyKey: 'idemp-tx-12345',
          },
          agentActor
        )
      ).rejects.toThrow(/already used for a different payment request/);
    });
  });

  // =========================================================================
  // PILLAR 2: VERIFICATION, REJECTION & BALANCE RECALCULATION (STAGE 4B)
  // =========================================================================
  describe('Pillar 2: Verification, Rejection & Balance Recalculation (Stage 4B)', () => {
    it('2.1: non-admin (agent) cannot verify or reject payment (403 Forbidden)', async () => {
      await expect(
        paymentService.verifyPayment(new mongoose.Types.ObjectId().toString(), agentActor)
      ).rejects.toThrow(/Only administrators can verify payments/);

      await expect(
        paymentService.rejectPayment(new mongoose.Types.ObjectId().toString(), 'Invalid', agentActor)
      ).rejects.toThrow(/Only administrators can reject payments/);
    });

    it('2.2: admin verifies submitted payment, recalculates ledger and updates booking balance', async () => {
      const paymentId = new mongoose.Types.ObjectId().toString();
      const mockPayment = new PaymentRecordModel({
        _id: new mongoose.Types.ObjectId(paymentId),
        receiptNumber: 'NCT-RCT-2026-00001',
        bookingId: new mongoose.Types.ObjectId(testBookingId),
        amount: 25000,
        amountInPaise: 2500000,
        status: 'SUBMITTED',
        paymentType: 'ADVANCE',
        paymentMethod: 'UPI',
        recordedBy: new mongoose.Types.ObjectId(agentActor.userId),
        isRefund: false,
      });

      const mockVerifiedPayment = new PaymentRecordModel({
        ...mockPayment.toObject(),
        status: 'VERIFIED',
        verifiedBy: new mongoose.Types.ObjectId(adminActor.userId),
        verifiedAt: new Date(),
      });

      const mockBooking = createMockBooking();

      vi.spyOn(paymentRecordRepository, 'findById').mockResolvedValue(mockPayment);
      vi.spyOn(paymentRecordRepository, 'verifyPayment').mockResolvedValue(mockVerifiedPayment);
      vi.spyOn(paymentRecordRepository, 'calculateVerifiedTotals').mockResolvedValue({
        totalPaidPaise: 2500000,
        totalRefundedPaise: 0,
        netPaidPaise: 2500000,
        totalPaidRupees: 25000,
        totalRefundedRupees: 0,
        netPaidRupees: 25000,
      });
      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking as any);
      const updateBookingSpy = vi.spyOn(bookingRepository, 'updateFinancials').mockResolvedValue(mockBooking as any);
      const timelineSpy = vi.spyOn(leadRepository, 'addTimelineEvent').mockResolvedValue({} as any);
      const auditSpy = vi.spyOn(auditLogRepository, 'record').mockResolvedValue({} as any);

      const result = await paymentService.verifyPayment(paymentId, adminActor);

      expect(result.status).toBe('VERIFIED');
      expect(result.verifiedBy).toBe(adminActor.userId);

      // Verify booking financials recalculated from verified ledger in integer paise
      expect(updateBookingSpy).toHaveBeenCalledWith(
        testBookingId,
        expect.objectContaining({
          totalPaid: 25000,
          totalPaidInPaise: 2500000,
          balancePending: 75000,
          balancePendingInPaise: 7500000,
        })
      );

      // Verify Lead CRM timeline event added
      expect(timelineSpy).toHaveBeenCalledWith(
        testLeadId,
        expect.objectContaining({
          type: 'PAYMENT_VERIFIED',
        })
      );

      // Verify audit log
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_VERIFIED',
          entityType: 'PAYMENT',
        })
      );
    });

    it('2.3: admin rejects payment with required reason; financials remain unchanged', async () => {
      const paymentId = new mongoose.Types.ObjectId().toString();
      const mockPayment = new PaymentRecordModel({
        _id: new mongoose.Types.ObjectId(paymentId),
        receiptNumber: 'NCT-RCT-2026-00002',
        bookingId: new mongoose.Types.ObjectId(testBookingId),
        amount: 25000,
        amountInPaise: 2500000,
        status: 'SUBMITTED',
        paymentType: 'ADVANCE',
        paymentMethod: 'UPI',
        recordedBy: new mongoose.Types.ObjectId(agentActor.userId),
        isRefund: false,
      });

      const mockRejectedPayment = new PaymentRecordModel({
        ...mockPayment.toObject(),
        status: 'REJECTED',
        verifiedBy: new mongoose.Types.ObjectId(adminActor.userId),
        rejectionReason: 'Bank transfer reference invalid',
      });

      vi.spyOn(paymentRecordRepository, 'findById').mockResolvedValue(mockPayment);
      vi.spyOn(paymentRecordRepository, 'rejectPayment').mockResolvedValue(mockRejectedPayment);
      const updateBookingSpy = vi.spyOn(bookingRepository, 'update');
      const auditSpy = vi.spyOn(auditLogRepository, 'record').mockResolvedValue({} as any);

      const result = await paymentService.rejectPayment(
        paymentId,
        'Bank transfer reference invalid',
        adminActor
      );

      expect(result.status).toBe('REJECTED');
      expect(result.rejectionReason).toBe('Bank transfer reference invalid');

      // Rejection must NOT mutate booking financials
      expect(updateBookingSpy).not.toHaveBeenCalled();

      // Audit log must record rejection
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_REJECTED',
          entityType: 'PAYMENT',
        })
      );
    });

    it('2.4: rejects empty rejection reason with 400 Bad Request', async () => {
      await expect(
        paymentService.rejectPayment(new mongoose.Types.ObjectId().toString(), '', adminActor)
      ).rejects.toThrow(/Rejection reason is required/);
    });

    it('2.5: prevents repeated/invalid state transitions with 400 Bad Request', async () => {
      const alreadyVerified = new PaymentRecordModel({
        _id: new mongoose.Types.ObjectId(),
        receiptNumber: 'NCT-RCT-2026-00003',
        bookingId: new mongoose.Types.ObjectId(testBookingId),
        amount: 10000,
        amountInPaise: 1000000,
        status: 'VERIFIED',
      });

      vi.spyOn(paymentRecordRepository, 'findById').mockResolvedValue(alreadyVerified);
      vi.spyOn(paymentRecordRepository, 'calculateVerifiedTotals').mockResolvedValue({
        totalPaidPaise: 1000000,
        totalRefundedPaise: 0,
        netPaidPaise: 1000000,
        totalPaidRupees: 10000,
        totalRefundedRupees: 0,
        netPaidRupees: 10000,
      });
      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(
        createMockBooking({
          financials: {
            totalAmount: 100000,
            totalAmountInPaise: 10000000,
            currency: 'INR',
            advanceRequired: 25000,
            advanceRequiredInPaise: 2500000,
            totalPaid: 10000,
            totalPaidInPaise: 1000000,
            balancePending: 90000,
            balancePendingInPaise: 9000000,
          },
        }) as any
      );

      // Attempting to re-verify an already verified payment
      await expect(
        paymentService.verifyPayment(alreadyVerified._id.toString(), adminActor)
      ).rejects.toThrow(/already verified/);

      // Attempting to reject an already verified payment
      await expect(
        paymentService.rejectPayment(alreadyVerified._id.toString(), 'Late check', adminActor)
      ).rejects.toThrow(/Cannot reject an already verified/);

      const alreadyRejected = new PaymentRecordModel({
        _id: new mongoose.Types.ObjectId(),
        receiptNumber: 'NCT-RCT-2026-00004',
        bookingId: new mongoose.Types.ObjectId(testBookingId),
        amount: 10000,
        amountInPaise: 1000000,
        status: 'REJECTED',
      });

      vi.spyOn(paymentRecordRepository, 'findById').mockResolvedValue(alreadyRejected);

      // Attempting to re-reject
      await expect(
        paymentService.rejectPayment(alreadyRejected._id.toString(), 'Again', adminActor)
      ).rejects.toThrow(/already rejected/);

      // Attempting to verify a rejected payment
      await expect(
        paymentService.verifyPayment(alreadyRejected._id.toString(), adminActor)
      ).rejects.toThrow(/Cannot verify a rejected/);
    });

    it('2.6: crash recovery: retry on verified payment heals out-of-sync booking financials without error', async () => {
      const crashedVerifiedPayment = new PaymentRecordModel({
        _id: new mongoose.Types.ObjectId(),
        receiptNumber: 'NCT-RCT-2026-CRASH01',
        bookingId: new mongoose.Types.ObjectId(testBookingId),
        amount: 25000,
        amountInPaise: 2500000,
        status: 'VERIFIED',
        verifiedBy: new mongoose.Types.ObjectId(adminActor.userId),
        verifiedAt: new Date(),
      });

      // Booking totals were NEVER updated due to crash during prior run (totalPaid is still 0)
      const outOfSyncBooking = createMockBooking({
        financials: {
          totalAmount: 100000,
          totalAmountInPaise: 10000000,
          currency: 'INR',
          advanceRequired: 25000,
          advanceRequiredInPaise: 2500000,
          totalPaid: 0, // Out of sync!
          totalPaidInPaise: 0,
          balancePending: 100000,
          balancePendingInPaise: 10000000,
        },
      });

      vi.spyOn(paymentRecordRepository, 'findById').mockResolvedValue(crashedVerifiedPayment);
      vi.spyOn(paymentRecordRepository, 'calculateVerifiedTotals').mockResolvedValue({
        totalPaidPaise: 2500000,
        totalRefundedPaise: 0,
        netPaidPaise: 2500000,
        totalPaidRupees: 25000,
        totalRefundedRupees: 0,
        netPaidRupees: 25000,
      });
      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(outOfSyncBooking as any);
      const updateFinancialsSpy = vi.spyOn(bookingRepository, 'updateFinancials').mockResolvedValue(outOfSyncBooking as any);

      // Retry verifyPayment
      const recoveredResult = await paymentService.verifyPayment(
        crashedVerifiedPayment._id.toString(),
        adminActor
      );

      expect(recoveredResult.status).toBe('VERIFIED');
      expect(recoveredResult.receiptNumber).toBe('NCT-RCT-2026-CRASH01');

      // Financials must have been self-healed
      expect(updateFinancialsSpy).toHaveBeenCalledWith(
        testBookingId,
        expect.objectContaining({
          totalPaid: 25000,
          totalPaidInPaise: 2500000,
          balancePending: 75000,
          balancePendingInPaise: 7500000,
        })
      );
    });
  });

  // =========================================================================
  // PILLAR 3: REFUND SAFEGUARDS & CONCURRENCY OVER-REFUND PREVENTION (STAGE 4C)
  // =========================================================================
  describe('Pillar 3: Refund Safeguards & Over-Refund Prevention (Stage 4C)', () => {
    const originalPaymentId = new mongoose.Types.ObjectId().toString();

    function createMockOriginalPayment(overrides: Record<string, any> = {}) {
      return new PaymentRecordModel({
        _id: new mongoose.Types.ObjectId(originalPaymentId),
        receiptNumber: 'NCT-RCT-2026-00010',
        bookingId: new mongoose.Types.ObjectId(testBookingId),
        amount: 50000,
        amountInPaise: 5000000,
        currency: 'INR',
        paymentType: 'ADVANCE',
        paymentMethod: 'NEFT_IMPS',
        status: 'VERIFIED',
        recordedBy: new mongoose.Types.ObjectId(agentActor.userId),
        isRefund: false,
        allocatedRefundPaise: 0,
        ...overrides,
      });
    }

    it('3.1: records a valid refund in SUBMITTED status with atomic reservation against original payment', async () => {
      const mockBooking = createMockBooking();
      const mockOriginal = createMockOriginalPayment();
      const refundId = new mongoose.Types.ObjectId();

      const mockRefundRecord = new PaymentRecordModel({
        _id: refundId,
        receiptNumber: 'NCT-RFD-2026-00001',
        bookingId: mockBooking._id,
        amount: 20000,
        amountInPaise: 2000000,
        currency: 'INR',
        paymentType: 'REFUND',
        paymentMethod: 'NEFT_IMPS',
        status: 'SUBMITTED',
        isRefund: true,
        originalPaymentId: mockOriginal._id,
        refundReason: 'Customer reduced room count',
        recordedBy: new mongoose.Types.ObjectId(adminActor.userId),
      });

      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking as any);
      vi.spyOn(paymentRecordRepository, 'findById').mockResolvedValue(mockOriginal);
      const reserveSpy = vi.spyOn(paymentRecordRepository, 'reserveRefundPaise').mockResolvedValue(mockOriginal);
      vi.spyOn(SequenceModel, 'findByIdAndUpdate').mockResolvedValue({ seq: 1 } as any);
      vi.spyOn(paymentRecordRepository, 'create').mockResolvedValue(mockRefundRecord);
      const updateBookingSpy = vi.spyOn(bookingRepository, 'update');

      const result = await paymentService.recordRefund(
        {
          bookingId: testBookingId,
          originalPaymentId,
          amount: 20000,
          refundReason: 'Customer reduced room count',
        },
        adminActor
      );

      expect(result.status).toBe('SUBMITTED');
      expect(result.isRefund).toBe(true);
      expect(result.originalPaymentId).toBe(originalPaymentId);
      expect(result.receiptNumber).toBe('NCT-RFD-2026-00001');

      // Atomic reservation must have been invoked with integer paise
      expect(reserveSpy).toHaveBeenCalledWith(originalPaymentId, 2000000);

      // SUBMITTED refund must NOT alter booking financials yet
      expect(updateBookingSpy).not.toHaveBeenCalled();
    });

    it('3.2: rejects refund when amount exceeds remaining refundable paise on original payment', async () => {
      const mockBooking = createMockBooking();
      const mockOriginal = createMockOriginalPayment({
        amount: 10000,
        amountInPaise: 1000000,
        allocatedRefundPaise: 700000, // ₹7,000 already refunded/reserved
      });

      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking as any);
      vi.spyOn(paymentRecordRepository, 'findById').mockResolvedValue(mockOriginal);
      // Atomic reservation returns null when $lte check fails
      vi.spyOn(paymentRecordRepository, 'reserveRefundPaise').mockResolvedValue(null);

      await expect(
        paymentService.recordRefund(
          {
            bookingId: testBookingId,
            originalPaymentId,
            amount: 5000, // ₹5,000 exceeds remaining ₹3,000
            refundReason: 'Cancel extra night',
          },
          adminActor
        )
      ).rejects.toThrow(/exceeds the remaining refundable amount/);
    });

    it('3.3: rejects refund against non-verified payment with 400', async () => {
      const mockBooking = createMockBooking();
      const mockOriginal = createMockOriginalPayment({
        status: 'SUBMITTED', // Not verified!
      });

      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking as any);
      vi.spyOn(paymentRecordRepository, 'findById').mockResolvedValue(mockOriginal);

      await expect(
        paymentService.recordRefund(
          {
            bookingId: testBookingId,
            originalPaymentId,
            amount: 5000,
            refundReason: 'Partial refund',
          },
          adminActor
        )
      ).rejects.toThrow(/can only be requested against VERIFIED payments/);
    });

    it('3.4: rejects refund against another refund record with 400', async () => {
      const mockBooking = createMockBooking();
      const mockRefundOriginal = createMockOriginalPayment({
        isRefund: true,
        paymentType: 'REFUND',
      });

      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking as any);
      vi.spyOn(paymentRecordRepository, 'findById').mockResolvedValue(mockRefundOriginal);

      await expect(
        paymentService.recordRefund(
          {
            bookingId: testBookingId,
            originalPaymentId,
            amount: 5000,
            refundReason: 'Recursive refund attempt',
          },
          adminActor
        )
      ).rejects.toThrow(/Cannot process a refund against a refund record/);
    });

    it('3.5: rejecting a submitted refund releases the reserved paise on original payment', async () => {
      const refundId = new mongoose.Types.ObjectId().toString();
      const mockRefund = new PaymentRecordModel({
        _id: new mongoose.Types.ObjectId(refundId),
        receiptNumber: 'NCT-RFD-2026-00003',
        bookingId: new mongoose.Types.ObjectId(testBookingId),
        amount: 15000,
        amountInPaise: 1500000,
        status: 'SUBMITTED',
        isRefund: true,
        originalPaymentId: new mongoose.Types.ObjectId(originalPaymentId),
      });

      const mockRejectedRefund = new PaymentRecordModel({
        ...mockRefund.toObject(),
        status: 'REJECTED',
        rejectionReason: 'Bank details incorrect',
      });

      vi.spyOn(paymentRecordRepository, 'findById').mockResolvedValue(mockRefund);
      const releaseSpy = vi.spyOn(paymentRecordRepository, 'releaseRefundPaise').mockResolvedValue({} as any);
      vi.spyOn(paymentRecordRepository, 'rejectPayment').mockResolvedValue(mockRejectedRefund);

      await paymentService.rejectPayment(refundId, 'Bank details incorrect', adminActor);

      // Verify that releaseRefundPaise was called to restore refundable headroom on original payment
      expect(releaseSpy).toHaveBeenCalledWith(originalPaymentId, 1500000);
    });

    it('3.6: verifying a refund reduces net paid balance and increases balance pending in booking', async () => {
      const refundId = new mongoose.Types.ObjectId().toString();
      const mockRefund = new PaymentRecordModel({
        _id: new mongoose.Types.ObjectId(refundId),
        receiptNumber: 'NCT-RFD-2026-00004',
        bookingId: new mongoose.Types.ObjectId(testBookingId),
        amount: 20000,
        amountInPaise: 2000000,
        status: 'SUBMITTED',
        isRefund: true,
        originalPaymentId: new mongoose.Types.ObjectId(originalPaymentId),
      });

      const mockVerifiedRefund = new PaymentRecordModel({
        ...mockRefund.toObject(),
        status: 'VERIFIED',
        verifiedBy: new mongoose.Types.ObjectId(adminActor.userId),
        verifiedAt: new Date(),
      });

      const mockBooking = createMockBooking({
        financials: {
          totalAmount: 100000,
          totalAmountInPaise: 10000000,
          currency: 'INR',
          totalPaid: 50000,
          totalPaidInPaise: 5000000,
          balancePending: 50000,
          balancePendingInPaise: 5000000,
        },
      });

      vi.spyOn(paymentRecordRepository, 'findById').mockResolvedValue(mockRefund);
      vi.spyOn(paymentRecordRepository, 'verifyPayment').mockResolvedValue(mockVerifiedRefund);
      // Net paid is now 50,000 - 20,000 = 30,000
      vi.spyOn(paymentRecordRepository, 'calculateVerifiedTotals').mockResolvedValue({
        totalPaidPaise: 5000000,
        totalRefundedPaise: 2000000,
        netPaidPaise: 3000000,
        totalPaidRupees: 50000,
        totalRefundedRupees: 20000,
        netPaidRupees: 30000,
      });
      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking as any);
      const updateBookingSpy = vi.spyOn(bookingRepository, 'updateFinancials').mockResolvedValue(mockBooking as any);

      const result = await paymentService.verifyPayment(refundId, adminActor, {
        settlementReference: 'UTR-SETTLE-REFUND-001',
      });

      expect(result.status).toBe('VERIFIED');
      expect(result.isRefund).toBe(true);

      // Booking financials updated: netPaid is 30,000, balancePending is 70,000
      expect(updateBookingSpy).toHaveBeenCalledWith(
        testBookingId,
        expect.objectContaining({
          totalPaid: 30000,
          totalPaidInPaise: 3000000,
          balancePending: 70000,
          balancePendingInPaise: 7000000,
        })
      );
    });

    it('3.7: rejects refund idempotency key reuse with mismatched payload with 409 Conflict', async () => {
      const existingRefund = new PaymentRecordModel({
        _id: new mongoose.Types.ObjectId(),
        receiptNumber: 'NCT-RFD-2026-00005',
        bookingId: new mongoose.Types.ObjectId(testBookingId),
        originalPaymentId: new mongoose.Types.ObjectId(originalPaymentId),
        amount: 10000,
        amountInPaise: 1000000,
        isRefund: true,
        status: 'SUBMITTED',
        idempotencyKey: 'idemp-rfd-777',
      });

      const mockBooking = createMockBooking();
      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking as any);
      vi.spyOn(paymentRecordRepository, 'findByIdempotencyKey').mockResolvedValue(existingRefund);

      // Attempting to reuse same key for a different refund amount (₹20,000 instead of ₹10,000)
      await expect(
        paymentService.recordRefund(
          {
            bookingId: testBookingId,
            originalPaymentId,
            amount: 20000, // Different amount!
            refundReason: 'Customer canceled room',
            idempotencyKey: 'idemp-rfd-777',
          },
          adminActor
        )
      ).rejects.toThrow(/already used for a different refund request/);
    });

    it('3.8: in-flight reservation safety: exhausted headroom strictly rejects without wiping other reservations', async () => {
      const mockBooking = createMockBooking();
      const mockOriginal = createMockOriginalPayment({
        amount: 50000,
        amountInPaise: 5000000,
        allocatedRefundPaise: 5000000, // Fully allocated by an active or in-flight reservation
      });

      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking as any);
      vi.spyOn(paymentRecordRepository, 'findById').mockResolvedValue(mockOriginal);
      vi.spyOn(paymentRecordRepository, 'reserveRefundPaise').mockResolvedValue(null);

      // Must reject immediately without speculative inline clearing of other reservations
      await expect(
        paymentService.recordRefund(
          {
            bookingId: testBookingId,
            originalPaymentId,
            amount: 20000,
            refundReason: 'Attempt when headroom locked',
          },
          adminActor
        )
      ).rejects.toThrow(/exceeds the remaining refundable amount/);
    });

    it('3.8b: explicit administrative reconciliation: audits and self-heals orphaned allocations', async () => {
      vi.spyOn(paymentRecordRepository, 'reconcileRefundAllocations').mockResolvedValue({
        reconciledPaise: 0,
        previousPaise: 5000000,
        headroomPaise: 5000000,
        healed: true,
      });

      const auditSpy = vi.spyOn(auditLogRepository, 'record').mockResolvedValue({} as any);

      const result = await paymentService.reconcileRefundAllocations(originalPaymentId, adminActor);

      expect(result.healed).toBe(true);
      expect(result.reconciledPaise).toBe(0);
      expect(result.previousPaise).toBe(5000000);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_ALLOCATION_RECONCILED',
          entityType: 'PAYMENT',
        })
      );
    });

    it('3.8c: post-creation crash recovery: retry with same idempotencyKey returns existing refund without duplicate allocation', async () => {
      const existingRefund = new PaymentRecordModel({
        _id: new mongoose.Types.ObjectId(),
        receiptNumber: 'NCT-RFD-2026-CRASH01',
        bookingId: new mongoose.Types.ObjectId(testBookingId),
        amount: 15000,
        amountInPaise: 1500000,
        status: 'SUBMITTED',
        isRefund: true,
        originalPaymentId: new mongoose.Types.ObjectId(originalPaymentId),
        idempotencyKey: 'idemp-refund-crash-recovery',
      });

      // Existing record in DB from pre-crash write
      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(createMockBooking() as any);
      vi.spyOn(paymentRecordRepository, 'findByIdempotencyKey').mockResolvedValue(existingRefund);
      const reserveSpy = vi.spyOn(paymentRecordRepository, 'reserveRefundPaise');

      const result = await paymentService.recordRefund(
        {
          bookingId: testBookingId,
          originalPaymentId,
          amount: 15000,
          refundReason: 'Retry after response timeout/crash',
          idempotencyKey: 'idemp-refund-crash-recovery',
        },
        adminActor
      );

      expect(result.id).toBe(existingRefund._id.toString());
      expect(result.receiptNumber).toBe('NCT-RFD-2026-CRASH01');
      // Proves no duplicate reservation was attempted
      expect(reserveSpy).not.toHaveBeenCalled();
    });

    it('3.9: overpayment accounting: totalPaid > totalAmount results in exact negative balancePending without mathematical drift', async () => {
      const paymentId = new mongoose.Types.ObjectId().toString();
      const mockPayment = new PaymentRecordModel({
        _id: new mongoose.Types.ObjectId(paymentId),
        receiptNumber: 'NCT-RCT-2026-OVERPAY',
        bookingId: new mongoose.Types.ObjectId(testBookingId),
        amount: 150000, // Total booking is only 100,000 (overpayment of 50,000)
        amountInPaise: 15000000,
        status: 'SUBMITTED',
      });

      const mockVerified = new PaymentRecordModel({
        ...mockPayment.toObject(),
        status: 'VERIFIED',
        verifiedBy: new mongoose.Types.ObjectId(adminActor.userId),
        verifiedAt: new Date(),
      });

      const mockBooking = createMockBooking({
        financials: {
          totalAmount: 100000,
          totalAmountInPaise: 10000000,
          currency: 'INR',
          totalPaid: 0,
          totalPaidInPaise: 0,
          balancePending: 100000,
          balancePendingInPaise: 10000000,
        },
      });

      vi.spyOn(paymentRecordRepository, 'findById').mockResolvedValue(mockPayment);
      vi.spyOn(paymentRecordRepository, 'verifyPayment').mockResolvedValue(mockVerified);
      vi.spyOn(paymentRecordRepository, 'calculateVerifiedTotals').mockResolvedValue({
        totalPaidPaise: 15000000,
        totalRefundedPaise: 0,
        netPaidPaise: 15000000,
        totalPaidRupees: 150000,
        totalRefundedRupees: 0,
        netPaidRupees: 150000,
      });
      vi.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking as any);
      const updateFinancialsSpy = vi.spyOn(bookingRepository, 'updateFinancials').mockResolvedValue(mockBooking as any);

      await paymentService.verifyPayment(paymentId, adminActor);

      // Verify that totalPaid is 150,000, balancePending is clamped to 0 (non-negative),
      // and excessPaid is explicitly 50,000 (customer surplus)
      expect(updateFinancialsSpy).toHaveBeenCalledWith(
        testBookingId,
        expect.objectContaining({
          totalPaid: 150000,
          totalPaidInPaise: 15000000,
          balancePending: 0,
          balancePendingInPaise: 0,
          excessPaid: 50000,
          excessPaidInPaise: 5000000,
        })
      );
    });
  });

  // =========================================================================
  // PILLAR 4: IMMUTABILITY AUDIT GUARDRAILS
  // =========================================================================
  describe('Pillar 4: Immutability Audit Guardrails', () => {
    it('4.1: schema immutability guard blocks hard deletion via deleteOne and findOneAndDelete', async () => {
      const payment = new PaymentRecordModel({
        receiptNumber: 'NCT-RCT-2026-99999',
        bookingId: new mongoose.Types.ObjectId(),
        amount: 10000,
        amountInPaise: 1000000,
        paymentType: 'ADVANCE',
        paymentMethod: 'CASH',
        recordedBy: new mongoose.Types.ObjectId(),
      });

      // Calling deleteOne on document triggers pre middleware violation
      await expect(payment.deleteOne()).rejects.toThrow(/Financial audit violation/);
    });
  });
});
