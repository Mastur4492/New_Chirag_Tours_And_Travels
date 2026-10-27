import {
  PaymentMethod,
  PaymentRecordDto,
  PaymentStatus,
  PaymentType,
} from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPaymentRecordDocument extends Document {
  receiptNumber: string;
  bookingId: mongoose.Types.ObjectId;
  amount: number;
  amountInPaise: number;
  currency: 'INR';
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionReference?: string;
  paymentDate: Date;
  proofDocumentUrl?: string;
  recordedBy: mongoose.Types.ObjectId;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  settlementReference?: string;
  settledAt?: Date;
  settledBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  notes?: string;
  isRefund: boolean;
  originalPaymentId?: mongoose.Types.ObjectId;
  refundReason?: string;
  allocatedRefundPaise?: number;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
  toDto(): PaymentRecordDto;
}

const PaymentRecordSchema = new Schema<IPaymentRecordDocument>(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    amountInPaise: {
      type: Number,
      required: true,
      min: 100,
    },
    currency: {
      type: String,
      default: 'INR',
      required: true,
    },
    paymentType: {
      type: String,
      enum: ['ADVANCE', 'PARTIAL', 'FINAL_BALANCE', 'SECURITY_DEPOSIT', 'REFUND'],
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: [
        'UPI',
        'NEFT_IMPS',
        'BANK_DEPOSIT',
        'CASH',
        'CHEQUE',
        'CREDIT_CARD',
        'DEBIT_CARD',
        'OTHER',
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'VERIFIED', 'REJECTED'],
      default: 'SUBMITTED',
      required: true,
      index: true,
    },
    transactionReference: {
      type: String,
      trim: true,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    proofDocumentUrl: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    settlementReference: {
      type: String,
      trim: true,
    },
    settledAt: {
      type: Date,
    },
    settledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    isRefund: {
      type: Boolean,
      default: false,
      index: true,
    },
    originalPaymentId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentRecord',
      index: true,
    },
    refundReason: {
      type: String,
      trim: true,
    },
    allocatedRefundPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    idempotencyKey: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
PaymentRecordSchema.index({ bookingId: 1, status: 1 });
PaymentRecordSchema.index({ bookingId: 1, createdAt: -1 });
PaymentRecordSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

// Immutability Guard: Prevent hard deletion of financial records
PaymentRecordSchema.pre('deleteOne', function (next) {
  next(new Error('Financial audit violation: PaymentRecord documents cannot be deleted. Record a refund or correction instead.'));
});

PaymentRecordSchema.pre('findOneAndDelete', function (next) {
  next(new Error('Financial audit violation: PaymentRecord documents cannot be deleted. Record a refund or correction instead.'));
});

PaymentRecordSchema.methods.toDto = function (): PaymentRecordDto {
  const getRefId = (ref: any): string | undefined => {
    if (!ref) return undefined;
    if (typeof ref === 'string') return ref;
    if (ref._id) return ref._id.toString();
    if (typeof ref.toString === 'function') return ref.toString();
    return undefined;
  };

  return {
    id: this._id.toString(),
    receiptNumber: this.receiptNumber,
    bookingId: getRefId(this.bookingId) || '',
    amount: this.amount,
    amountInPaise: this.amountInPaise,
    currency: this.currency || 'INR',
    paymentType: this.paymentType,
    paymentMethod: this.paymentMethod,
    status: this.status,
    transactionReference: this.transactionReference,
    paymentDate: (this.paymentDate instanceof Date ? this.paymentDate : new Date(this.paymentDate)).toISOString(),
    proofDocumentUrl: this.proofDocumentUrl,
    recordedBy: getRefId(this.recordedBy) || '',
    verifiedBy: getRefId(this.verifiedBy),
    verifiedAt: this.verifiedAt ? this.verifiedAt.toISOString() : undefined,
    settlementReference: this.settlementReference,
    settledAt: this.settledAt ? this.settledAt.toISOString() : undefined,
    settledBy: getRefId(this.settledBy),
    rejectionReason: this.rejectionReason,
    notes: this.notes,
    isRefund: this.isRefund || false,
    originalPaymentId: getRefId(this.originalPaymentId),
    refundReason: this.refundReason,
    allocatedRefundPaise: this.allocatedRefundPaise ?? 0,
    idempotencyKey: this.idempotencyKey,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString(),
  };
};

export const PaymentRecordModel: Model<IPaymentRecordDocument> =
  mongoose.models.PaymentRecord ||
  mongoose.model<IPaymentRecordDocument>('PaymentRecord', PaymentRecordSchema);
