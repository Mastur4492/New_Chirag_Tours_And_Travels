import {
  BookingDto,
  BookingFinancialsDto,
  BookingStatus,
  UserRole,
} from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IBookingFinancials {
  totalAmount: number;
  totalAmountInPaise: number;
  currency: 'INR';
  advanceRequired: number;
  advanceRequiredInPaise: number;
  totalPaid: number;
  totalPaidInPaise: number;
  balancePending: number;
  balancePendingInPaise: number;
  excessPaid?: number;
  excessPaidInPaise?: number;
  supplierCostTotal?: number;
  supplierCostTotalInPaise?: number;
  realizedGrossProfit?: number;
  taxableAmount?: number;
  taxAmount?: number;
  taxRatePercent?: number;
}

export interface IBookingDocument extends Document {
  bookingNumber: string;
  quotationId: mongoose.Types.ObjectId;
  quotationVersionUsed: number;
  leadId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  assignedAgentId: mongoose.Types.ObjectId;
  destinationId: mongoose.Types.ObjectId;
  travelStartDate: Date;
  travelEndDate: Date;
  durationNights: number;
  durationDays: number;
  numberOfAdults: number;
  numberOfChildren: number;
  numberOfInfants: number;
  status: BookingStatus;
  financials: IBookingFinancials;
  itinerarySnapshot?: {
    hotels?: any[];
    transports?: any[];
    inclusions?: string[];
    exclusions?: string[];
    terms?: string[];
  };
  hotelVoucherGenerated: boolean;
  driverDutySlipGenerated: boolean;
  assignedDriverId?: mongoose.Types.ObjectId;
  assignedVehicleId?: mongoose.Types.ObjectId;
  cancellationReason?: string;
  cancellationFee?: number;
  cancellationFeeInPaise?: number;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  confirmedBy?: mongoose.Types.ObjectId;
  confirmedAt?: Date;
  customerNotes?: string;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  toDto(role?: UserRole): BookingDto;
}

const BookingFinancialsSchema = new Schema<IBookingFinancials>(
  {
    totalAmount: { type: Number, required: true, min: 0 },
    totalAmountInPaise: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', required: true },
    advanceRequired: { type: Number, default: 0, min: 0 },
    advanceRequiredInPaise: { type: Number, default: 0, min: 0 },
    totalPaid: { type: Number, default: 0, min: 0 },
    totalPaidInPaise: { type: Number, default: 0, min: 0 },
    balancePending: { type: Number, required: true, min: 0 },
    balancePendingInPaise: { type: Number, required: true, min: 0 },
    excessPaid: { type: Number, default: 0, min: 0 },
    excessPaidInPaise: { type: Number, default: 0, min: 0 },
    supplierCostTotal: { type: Number, min: 0 },
    supplierCostTotalInPaise: { type: Number, min: 0 },
    realizedGrossProfit: { type: Number },
    taxableAmount: { type: Number, min: 0 },
    taxAmount: { type: Number, min: 0 },
    taxRatePercent: { type: Number, min: 0 },
  },
  { _id: false }
);

const BookingSchema = new Schema<IBookingDocument>(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    quotationId: {
      type: Schema.Types.ObjectId,
      ref: 'Quotation',
      required: true,
    },
    quotationVersionUsed: {
      type: Number,
      required: true,
      min: 1,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    assignedAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: 'Destination',
      required: true,
      index: true,
    },
    travelStartDate: {
      type: Date,
      required: true,
      index: true,
    },
    travelEndDate: {
      type: Date,
      required: true,
    },
    durationNights: {
      type: Number,
      required: true,
      min: 1,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
    },
    numberOfAdults: {
      type: Number,
      required: true,
      min: 1,
    },
    numberOfChildren: {
      type: Number,
      default: 0,
      min: 0,
    },
    numberOfInfants: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        'QUOTE_ACCEPTED',
        'PENDING_CONFIRMATION',
        'CONFIRMED',
        'OPERATIONAL_PREPARATION',
        'IN_TRIP',
        'COMPLETED',
        'CANCELLED',
      ],
      default: 'QUOTE_ACCEPTED',
      required: true,
      index: true,
    },
    financials: {
      type: BookingFinancialsSchema,
      required: true,
    },
    itinerarySnapshot: {
      hotels: { type: [Schema.Types.Mixed], default: [] },
      transports: { type: [Schema.Types.Mixed], default: [] },
      inclusions: { type: [String], default: [] },
      exclusions: { type: [String], default: [] },
      terms: { type: [String], default: [] },
    },
    hotelVoucherGenerated: {
      type: Boolean,
      default: false,
    },
    driverDutySlipGenerated: {
      type: Boolean,
      default: false,
    },
    assignedDriverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
    },
    assignedVehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    cancellationFee: {
      type: Number,
      min: 0,
    },
    cancellationFeeInPaise: {
      type: Number,
      min: 0,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: {
      type: Date,
    },
    confirmedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    confirmedAt: {
      type: Date,
    },
    customerNotes: {
      type: String,
      trim: true,
    },
    internalNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  'QUOTE_ACCEPTED',
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'OPERATIONAL_PREPARATION',
  'IN_TRIP',
  'COMPLETED',
];

// Indexes
// 1. Partial Unique Index: only ONE active booking can exist per quotation
BookingSchema.index(
  { quotationId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: ACTIVE_BOOKING_STATUSES,
      },
    },
  }
);

// 2. Performance compound indexes for agent and customer queries
BookingSchema.index({ customerId: 1, createdAt: -1 });
BookingSchema.index({ assignedAgentId: 1, status: 1 });
BookingSchema.index({ status: 1, travelStartDate: 1 });
BookingSchema.index({ createdAt: -1 });
BookingSchema.index({ status: 1, createdAt: -1 });

BookingSchema.methods.toDto = function (role?: UserRole): BookingDto {
  const fin = this.financials;

  const financialsDto: BookingFinancialsDto = {
    totalAmount: fin.totalAmount,
    totalAmountInPaise: fin.totalAmountInPaise,
    currency: fin.currency || 'INR',
    advanceRequired: fin.advanceRequired || 0,
    advanceRequiredInPaise: fin.advanceRequiredInPaise || 0,
    totalPaid: fin.totalPaid || 0,
    totalPaidInPaise: fin.totalPaidInPaise || 0,
    balancePending: fin.balancePending,
    balancePendingInPaise: fin.balancePendingInPaise,
    excessPaid: fin.excessPaid || 0,
    excessPaidInPaise: fin.excessPaidInPaise || 0,
    taxableAmount: fin.taxableAmount,
    taxAmount: fin.taxAmount,
    taxRatePercent: fin.taxRatePercent,
  };

  // Confidential field protection: only ADMIN can see supplier costs & margins
  if (role === 'ADMIN') {
    financialsDto.supplierCostTotal = fin.supplierCostTotal;
    financialsDto.supplierCostTotalInPaise = fin.supplierCostTotalInPaise;
    financialsDto.realizedGrossProfit = fin.realizedGrossProfit;
  }

  const custObj = this.customerId as any;
  const destObj = this.destinationId as any;
  const agentObj = this.assignedAgentId as any;

  const customerIdStr = custObj?._id?.toString() || (this.customerId ? this.customerId.toString() : '');
  const destinationIdStr = destObj?._id?.toString() || (this.destinationId ? this.destinationId.toString() : '');
  const assignedAgentIdStr = agentObj?._id?.toString() || (this.assignedAgentId ? this.assignedAgentId.toString() : '');
  const leadIdStr = (this.leadId as any)?._id?.toString() || (this.leadId ? this.leadId.toString() : '');
  const quotationIdStr = (this.quotationId as any)?._id?.toString() || (this.quotationId ? this.quotationId.toString() : '');

  return {
    id: this._id.toString(),
    bookingNumber: this.bookingNumber,
    quotationId: quotationIdStr,
    quotationVersionUsed: this.quotationVersionUsed,
    leadId: leadIdStr,
    customerId: customerIdStr,
    customerName: custObj?.fullName,
    customerPhone: custObj?.phone,
    customerEmail: custObj?.email,
    assignedAgentId: assignedAgentIdStr,
    assignedAgentName: agentObj?.fullName,
    destinationId: destinationIdStr,
    destinationName: destObj?.name,
    travelStartDate: this.travelStartDate ? this.travelStartDate.toISOString() : new Date().toISOString(),
    travelEndDate: this.travelEndDate ? this.travelEndDate.toISOString() : new Date().toISOString(),
    durationNights: this.durationNights,
    durationDays: this.durationDays,
    travelerSummary: {
      numberOfAdults: this.numberOfAdults,
      numberOfChildren: this.numberOfChildren || 0,
      numberOfInfants: this.numberOfInfants || 0,
    },
    status: this.status,
    financials: financialsDto,
    itinerarySnapshot: this.itinerarySnapshot,
    hotelVoucherGenerated: this.hotelVoucherGenerated || false,
    driverDutySlipGenerated: this.driverDutySlipGenerated || false,
    assignedDriverId: this.assignedDriverId ? this.assignedDriverId.toString() : undefined,
    assignedVehicleId: this.assignedVehicleId ? this.assignedVehicleId.toString() : undefined,
    cancellationReason: this.cancellationReason,
    cancellationFee: this.cancellationFee,
    cancellationFeeInPaise: this.cancellationFeeInPaise,
    cancelledBy: this.cancelledBy ? this.cancelledBy.toString() : undefined,
    cancelledAt: this.cancelledAt ? this.cancelledAt.toISOString() : undefined,
    confirmedBy: this.confirmedBy ? this.confirmedBy.toString() : undefined,
    confirmedAt: this.confirmedAt ? this.confirmedAt.toISOString() : undefined,
    customerNotes: this.customerNotes,
    internalNotes: role === 'ADMIN' || role === 'AGENT' ? this.internalNotes : undefined,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString(),
  };
};

export const BookingModel: Model<IBookingDocument> =
  mongoose.models.Booking || mongoose.model<IBookingDocument>('Booking', BookingSchema);
