import {
  PaymentRecordDto,
  RecordPaymentInput,
  RecordRefundInput,
  UserRole,
} from '@chirag/types';
import mongoose from 'mongoose';
import { ErrorCodes } from '../constants/errorCodes';
import { getNextSequenceValue } from '../models/sequence.model';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { bookingRepository } from '../repositories/booking.repository';
import { leadRepository } from '../repositories/lead.repository';
import { paymentRecordRepository } from '../repositories/paymentRecord.repository';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export interface PaymentActorContext {
  userId: string;
  role: UserRole;
  ipAddress?: string;
  userAgent?: string;
}

export class PaymentService {
  /**
   * Records a manual payment in SUBMITTED status.
   * Does NOT reduce the booking balance pending or auto-confirm the booking.
   * Safe against retries via optional idempotencyKey.
   */
  async recordPayment(
    input: RecordPaymentInput,
    actor: PaymentActorContext
  ): Promise<PaymentRecordDto> {
    if (!input.amount || input.amount <= 0 || !Number.isFinite(input.amount)) {
      throw AppError.badRequest('Payment amount must be greater than 0 and finite', ErrorCodes.VALIDATION_ERROR);
    }

    const amountInPaise = Math.round(input.amount * 100);
    if (!Number.isSafeInteger(amountInPaise)) {
      throw AppError.badRequest('Payment amount in paise exceeds safe integer range', ErrorCodes.VALIDATION_ERROR);
    }
    if (amountInPaise < 100) {
      throw AppError.badRequest('Payment amount must be at least ₹1.00', ErrorCodes.VALIDATION_ERROR);
    }

    // Verify booking existence
    const booking = await bookingRepository.findById(input.bookingId);
    if (!booking) {
      throw AppError.notFound(`Booking with ID '${input.bookingId}' does not exist`);
    }

    // Role check: Admin can record for any booking; Agent can record only for assigned booking
    if (actor.role === 'AGENT') {
      const assignedAgentId = (booking.assignedAgentId as any)?._id?.toString() || booking.assignedAgentId?.toString();
      if (assignedAgentId !== actor.userId) {
        throw AppError.forbidden('You are not authorized to record payments for this booking');
      }
    } else if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only authorized agents and administrators can record payments');
    }

    // Idempotency check: if a record exists with the same key, return it safely if payloads match
    if (input.idempotencyKey) {
      const existing = await paymentRecordRepository.findByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        const existingBookingId =
          (existing.bookingId as any)?._id?.toString() || existing.bookingId?.toString();
        const isMismatched =
          existingBookingId !== input.bookingId ||
          existing.amountInPaise !== amountInPaise ||
          existing.paymentType !== input.paymentType ||
          existing.paymentMethod !== input.paymentMethod ||
          existing.isRefund === true;

        if (isMismatched) {
          throw AppError.conflict(
            `Idempotency key '${input.idempotencyKey}' was already used for a different payment request. Reusing idempotency keys across different payloads is not permitted.`,
            ErrorCodes.CONFLICT
          );
        }

        return existing.toDto();
      }
    }

    // Generate unique sequential receipt number
    const year = new Date().getFullYear();
    const seq = await getNextSequenceValue(`receipt_${year}`);
    const receiptNumber = `NCT-RCT-${year}-${seq.toString().padStart(5, '0')}`;

    const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();

    let createdRecord;
    try {
      createdRecord = await paymentRecordRepository.create({
        receiptNumber,
        bookingId: booking._id as mongoose.Types.ObjectId,
        amount: input.amount,
        amountInPaise,
        currency: 'INR',
        paymentType: input.paymentType,
        paymentMethod: input.paymentMethod,
        status: 'SUBMITTED',
        transactionReference: input.transactionReference,
        paymentDate,
        proofDocumentUrl: input.proofDocumentUrl,
        notes: input.notes,
        recordedBy: new mongoose.Types.ObjectId(actor.userId),
        isRefund: false,
        idempotencyKey: input.idempotencyKey,
        allocatedRefundPaise: 0,
      });
    } catch (error: any) {
      // If concurrent request won idempotency insertion race
      if (error?.code === 11000 && input.idempotencyKey) {
        const existing = await paymentRecordRepository.findByIdempotencyKey(input.idempotencyKey);
        if (existing) {
          const existingBookingId =
            (existing.bookingId as any)?._id?.toString() || existing.bookingId?.toString();
          const isMismatched =
            existingBookingId !== input.bookingId ||
            existing.amountInPaise !== amountInPaise ||
            existing.paymentType !== input.paymentType ||
            existing.paymentMethod !== input.paymentMethod ||
            existing.isRefund === true;

          if (isMismatched) {
            throw AppError.conflict(
              `Idempotency key '${input.idempotencyKey}' was already used for a different payment request.`,
              ErrorCodes.CONFLICT
            );
          }
          return existing.toDto();
        }
      }
      throw error;
    }

    // Audit log
    await auditLogRepository.record({
      actorType: 'USER',
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'PAYMENT_SUBMITTED',
      entityType: 'PAYMENT',
      entityId: createdRecord._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: {
        receiptNumber,
        bookingId: booking._id.toString(),
        amountInPaise,
        paymentType: input.paymentType,
        paymentMethod: input.paymentMethod,
        status: 'SUBMITTED',
      },
    });

    logger.info(`Payment recorded [${receiptNumber}]: ₹${input.amount} for booking ${booking.bookingNumber} in SUBMITTED status`);

    return createdRecord.toDto();
  }

  /**
   * Verifies a SUBMITTED payment or refund.
   * Only ADMIN role is authorized to verify.
   * Recalculates verified ledger totals using integer paise and updates booking financials.
   */
  async verifyPayment(
    paymentId: string,
    actor: PaymentActorContext,
    options?: { settlementReference?: string; notes?: string }
  ): Promise<PaymentRecordDto> {
    if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can verify payments');
    }

    const payment = await paymentRecordRepository.findById(paymentId);
    if (!payment) {
      throw AppError.notFound(`Payment record with ID '${paymentId}' does not exist`);
    }

    if (payment.status === 'VERIFIED') {
      // Self-healing recovery check: If a previous verification crashed after updating payment status
      // but before updating booking financials, reconcile the booking financials and recover.
      const bookingRawId = (payment.bookingId as any)?._id?.toString() || payment.bookingId?.toString();
      const totals = await paymentRecordRepository.calculateVerifiedTotals(bookingRawId);
      const booking = await bookingRepository.findById(bookingRawId);

      if (booking) {
        const expectedBalanceInPaise = Math.max(0, booking.financials.totalAmountInPaise - totals.netPaidPaise);
        const excessPaidInPaise = Math.max(0, totals.netPaidPaise - booking.financials.totalAmountInPaise);
        if (
          booking.financials.totalPaidInPaise !== totals.netPaidPaise ||
          booking.financials.balancePendingInPaise !== expectedBalanceInPaise ||
          (booking.financials.excessPaidInPaise ?? 0) !== excessPaidInPaise
        ) {
          await bookingRepository.updateFinancials(booking._id.toString(), {
            totalPaid: totals.netPaidPaise / 100,
            totalPaidInPaise: totals.netPaidPaise,
            balancePending: expectedBalanceInPaise / 100,
            balancePendingInPaise: expectedBalanceInPaise,
            excessPaid: excessPaidInPaise / 100,
            excessPaidInPaise: excessPaidInPaise,
          });

          logger.warn(
            `Recovered booking financials for booking ${booking.bookingNumber} on retry of verified payment ${payment.receiptNumber}`
          );
          return payment.toDto();
        }
      }

      // If already verified and consistent, reject repeated transition with 400 Bad Request
      throw AppError.badRequest('Payment record is already verified');
    }

    if (payment.status === 'REJECTED') {
      throw AppError.badRequest('Cannot verify a rejected payment record');
    }

    if (payment.status !== 'SUBMITTED') {
      throw AppError.badRequest(`Cannot verify payment with status '${payment.status}'`);
    }

    // Require settlementReference for manual refund payouts
    if (payment.isRefund) {
      const trimmedRef = options?.settlementReference?.trim();
      if (!trimmedRef) {
        throw AppError.badRequest(
          'Settlement reference (e.g. bank payout UTR or transaction ID) is required to settle a refund payout',
          ErrorCodes.VALIDATION_ERROR
        );
      }
    }

    const verified = await paymentRecordRepository.verifyPayment({
      paymentId,
      verifiedBy: actor.userId,
      settlementReference: options?.settlementReference?.trim(),
      notes: options?.notes?.trim(),
      isRefund: payment.isRefund,
    });

    if (!verified) {
      throw AppError.conflict('Payment record state changed concurrently');
    }

    const bookingRawId = (verified.bookingId as any)?._id?.toString() || verified.bookingId?.toString();
    const totals = await paymentRecordRepository.calculateVerifiedTotals(bookingRawId);

    // Update booking financials using strictly verified ledger paise totals
    const booking = await bookingRepository.findById(bookingRawId);
    if (booking) {
      // In financial accounting, balancePending is non-negative representing the amount still owed.
      // If verified paid totals exceed booking total, excess is explicitly tracked as excessPaid.
      const balancePendingInPaise = Math.max(0, booking.financials.totalAmountInPaise - totals.netPaidPaise);
      const excessPaidInPaise = Math.max(0, totals.netPaidPaise - booking.financials.totalAmountInPaise);

      if (!Number.isSafeInteger(balancePendingInPaise) || !Number.isSafeInteger(excessPaidInPaise)) {
        throw new Error('Ledger balance calculation overflow: paise value exceeds safe integer range');
      }

      await bookingRepository.updateFinancials(booking._id.toString(), {
        totalPaid: totals.netPaidPaise / 100,
        totalPaidInPaise: totals.netPaidPaise,
        balancePending: balancePendingInPaise / 100,
        balancePendingInPaise,
        excessPaid: excessPaidInPaise / 100,
        excessPaidInPaise,
      });

      // Add timeline event to CRM lead if present (idempotent: avoid duplicate if event for receipt already exists)
      const leadId = (booking.leadId as any)?._id?.toString() || booking.leadId?.toString();
      if (leadId) {
        const lead = await leadRepository.findById(leadId);
        const alreadyHasEvent = lead?.timeline?.some(
          (t: any) => t.type === 'PAYMENT_VERIFIED' && t.title?.includes(verified.receiptNumber)
        );

        if (!alreadyHasEvent) {
          await leadRepository.addTimelineEvent(leadId, {
            type: 'PAYMENT_VERIFIED',
            title: verified.isRefund ? `Refund Settled: ₹${verified.amount} (${verified.receiptNumber})` : `Payment Verified: ₹${verified.amount} (${verified.receiptNumber})`,
            content: `Receipt #${verified.receiptNumber} verified by administrator. Net paid: ₹${totals.netPaidPaise / 100}, Balance: ₹${balancePendingInPaise / 100}${excessPaidInPaise > 0 ? `, Excess: ₹${excessPaidInPaise / 100}` : ''}`,
            actorId: actor.userId,
          });
        }
      }
    }

    // Audit log (idempotent: avoid duplicate audit if already recorded)
    const existingAudit = await auditLogRepository.findPaymentActionLog(
      verified._id.toString(),
      'PAYMENT_VERIFIED'
    );
    if (!existingAudit) {
      await auditLogRepository.record({
        actorType: 'USER',
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'PAYMENT_VERIFIED',
        entityType: 'PAYMENT',
        entityId: verified._id.toString(),
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        previousState: { status: 'SUBMITTED' },
        newState: {
          status: 'VERIFIED',
          verifiedBy: actor.userId,
          netPaidPaise: totals.netPaidPaise,
          isRefund: verified.isRefund,
          settlementReference: verified.settlementReference,
          settledAt: verified.settledAt,
        },
      });
    }

    logger.info(`Payment [${verified.receiptNumber}] verified by admin ${actor.userId}. Net paid: ₹${totals.netPaidPaise / 100}`);

    return verified.toDto();
  }

  /**
   * Rejects a SUBMITTED payment or refund.
   * Only ADMIN role is authorized to reject.
   * Preserves rejection reason, releases any reserved refund paise, and does not alter balances.
   */
  async rejectPayment(
    paymentId: string,
    rejectionReason: string,
    actor: PaymentActorContext
  ): Promise<PaymentRecordDto> {
    if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can reject payments');
    }

    if (!rejectionReason || !rejectionReason.trim()) {
      throw AppError.badRequest('Rejection reason is required', ErrorCodes.VALIDATION_ERROR);
    }

    const payment = await paymentRecordRepository.findById(paymentId);
    if (!payment) {
      throw AppError.notFound(`Payment record with ID '${paymentId}' does not exist`);
    }

    if (payment.status === 'REJECTED') {
      throw AppError.badRequest('Payment record is already rejected');
    }

    if (payment.status === 'VERIFIED') {
      throw AppError.badRequest('Cannot reject an already verified payment record');
    }

    if (payment.status !== 'SUBMITTED') {
      throw AppError.badRequest(`Cannot reject payment with status '${payment.status}'`);
    }

    // Atomically transition status from SUBMITTED to REJECTED first.
    // This guarantees that only one concurrent caller succeeds and releases headroom exactly once.
    const rejected = await paymentRecordRepository.rejectPayment({
      paymentId,
      verifiedBy: actor.userId,
      rejectionReason: rejectionReason.trim(),
    });

    if (!rejected) {
      throw AppError.conflict('Payment record state changed concurrently');
    }

    // If rejecting a refund, release the reserved amount on the original payment document exactly once.
    if (rejected.isRefund && rejected.originalPaymentId) {
      const origId = (rejected.originalPaymentId as any)?._id?.toString() || rejected.originalPaymentId?.toString();
      await paymentRecordRepository.releaseRefundPaise(origId, rejected.amountInPaise);
    }

    // Audit log
    await auditLogRepository.record({
      actorType: 'USER',
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'PAYMENT_REJECTED',
      entityType: 'PAYMENT',
      entityId: rejected._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: { status: 'SUBMITTED' },
      newState: {
        status: 'REJECTED',
        verifiedBy: actor.userId,
        rejectionReason: rejectionReason.trim(),
      },
    });

    logger.info(`Payment [${rejected.receiptNumber}] rejected by admin ${actor.userId}: "${rejectionReason.trim()}"`);

    return rejected.toDto();
  }

  /**
   * Records a refund against an original verified payment.
   * Safeguards:
   * - Must reference a VERIFIED payment belonging to the specified booking.
   * - Cannot refund a refund.
   * - Standalone MongoDB safe atomic reservation via $expr $lte on original payment.
   * - Begins in SUBMITTED status: only verified refunds reduce the verified ledger totals.
   */
  async recordRefund(
    input: RecordRefundInput,
    actor: PaymentActorContext
  ): Promise<PaymentRecordDto> {
    if (!input.amount || input.amount <= 0 || !Number.isFinite(input.amount)) {
      throw AppError.badRequest('Refund amount must be greater than 0 and finite', ErrorCodes.VALIDATION_ERROR);
    }

    if (!input.refundReason || !input.refundReason.trim()) {
      throw AppError.badRequest('Refund reason is required', ErrorCodes.VALIDATION_ERROR);
    }

    const refundAmountInPaise = Math.round(input.amount * 100);
    if (!Number.isSafeInteger(refundAmountInPaise)) {
      throw AppError.badRequest('Refund amount in paise exceeds safe integer range', ErrorCodes.VALIDATION_ERROR);
    }
    if (refundAmountInPaise < 100) {
      throw AppError.badRequest('Refund amount must be at least ₹1.00', ErrorCodes.VALIDATION_ERROR);
    }

    // Verify booking existence
    const booking = await bookingRepository.findById(input.bookingId);
    if (!booking) {
      throw AppError.notFound(`Booking with ID '${input.bookingId}' does not exist`);
    }

    // Authorization
    if (actor.role === 'AGENT') {
      const assignedAgentId = (booking.assignedAgentId as any)?._id?.toString() || booking.assignedAgentId?.toString();
      if (assignedAgentId !== actor.userId) {
        throw AppError.forbidden('You are not authorized to request refunds for this booking');
      }
    } else if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only authorized agents and administrators can record refunds');
    }

    // Idempotency check: if refund already recorded with this key, return it safely if payloads match
    if (input.idempotencyKey) {
      const existing = await paymentRecordRepository.findByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        const existingBookingId =
          (existing.bookingId as any)?._id?.toString() || existing.bookingId?.toString();
        const existingOriginalId =
          (existing.originalPaymentId as any)?._id?.toString() || existing.originalPaymentId?.toString();
        const isMismatched =
          existingBookingId !== input.bookingId ||
          existingOriginalId !== input.originalPaymentId ||
          existing.amountInPaise !== refundAmountInPaise ||
          existing.isRefund !== true;

        if (isMismatched) {
          throw AppError.conflict(
            `Idempotency key '${input.idempotencyKey}' was already used for a different refund request. Reusing idempotency keys across different payloads is prohibited.`,
            ErrorCodes.CONFLICT
          );
        }

        return existing.toDto();
      }
    }

    // Validate original payment
    const originalPayment = await paymentRecordRepository.findById(input.originalPaymentId);
    if (!originalPayment) {
      throw AppError.notFound(`Original payment record with ID '${input.originalPaymentId}' does not exist`);
    }

    const originalBookingId = (originalPayment.bookingId as any)?._id?.toString() || originalPayment.bookingId?.toString();
    if (originalBookingId !== input.bookingId) {
      throw AppError.badRequest('Original payment does not belong to the specified booking');
    }

    if (originalPayment.status !== 'VERIFIED') {
      throw AppError.badRequest('Refunds can only be requested against VERIFIED payments');
    }

    if (originalPayment.isRefund || originalPayment.paymentType === 'REFUND') {
      throw AppError.badRequest('Cannot process a refund against a refund record');
    }

    // Atomic reservation of refund paise on the original payment document
    // Standalone MongoDB-safe: uses findOneAndUpdate with $expr conditional check
    // In-flight reservations are guaranteed inviolable: operational requests never clear reservations.
    const reserved = await paymentRecordRepository.reserveRefundPaise(
      input.originalPaymentId,
      refundAmountInPaise
    );

    if (!reserved) {
      const remainingPaise = Math.max(
        0,
        originalPayment.amountInPaise - (originalPayment.allocatedRefundPaise || 0)
      );
      throw AppError.badRequest(
        `Refund amount (₹${input.amount}) exceeds the remaining refundable amount (₹${(remainingPaise / 100).toFixed(2)}) for payment ${originalPayment.receiptNumber}`,
        ErrorCodes.VALIDATION_ERROR
      );
    }


    // Generate unique refund receipt number
    const year = new Date().getFullYear();
    const seq = await getNextSequenceValue(`refund_${year}`);
    const receiptNumber = `NCT-RFD-${year}-${seq.toString().padStart(5, '0')}`;

    let refundRecord;
    try {
      refundRecord = await paymentRecordRepository.create({
        receiptNumber,
        bookingId: booking._id as mongoose.Types.ObjectId,
        amount: input.amount,
        amountInPaise: refundAmountInPaise,
        currency: 'INR',
        paymentType: 'REFUND',
        paymentMethod: input.paymentMethod || originalPayment.paymentMethod,
        status: 'SUBMITTED',
        transactionReference: input.transactionReference,
        paymentDate: new Date(),
        notes: input.notes,
        recordedBy: new mongoose.Types.ObjectId(actor.userId),
        isRefund: true,
        originalPaymentId: originalPayment._id as mongoose.Types.ObjectId,
        refundReason: input.refundReason.trim(),
        idempotencyKey: input.idempotencyKey,
        allocatedRefundPaise: 0,
      });
    } catch (error: any) {
      // Release reserved paise if record creation fails (e.g. duplicate key race)
      await paymentRecordRepository.releaseRefundPaise(input.originalPaymentId, refundAmountInPaise);
      if (error?.code === 11000 && input.idempotencyKey) {
        const existing = await paymentRecordRepository.findByIdempotencyKey(input.idempotencyKey);
        if (existing) {
          const existingBookingId =
            (existing.bookingId as any)?._id?.toString() || existing.bookingId?.toString();
          const existingOriginalId =
            (existing.originalPaymentId as any)?._id?.toString() || existing.originalPaymentId?.toString();
          const isMismatched =
            existingBookingId !== input.bookingId ||
            existingOriginalId !== input.originalPaymentId ||
            existing.amountInPaise !== refundAmountInPaise ||
            existing.isRefund !== true;

          if (isMismatched) {
            throw AppError.conflict(
              `Idempotency key '${input.idempotencyKey}' was already used for a different refund request.`,
              ErrorCodes.CONFLICT
            );
          }

          return existing.toDto();
        }
      }
      throw error;
    }

    // Audit log
    await auditLogRepository.record({
      actorType: 'USER',
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'PAYMENT_SUBMITTED',
      entityType: 'PAYMENT',
      entityId: refundRecord._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: {
        receiptNumber,
        bookingId: booking._id.toString(),
        originalPaymentId: originalPayment._id.toString(),
        amountInPaise: refundAmountInPaise,
        isRefund: true,
        status: 'SUBMITTED',
        refundReason: input.refundReason.trim(),
      },
    });

    logger.info(`Refund requested [${receiptNumber}]: ₹${input.amount} against ${originalPayment.receiptNumber} in SUBMITTED status`);

    return refundRecord.toDto();
  }

  /**
   * Retrieves all payment records and verified ledger summary for a booking.
   */
  async getPaymentsForBooking(
    bookingId: string,
    actor: PaymentActorContext
  ): Promise<{
    payments: PaymentRecordDto[];
    summary: {
      totalPaid: number;
      totalRefunded: number;
      netPaid: number;
      balancePending: number;
      balancePendingInPaise?: number;
      excessPaid?: number;
      excessPaidInPaise?: number;
    };
  }> {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw AppError.notFound(`Booking with ID '${bookingId}' does not exist`);
    }

    if (actor.role === 'AGENT') {
      const assignedAgentId = (booking.assignedAgentId as any)?._id?.toString() || booking.assignedAgentId?.toString();
      if (assignedAgentId !== actor.userId) {
        throw AppError.forbidden('You are not authorized to view payments for this booking');
      }
    } else if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Insufficient permissions to view booking payments');
    }

    const records = await paymentRecordRepository.findByBookingId(bookingId);
    const totals = await paymentRecordRepository.calculateVerifiedTotals(bookingId);
    const balancePendingPaise = Math.max(0, booking.financials.totalAmountInPaise - totals.netPaidPaise);
    const excessPaidPaise = Math.max(0, totals.netPaidPaise - booking.financials.totalAmountInPaise);

    return {
      payments: records.map((r) => r.toDto()),
      summary: {
        totalPaid: totals.totalPaidRupees,
        totalRefunded: totals.totalRefundedRupees,
        netPaid: totals.netPaidRupees,
        balancePending: balancePendingPaise / 100,
        balancePendingInPaise: balancePendingPaise,
        excessPaid: excessPaidPaise / 100,
        excessPaidInPaise: excessPaidPaise,
      },
    };
  }

  /**
   * Retrieves a single payment record by ID with authorization check.
   */
  async getPaymentById(
    paymentId: string,
    actor: PaymentActorContext
  ): Promise<PaymentRecordDto> {
    const payment = await paymentRecordRepository.findById(paymentId);
    if (!payment) {
      throw AppError.notFound(`Payment record with ID '${paymentId}' does not exist`);
    }

    if (actor.role === 'AGENT') {
      const bookingRawId = (payment.bookingId as any)?._id?.toString() || payment.bookingId?.toString();
      const booking = await bookingRepository.findById(bookingRawId);
      if (booking) {
        const assignedAgentId = (booking.assignedAgentId as any)?._id?.toString() || booking.assignedAgentId?.toString();
        if (assignedAgentId !== actor.userId) {
          throw AppError.forbidden('You are not authorized to view this payment record');
        }
      }
    } else if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Insufficient permissions to view payment records');
    }

    return payment.toDto();
  }

  /**
   * Admin-only recovery: Reconciles allocated refund paise against actual active refund documents.
   * Cleans up orphaned reservations left behind by crashed processes.
   */
  async reconcileRefundAllocations(
    originalPaymentId: string,
    actor: PaymentActorContext
  ) {
    if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can reconcile refund allocations');
    }

    const result = await paymentRecordRepository.reconcileRefundAllocations(originalPaymentId, {
      force: true,
    });

    if (result.healed) {
      await auditLogRepository.record({
        actorType: 'USER',
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'PAYMENT_ALLOCATION_RECONCILED' as any,
        entityType: 'PAYMENT' as any,
        entityId: originalPaymentId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        previousState: { allocatedRefundPaise: result.previousPaise },
        newState: {
          allocatedRefundPaise: result.reconciledPaise,
          headroomPaise: result.headroomPaise,
        },
        notes: 'Administrative recovery of orphaned refund allocation',
      });
      logger.warn(
        `Admin ${actor.userId} reconciled refund allocations for payment ${originalPaymentId}: ${result.previousPaise} -> ${result.reconciledPaise} paise`
      );
    }

    return result;
  }
}

export const paymentService = new PaymentService();
