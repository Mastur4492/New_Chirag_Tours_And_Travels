import { PaymentMethod, PaymentStatus, PaymentType } from '@chirag/types';
import mongoose from 'mongoose';
import { IPaymentRecordDocument, PaymentRecordModel } from '../models/paymentRecord.model';

export interface FindPaymentRecordsFilter {
  bookingId?: string;
  status?: PaymentStatus;
  paymentType?: PaymentType;
  paymentMethod?: PaymentMethod;
  isRefund?: boolean;
  startDate?: Date;
  endDate?: Date;
  skip?: number;
  limit?: number;
}

export class PaymentRecordRepository {
  async findById(id: string): Promise<IPaymentRecordDocument | null> {
    return PaymentRecordModel.findById(id)
      .populate('bookingId')
      .populate('recordedBy', 'fullName email')
      .populate('verifiedBy', 'fullName email')
      .populate('originalPaymentId')
      .exec();
  }

  async findByReceiptNumber(receiptNumber: string): Promise<IPaymentRecordDocument | null> {
    return PaymentRecordModel.findOne({ receiptNumber })
      .populate('bookingId')
      .populate('recordedBy', 'fullName email')
      .populate('verifiedBy', 'fullName email')
      .exec();
  }

  async findByBookingId(bookingId: string): Promise<IPaymentRecordDocument[]> {
    return PaymentRecordModel.find({ bookingId })
      .populate('recordedBy', 'fullName email')
      .populate('verifiedBy', 'fullName email')
      .populate('originalPaymentId')
      .sort({ createdAt: 1 })
      .exec();
  }

  async findVerifiedByBookingId(bookingId: string): Promise<IPaymentRecordDocument[]> {
    return PaymentRecordModel.find({ bookingId, status: 'VERIFIED' })
      .populate('recordedBy', 'fullName email')
      .populate('verifiedBy', 'fullName email')
      .sort({ createdAt: 1 })
      .exec();
  }

  async findMany(filter: FindPaymentRecordsFilter = {}): Promise<{
    paymentRecords: IPaymentRecordDocument[];
    total: number;
  }> {
    const query: Record<string, unknown> = {};

    if (filter.bookingId) {
      query.bookingId = filter.bookingId;
    }

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.paymentType) {
      query.paymentType = filter.paymentType;
    }

    if (filter.paymentMethod) {
      query.paymentMethod = filter.paymentMethod;
    }

    if (typeof filter.isRefund === 'boolean') {
      query.isRefund = filter.isRefund;
    }

    if (filter.startDate || filter.endDate) {
      query.paymentDate = {};
      if (filter.startDate) {
        (query.paymentDate as Record<string, unknown>).$gte = filter.startDate;
      }
      if (filter.endDate) {
        (query.paymentDate as Record<string, unknown>).$lte = filter.endDate;
      }
    }

    const skip = filter.skip || 0;
    const limit = filter.limit || 50;

    const [paymentRecords, total] = await Promise.all([
      PaymentRecordModel.find(query)
        .populate('recordedBy', 'fullName email')
        .populate('verifiedBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      PaymentRecordModel.countDocuments(query).exec(),
    ]);

    return { paymentRecords, total };
  }

  async create(data: Partial<IPaymentRecordDocument>): Promise<IPaymentRecordDocument> {
    const record = new PaymentRecordModel(data);
    await record.save();
    return this.findById(record._id.toString()) as Promise<IPaymentRecordDocument>;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<IPaymentRecordDocument | null> {
    return PaymentRecordModel.findOne({ idempotencyKey })
      .populate('bookingId')
      .populate('recordedBy', 'fullName email')
      .populate('verifiedBy', 'fullName email')
      .populate('originalPaymentId')
      .exec();
  }

  async verifyPayment(params: {
    paymentId: string;
    verifiedBy: string;
    settlementReference?: string;
    notes?: string;
    isRefund?: boolean;
  }): Promise<IPaymentRecordDocument | null> {
    const now = new Date();
    const updateDoc: any = {
      status: 'VERIFIED',
      verifiedBy: new mongoose.Types.ObjectId(params.verifiedBy),
      verifiedAt: now,
      rejectionReason: undefined,
    };

    if (params.settlementReference) {
      updateDoc.settlementReference = params.settlementReference.trim();
    }
    if (params.notes) {
      updateDoc.notes = params.notes.trim();
    }
    if (params.isRefund) {
      updateDoc.settledAt = now;
      updateDoc.settledBy = new mongoose.Types.ObjectId(params.verifiedBy);
    }

    const updated = await PaymentRecordModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(params.paymentId),
        status: 'SUBMITTED',
      },
      {
        $set: updateDoc,
      },
      { new: true, runValidators: true }
    ).exec();

    if (!updated) return null;

    if (updated.isRefund && !updated.settledAt) {
      await PaymentRecordModel.updateOne(
        { _id: updated._id, settledAt: { $exists: false } },
        {
          $set: {
            settledAt: now,
            settledBy: new mongoose.Types.ObjectId(params.verifiedBy),
          },
        }
      ).exec();
    }

    return this.findById(params.paymentId);
  }

  async rejectPayment(params: {
    paymentId: string;
    verifiedBy: string;
    rejectionReason: string;
  }): Promise<IPaymentRecordDocument | null> {
    const updated = await PaymentRecordModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(params.paymentId),
        status: 'SUBMITTED',
      },
      {
        $set: {
          status: 'REJECTED',
          verifiedBy: new mongoose.Types.ObjectId(params.verifiedBy),
          verifiedAt: new Date(),
          rejectionReason: params.rejectionReason.trim(),
        },
      },
      { new: true, runValidators: true }
    ).exec();

    if (!updated) return null;
    return this.findById(params.paymentId);
  }

  /**
   * Standalone MongoDB-safe atomic reservation of refund amount on the original payment.
   * Atomically checks that:
   * 1. Original payment exists, is VERIFIED, and is not itself a refund.
   * 2. (allocatedRefundPaise + refundAmountPaise) <= amountInPaise
   * If condition passes, increments allocatedRefundPaise by refundAmountPaise atomically.
   */
  async reserveRefundPaise(
    originalPaymentId: string,
    refundPaise: number
  ): Promise<IPaymentRecordDocument | null> {
    const objectId = mongoose.Types.ObjectId.isValid(originalPaymentId)
      ? new mongoose.Types.ObjectId(originalPaymentId)
      : null;
    if (!objectId) return null;

    return PaymentRecordModel.findOneAndUpdate(
      {
        _id: objectId,
        status: 'VERIFIED',
        isRefund: false,
        $expr: {
          $lte: [
            { $add: [{ $ifNull: ['$allocatedRefundPaise', 0] }, refundPaise] },
            '$amountInPaise',
          ],
        },
      },
      { $inc: { allocatedRefundPaise: refundPaise } },
      { new: true }
    ).exec();
  }

  /**
   * Releases previously reserved refund paise on the original payment
   * (e.g. if the refund request is rejected).
   */
  async releaseRefundPaise(
    originalPaymentId: string,
    refundPaise: number
  ): Promise<IPaymentRecordDocument | null> {
    const objectId = mongoose.Types.ObjectId.isValid(originalPaymentId)
      ? new mongoose.Types.ObjectId(originalPaymentId)
      : null;
    if (!objectId) return null;

    return PaymentRecordModel.findOneAndUpdate(
      {
        _id: objectId,
      },
      { $inc: { allocatedRefundPaise: -refundPaise } },
      { new: true }
    ).exec();
  }

  /**
   * Reconciles allocatedRefundPaise on original payment with the true sum of all active
   * (SUBMITTED or VERIFIED) refunds linked to it. Self-heals orphaned reservations.
   * Protects concurrent in-flight requests by requiring staleThresholdMs unless force is set.
   */
  async reconcileRefundAllocations(
    originalPaymentId: string,
    options?: { staleThresholdMs?: number; force?: boolean }
  ): Promise<{
    reconciledPaise: number;
    previousPaise: number;
    headroomPaise: number;
    healed: boolean;
  }> {
    const objectId = mongoose.Types.ObjectId.isValid(originalPaymentId)
      ? new mongoose.Types.ObjectId(originalPaymentId)
      : null;
    if (!objectId) throw new Error('Invalid original payment ID');

    const [origPayment, activeRefunds] = await Promise.all([
      PaymentRecordModel.findById(objectId).exec(),
      PaymentRecordModel.find({
        originalPaymentId: objectId,
        status: { $in: ['SUBMITTED', 'VERIFIED'] },
      }).exec(),
    ]);

    if (!origPayment) throw new Error('Original payment not found');

    const previousPaise = origPayment.allocatedRefundPaise || 0;
    const reconciledPaise = activeRefunds.reduce((sum, r) => sum + r.amountInPaise, 0);

    // Guard against overwriting concurrent in-flight reservations:
    // If the payment was updated within staleThresholdMs, do not auto-heal unless force is true
    if (
      options?.staleThresholdMs &&
      !options.force &&
      origPayment.updatedAt &&
      Date.now() - origPayment.updatedAt.getTime() < options.staleThresholdMs
    ) {
      const headroomPaise = Math.max(0, origPayment.amountInPaise - previousPaise);
      return { reconciledPaise: previousPaise, previousPaise, headroomPaise, healed: false };
    }

    if (previousPaise !== reconciledPaise) {
      await PaymentRecordModel.findByIdAndUpdate(objectId, {
        $set: { allocatedRefundPaise: reconciledPaise },
      }).exec();
    }

    const headroomPaise = Math.max(0, origPayment.amountInPaise - reconciledPaise);
    return {
      reconciledPaise,
      previousPaise,
      headroomPaise,
      healed: previousPaise !== reconciledPaise,
    };
  }

  /**
   * Aggregates verified payments and verified refunds for a booking
   * without mutating the booking balance.
   */
  async calculateVerifiedTotals(bookingId: string): Promise<{
    totalPaidPaise: number;
    totalRefundedPaise: number;
    netPaidPaise: number;
    totalPaidRupees: number;
    totalRefundedRupees: number;
    netPaidRupees: number;
  }> {
    const verified = await PaymentRecordModel.find({
      bookingId: new mongoose.Types.ObjectId(bookingId),
      status: 'VERIFIED',
    }).exec();

    let totalPaidPaise = 0;
    let totalRefundedPaise = 0;

    for (const record of verified) {
      if (record.isRefund || record.paymentType === 'REFUND') {
        totalRefundedPaise += record.amountInPaise;
      } else {
        totalPaidPaise += record.amountInPaise;
      }
    }

    if (!Number.isSafeInteger(totalPaidPaise) || !Number.isSafeInteger(totalRefundedPaise)) {
      throw new Error('Ledger integer overflow: Aggregated paise exceeds JavaScript safe integer range');
    }

    const netPaidPaise = Math.max(0, totalPaidPaise - totalRefundedPaise);
    if (!Number.isSafeInteger(netPaidPaise)) {
      throw new Error('Ledger integer overflow: Net paid paise exceeds JavaScript safe integer range');
    }

    return {
      totalPaidPaise,
      totalRefundedPaise,
      netPaidPaise,
      totalPaidRupees: totalPaidPaise / 100,
      totalRefundedRupees: totalRefundedPaise / 100,
      netPaidRupees: netPaidPaise / 100,
    };
  }
}

export const paymentRecordRepository = new PaymentRecordRepository();
