import {
  MealPlan,
  QuotationDto,
  QuotationHotelRoomItemDto,
  QuotationPublicDto,
  QuotationStatus,
  QuotationTransportItemDto,
  TransportPricingBasis,
  UserRole,
} from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';
import { getCompanyBrandingConfig } from '../config/company.config';

export interface IQuotationDocument extends Document {
  quoteNumber: string;
  leadId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  assignedAgentId: mongoose.Types.ObjectId;
  destinationId: mongoose.Types.ObjectId;
  packageId?: mongoose.Types.ObjectId;
  travelStartDate: Date;
  travelEndDate: Date;
  durationNights: number;
  durationDays: number;
  numberOfAdults: number;
  numberOfChildren: number;
  numberOfInfants: number;
  currentVersion: number;
  status: QuotationStatus;
  shareableTokenHash?: string;
  supersededTokenHashes?: string[];
  validUntil: Date;
  notes?: string;
  inclusions: string[];
  exclusions: string[];
  terms: string[];
  hotels: Array<{
    hotelId: mongoose.Types.ObjectId;
    roomCategoryId: mongoose.Types.ObjectId;
    checkInDate: Date;
    checkOutDate: Date;
    numberOfNights: number;
    numberOfRooms: number;
    adultsCount: number;
    childrenWithBedCount: number;
    childrenWithoutBedCount: number;
    mealPlan: MealPlan;
    supplierCost?: number;
    calculatedPrice: number;
  }>;
  transports: Array<{
    vehicleId?: mongoose.Types.ObjectId;
    tariffId?: mongoose.Types.ObjectId;
    pricingBasis: TransportPricingBasis;
    numberOfDays?: number;
    estimatedKm?: number;
    driverAllowanceDays?: number;
    nightHaltDays?: number;
    tollsAndParking?: number;
    supplierCost?: number;
    calculatedPrice: number;
    notes?: string;
  }>;
  pricingSummary: {
    totalBaseSupplierCost: number;
    totalMarkupAmount: number;
    markupPercent: number;
    markupType?: 'PERCENT' | 'FLAT';
    discountAmount: number;
    discountPercent: number;
    discountType?: 'PERCENT' | 'FLAT';
    taxableAmount: number;
    taxRatePercent: number;
    taxAmount: number;
    isTaxApplicable: boolean;
    isTaxConfirmed?: boolean;
    taxRuleName?: string;
    finalSellingPrice: number;
    projectedGrossProfit: number;
  };

  approvalReason?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  acceptedAt?: Date;
  bookingId?: mongoose.Types.ObjectId;
  bookingNumber?: string;
  customerAcceptanceNotes?: string;
  customerModificationRequest?: {
    message: string;
    requestedAt: Date;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  toDto(role?: UserRole): QuotationDto;
  toPublicDto(): QuotationPublicDto;
}

const QuotationHotelSchema = new Schema(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    roomCategoryId: { type: Schema.Types.ObjectId, ref: 'RoomCategory', required: true },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    numberOfNights: { type: Number, required: true, min: 1 },
    numberOfRooms: { type: Number, required: true, min: 1 },
    adultsCount: { type: Number, required: true, min: 1 },
    childrenWithBedCount: { type: Number, default: 0, min: 0 },
    childrenWithoutBedCount: { type: Number, default: 0, min: 0 },
    mealPlan: { type: String, enum: ['RO', 'EP', 'CP', 'MAP', 'AP'], required: true },
    supplierCost: { type: Number, min: 0 },
    calculatedPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const QuotationTransportSchema = new Schema(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    tariffId: { type: Schema.Types.ObjectId, ref: 'TransportTariff' },
    pricingBasis: { type: String, enum: ['PER_DAY', 'PER_KM', 'FIXED_CIRCUIT'], required: true },
    numberOfDays: { type: Number, min: 1 },
    estimatedKm: { type: Number, min: 0 },
    driverAllowanceDays: { type: Number, default: 0, min: 0 },
    nightHaltDays: { type: Number, default: 0, min: 0 },
    tollsAndParking: { type: Number, default: 0, min: 0 },
    supplierCost: { type: Number, min: 0 },
    calculatedPrice: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const PricingSummarySchema = new Schema(
  {
    totalBaseSupplierCost: { type: Number, required: true, min: 0 },
    totalMarkupAmount: { type: Number, required: true, min: 0 },
    markupPercent: { type: Number, required: true, min: 0 },
    markupType: { type: String, enum: ['PERCENT', 'FLAT'], default: 'PERCENT' },
    discountAmount: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, required: true, min: 0 },
    discountType: { type: String, enum: ['PERCENT', 'FLAT'], default: 'PERCENT' },
    taxableAmount: { type: Number, required: true, min: 0 },
    taxRatePercent: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    isTaxApplicable: { type: Boolean, required: true, default: true },
    isTaxConfirmed: { type: Boolean, default: false },
    taxRuleName: { type: String, trim: true },
    finalSellingPrice: { type: Number, required: true, min: 0 },
    projectedGrossProfit: { type: Number, required: true },
  },
  { _id: false }
);


const QuotationSchema = new Schema<IQuotationDocument>(
  {
    quoteNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
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
    packageId: {
      type: Schema.Types.ObjectId,
      ref: 'TourPackage',
      index: true,
    },
    travelStartDate: {
      type: Date,
      required: true,
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
      default: 2,
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
    currentVersion: {
      type: Number,
      required: true,
      default: 1,
    },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'PENDING_ADMIN_APPROVAL',
        'APPROVED',
        'ISSUED',
        'SENT',
        'ACCEPTED',
        'REVISED',
        'EXPIRED',
        'REJECTED',
      ],
      required: true,
      default: 'DRAFT',
      index: true,
    },
    shareableTokenHash: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    supersededTokenHashes: {
      type: [String],
      default: [],
      index: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    inclusions: {
      type: [String],
      default: [],
    },
    exclusions: {
      type: [String],
      default: [],
    },
    terms: {
      type: [String],
      default: [],
    },
    hotels: [QuotationHotelSchema],
    transports: [QuotationTransportSchema],
    pricingSummary: {
      type: PricingSummarySchema,
      required: true,
    },
    approvalReason: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    acceptedAt: {
      type: Date,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      index: true,
    },
    bookingNumber: {
      type: String,
      trim: true,
    },
    customerAcceptanceNotes: {
      type: String,
      trim: true,
    },
    customerModificationRequest: {
      type: {
        message: { type: String, trim: true },
        requestedAt: { type: Date },
      },
      default: undefined,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// High-performance compound indexes for quotations filtering and analytics
QuotationSchema.index({ createdAt: -1 });
QuotationSchema.index({ status: 1, createdAt: -1 });
QuotationSchema.index({ assignedAgentId: 1, status: 1 });
QuotationSchema.index({ customerId: 1, createdAt: -1 });
QuotationSchema.index({ destinationId: 1, status: 1 });

QuotationSchema.methods.toDto = function (role?: UserRole): QuotationDto {
  const isAdmin = role === 'ADMIN';

  const customer = this.populated('customerId') ? (this.customerId as any) : undefined;
  const destination = this.populated('destinationId') ? (this.destinationId as any) : undefined;
  const assignedAgent = this.populated('assignedAgentId') ? (this.assignedAgentId as any) : undefined;

  const hotels: QuotationHotelRoomItemDto[] = (this.hotels || []).map((h: any) => ({
    hotelId: h.hotelId ? h.hotelId.toString() : '',
    hotelName: h.hotelId && h.hotelId.name ? h.hotelId.name : undefined,
    roomCategoryId: h.roomCategoryId ? h.roomCategoryId.toString() : '',
    roomCategoryName: h.roomCategoryId && h.roomCategoryId.name ? h.roomCategoryId.name : undefined,
    checkInDate: (h.checkInDate instanceof Date ? h.checkInDate : new Date(h.checkInDate)).toISOString().split('T')[0],
    checkOutDate: (h.checkOutDate instanceof Date ? h.checkOutDate : new Date(h.checkOutDate)).toISOString().split('T')[0],
    numberOfNights: h.numberOfNights,
    numberOfRooms: h.numberOfRooms,
    adultsCount: h.adultsCount,
    childrenWithBedCount: h.childrenWithBedCount || 0,
    childrenWithoutBedCount: h.childrenWithoutBedCount || 0,
    mealPlan: h.mealPlan,
    supplierCost: isAdmin ? h.supplierCost : undefined,
    calculatedPrice: h.calculatedPrice,
  }));

  const transports: QuotationTransportItemDto[] = (this.transports || []).map((t: any) => ({
    vehicleId: t.vehicleId ? t.vehicleId.toString() : undefined,
    vehicleName: t.vehicleId && t.vehicleId.model ? t.vehicleId.model : undefined,
    tariffId: t.tariffId ? t.tariffId.toString() : undefined,
    pricingBasis: t.pricingBasis,
    numberOfDays: t.numberOfDays,
    estimatedKm: t.estimatedKm,
    driverAllowanceDays: t.driverAllowanceDays,
    nightHaltDays: t.nightHaltDays,
    tollsAndParking: t.tollsAndParking,
    supplierCost: isAdmin ? t.supplierCost : undefined,
    calculatedPrice: t.calculatedPrice,
    notes: t.notes,
  }));

  return {
    id: this._id ? this._id.toString() : '',
    quoteNumber: this.quoteNumber,
    leadId: this.leadId ? this.leadId.toString() : '',
    customerId: customer ? customer._id.toString() : this.customerId ? this.customerId.toString() : '',
    customerName: customer ? customer.fullName : undefined,
    customerMobile: customer ? customer.mobile : undefined,
    assignedAgentId: assignedAgent
      ? assignedAgent._id.toString()
      : this.assignedAgentId
        ? this.assignedAgentId.toString()
        : '',
    assignedAgentName: assignedAgent ? assignedAgent.fullName : undefined,
    destinationId: destination ? destination._id.toString() : this.destinationId ? this.destinationId.toString() : '',
    destinationName: destination ? destination.name : undefined,
    packageId: this.packageId ? this.packageId.toString() : undefined,
    travelStartDate: this.travelStartDate
      ? (this.travelStartDate instanceof Date ? this.travelStartDate : new Date(this.travelStartDate)).toISOString().split('T')[0]!
      : new Date().toISOString().split('T')[0]!,
    travelEndDate: this.travelEndDate
      ? (this.travelEndDate instanceof Date ? this.travelEndDate : new Date(this.travelEndDate)).toISOString().split('T')[0]!
      : new Date().toISOString().split('T')[0]!,
    durationNights: this.durationNights || 1,
    durationDays: this.durationDays || 2,
    numberOfAdults: this.numberOfAdults || 2,
    numberOfChildren: this.numberOfChildren || 0,
    numberOfInfants: this.numberOfInfants || 0,
    currentVersion: this.currentVersion || 1,
    status: this.status || 'DRAFT',
    validUntil: this.validUntil
      ? (this.validUntil instanceof Date ? this.validUntil : new Date(this.validUntil)).toISOString()
      : new Date().toISOString(),
    notes: this.notes,
    inclusions: this.inclusions || [],
    exclusions: this.exclusions || [],
    terms: this.terms || [],
    hotels,
    transports,
    pricingSummary: this.pricingSummary
      ? {
          totalBaseSupplierCost: isAdmin ? this.pricingSummary.totalBaseSupplierCost : undefined,
          totalMarkupAmount: this.pricingSummary.totalMarkupAmount || 0,
          markupPercent: this.pricingSummary.markupPercent || 0,
          markupType: (this.pricingSummary as any).markupType || 'PERCENT',
          discountAmount: this.pricingSummary.discountAmount || 0,
          discountPercent: this.pricingSummary.discountPercent || 0,
          discountType: (this.pricingSummary as any).discountType || 'PERCENT',
          taxableAmount: this.pricingSummary.taxableAmount || 0,
          taxRatePercent: this.pricingSummary.taxRatePercent || 0,
          taxAmount: this.pricingSummary.taxAmount || 0,
          isTaxApplicable: this.pricingSummary.isTaxApplicable ?? true,
          isTaxConfirmed: this.pricingSummary.isTaxConfirmed ?? false,
          taxRuleName: this.pricingSummary.taxRuleName,
          finalSellingPrice: this.pricingSummary.finalSellingPrice || 0,
          projectedGrossProfit: isAdmin ? this.pricingSummary.projectedGrossProfit : undefined,
        }
      : {
          totalBaseSupplierCost: isAdmin ? 0 : undefined,
          totalMarkupAmount: 0,
          markupPercent: 0,
          markupType: 'PERCENT',
          discountAmount: 0,
          discountPercent: 0,
          discountType: 'PERCENT',
          taxableAmount: 0,
          taxRatePercent: 0,
          taxAmount: 0,
          isTaxApplicable: true,
          isTaxConfirmed: false,
          finalSellingPrice: 0,
          projectedGrossProfit: isAdmin ? 0 : undefined,
        },

    approvalReason: this.approvalReason,
    approvedBy: this.approvedBy ? this.approvedBy.toString() : undefined,
    approvedAt: this.approvedAt ? (this.approvedAt instanceof Date ? this.approvedAt : new Date(this.approvedAt)).toISOString() : undefined,
    acceptedAt: this.acceptedAt ? (this.acceptedAt instanceof Date ? this.acceptedAt : new Date(this.acceptedAt)).toISOString() : undefined,
    bookingId: this.bookingId ? this.bookingId.toString() : undefined,
    bookingNumber: this.bookingNumber,
    customerModificationRequest: (this.customerModificationRequest && this.customerModificationRequest.message && this.customerModificationRequest.requestedAt)
      ? {
          message: this.customerModificationRequest.message,
          requestedAt: (this.customerModificationRequest.requestedAt instanceof Date
            ? this.customerModificationRequest.requestedAt
            : new Date(this.customerModificationRequest.requestedAt)
          ).toISOString(),
        }
      : undefined,
    createdBy: this.createdBy ? this.createdBy.toString() : '',
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
    updatedAt: (this.updatedAt instanceof Date ? this.updatedAt : new Date()).toISOString(),
  };
};

QuotationSchema.methods.toPublicDto = function (): QuotationPublicDto {
  const customer = this.populated('customerId') ? (this.customerId as any) : undefined;
  const destination = this.populated('destinationId') ? (this.destinationId as any) : undefined;

  const hotels = (this.hotels || []).map((h: any) => ({
    hotelName: h.hotelId && h.hotelId.name ? h.hotelId.name : undefined,
    roomCategoryName: h.roomCategoryId && h.roomCategoryId.name ? h.roomCategoryId.name : undefined,
    checkInDate: (h.checkInDate instanceof Date ? h.checkInDate : new Date(h.checkInDate)).toISOString().split('T')[0],
    checkOutDate: (h.checkOutDate instanceof Date ? h.checkOutDate : new Date(h.checkOutDate)).toISOString().split('T')[0],
    numberOfNights: h.numberOfNights,
    numberOfRooms: h.numberOfRooms,
    mealPlan: h.mealPlan,
  }));

  const transports = (this.transports || []).map((t: any) => ({
    vehicleName: t.vehicleId && t.vehicleId.model ? t.vehicleId.model : undefined,
    pricingBasis: t.pricingBasis,
    numberOfDays: t.numberOfDays,
    notes: t.notes,
  }));

  return {
    quoteNumber: this.quoteNumber,
    customerName: customer ? customer.fullName : undefined,
    destinationName: destination ? destination.name : undefined,
    travelStartDate: this.travelStartDate
      ? (this.travelStartDate instanceof Date ? this.travelStartDate : new Date(this.travelStartDate)).toISOString().split('T')[0]!
      : new Date().toISOString().split('T')[0]!,
    travelEndDate: this.travelEndDate
      ? (this.travelEndDate instanceof Date ? this.travelEndDate : new Date(this.travelEndDate)).toISOString().split('T')[0]!
      : new Date().toISOString().split('T')[0]!,
    durationNights: this.durationNights || 1,
    durationDays: this.durationDays || 2,
    numberOfAdults: this.numberOfAdults || 2,
    numberOfChildren: this.numberOfChildren || 0,
    status: this.status || 'DRAFT',
    validUntil: this.validUntil
      ? (this.validUntil instanceof Date ? this.validUntil : new Date(this.validUntil)).toISOString()
      : new Date().toISOString(),
    acceptedAt: this.acceptedAt
      ? (this.acceptedAt instanceof Date ? this.acceptedAt : new Date(this.acceptedAt)).toISOString()
      : undefined,
    bookingId: this.bookingId ? this.bookingId.toString() : undefined,
    bookingNumber: this.bookingNumber,
    customerModificationRequest: (this.customerModificationRequest && this.customerModificationRequest.message && this.customerModificationRequest.requestedAt)
      ? {
          message: this.customerModificationRequest.message,
          requestedAt: (this.customerModificationRequest.requestedAt instanceof Date
            ? this.customerModificationRequest.requestedAt
            : new Date(this.customerModificationRequest.requestedAt)
          ).toISOString(),
        }
      : undefined,
    companyInfo: (() => {
      const b = getCompanyBrandingConfig();
      return {
        name: b.name,
        owner: b.owner,
        phone: b.phone,
        email: b.email,
        address: b.address,
        gstin: b.gstin,
        logoBadgeUrl: b.logoBadgeUrl,
        logoFullUrl: b.logoFullUrl,
        logoIconUrl: b.logoIconUrl,
        isPhoneConfigured: b.isPhoneConfigured,
        isEmailConfigured: b.isEmailConfigured,
        isGstinConfigured: b.isGstinConfigured,
      };
    })(),
    notes: this.notes,
    inclusions: this.inclusions || [],
    exclusions: this.exclusions || [],
    terms: this.terms || [],
    hotels,
    transports,
    pricingSummary: this.pricingSummary
      ? {
          taxableAmount: this.pricingSummary.taxableAmount || 0,
          taxRatePercent: this.pricingSummary.taxRatePercent || 0,
          taxAmount: this.pricingSummary.taxAmount || 0,
          isTaxApplicable: this.pricingSummary.isTaxApplicable ?? true,
          isTaxConfirmed: this.pricingSummary.isTaxConfirmed ?? false,
          discountAmount: this.pricingSummary.discountAmount || 0,
          discountPercent: this.pricingSummary.discountPercent || 0,
          discountType: (this.pricingSummary as any).discountType || 'PERCENT',
          finalSellingPrice: this.pricingSummary.finalSellingPrice || 0,
          gstRatePercent: this.pricingSummary.taxRatePercent || 0,
          gstAmount: this.pricingSummary.taxAmount || 0,
        }
      : {
          taxableAmount: 0,
          taxRatePercent: 0,
          taxAmount: 0,
          isTaxApplicable: true,
          isTaxConfirmed: false,
          discountAmount: 0,
          discountPercent: 0,
          discountType: 'PERCENT',
          finalSellingPrice: 0,
          gstRatePercent: 0,
          gstAmount: 0,
        },
  };
};


export const QuotationModel: Model<IQuotationDocument> =
  mongoose.models.Quotation || mongoose.model<IQuotationDocument>('Quotation', QuotationSchema);
