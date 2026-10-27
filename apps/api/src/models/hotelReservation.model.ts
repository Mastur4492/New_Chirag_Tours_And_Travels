import {
  HotelReservationDto,
  HotelReservationStatus,
  IDocumentSnapshotDto,
  MealPlan,
  SupplierCancellationStatus,
  UserRole,
} from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IDocumentSnapshotDoc {
  documentNumber: string;
  version: number;
  issuedAt: Date;
  issuedBy: mongoose.Types.ObjectId;
  reissueReason?: string;
  documentSnapshot: Record<string, unknown>;
}

export interface IHotelReservationDocument extends Document {
  bookingId: mongoose.Types.ObjectId;
  bookingNumber: string;
  hotelId: mongoose.Types.ObjectId;
  roomCategoryId: mongoose.Types.ObjectId;
  hotelItemIndex: number;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfNights: number;
  numberOfRooms: number;
  mealPlan: MealPlan;
  adultsCount: number;
  childrenCount: number;
  status: HotelReservationStatus;
  supplierConfirmationNumber?: string;
  supplierContactPerson?: string;
  supplierContactPhone?: string;
  specialRequests?: string;
  supplierCost?: number;
  voucherIssued: boolean;
  currentVoucher?: IDocumentSnapshotDoc;
  voucherHistory: IDocumentSnapshotDoc[];
  voucherAllocationInProgress: boolean;
  voucherAllocationClaimedAt?: Date;
  supplierCancellation?: {
    status: SupplierCancellationStatus;
    requestedAt?: Date;
    requestedBy?: mongoose.Types.ObjectId;
    reason?: string;
    supplierConfirmationReference?: string;
    acknowledgedAt?: Date;
  };
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  toDto(role?: UserRole): HotelReservationDto;
}

const DocumentSnapshotSchema = new Schema<IDocumentSnapshotDoc>(
  {
    documentNumber: { type: String, required: true },
    version: { type: Number, required: true, min: 1 },
    issuedAt: { type: Date, required: true, default: Date.now },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reissueReason: { type: String, trim: true },
    documentSnapshot: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const SupplierCancellationSchema = new Schema(
  {
    status: {
      type: String,
      enum: ['PENDING_SUPPLIER_ACKNOWLEDGEMENT', 'SUPPLIER_CONFIRMED', 'SUPPLIER_PENALTY_DISPUTED'],
      default: 'PENDING_SUPPLIER_ACKNOWLEDGEMENT',
    },
    requestedAt: { type: Date, default: Date.now },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, trim: true },
    supplierConfirmationReference: { type: String, trim: true },
    acknowledgedAt: { type: Date },
  },
  { _id: false }
);

const HotelReservationSchema = new Schema<IHotelReservationDocument>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    bookingNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true,
    },
    roomCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'RoomCategory',
      required: true,
    },
    hotelItemIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    checkInDate: {
      type: Date,
      required: true,
      index: true,
    },
    checkOutDate: {
      type: Date,
      required: true,
    },
    numberOfNights: {
      type: Number,
      required: true,
      min: 1,
    },
    numberOfRooms: {
      type: Number,
      required: true,
      min: 1,
    },
    mealPlan: {
      type: String,
      enum: ['EP', 'CP', 'MAP', 'AP'],
      required: true,
    },
    adultsCount: {
      type: Number,
      required: true,
      min: 1,
    },
    childrenCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'REQUESTED', 'CONFIRMED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      required: true,
      index: true,
    },
    supplierConfirmationNumber: {
      type: String,
      trim: true,
    },
    supplierContactPerson: {
      type: String,
      trim: true,
    },
    supplierContactPhone: {
      type: String,
      trim: true,
    },
    specialRequests: {
      type: String,
      trim: true,
    },
    supplierCost: {
      type: Number,
      min: 0,
    },
    voucherIssued: {
      type: Boolean,
      default: false,
      index: true,
    },
    currentVoucher: {
      type: DocumentSnapshotSchema,
    },
    voucherHistory: {
      type: [DocumentSnapshotSchema],
      default: [],
    },
    voucherAllocationInProgress: {
      type: Boolean,
      default: false,
    },
    voucherAllocationClaimedAt: {
      type: Date,
    },
    supplierCancellation: {
      type: SupplierCancellationSchema,
    },
    internalNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index: At most one reservation per itinerary hotel item
HotelReservationSchema.index({ bookingId: 1, hotelItemIndex: 1 }, { unique: true });
HotelReservationSchema.index({ hotelId: 1, status: 1 });

HotelReservationSchema.methods.toDto = function (
  this: IHotelReservationDocument,
  role?: UserRole
): HotelReservationDto {
  const hotel = this.hotelId as any;
  const roomCategory = this.roomCategoryId as any;

  const currentVoucherDto: IDocumentSnapshotDto | undefined = this.currentVoucher
    ? {
        documentNumber: this.currentVoucher.documentNumber,
        version: this.currentVoucher.version,
        issuedAt: this.currentVoucher.issuedAt.toISOString(),
        issuedBy: this.currentVoucher.issuedBy.toString(),
        reissueReason: this.currentVoucher.reissueReason,
        documentSnapshot: this.currentVoucher.documentSnapshot,
      }
    : undefined;

  const voucherHistoryDto: IDocumentSnapshotDto[] = (this.voucherHistory || []).map((vh) => ({
    documentNumber: vh.documentNumber,
    version: vh.version,
    issuedAt: vh.issuedAt.toISOString(),
    issuedBy: vh.issuedBy.toString(),
    reissueReason: vh.reissueReason,
    documentSnapshot: vh.documentSnapshot,
  }));

  const dto: HotelReservationDto = {
    id: this._id.toString(),
    bookingId: this.bookingId.toString(),
    bookingNumber: this.bookingNumber,
    hotelId: hotel?._id ? hotel._id.toString() : this.hotelId.toString(),
    hotelName: hotel?.name,
    hotelCity: hotel?.city,
    roomCategoryId: roomCategory?._id ? roomCategory._id.toString() : this.roomCategoryId.toString(),
    roomCategoryName: roomCategory?.name,
    hotelItemIndex: this.hotelItemIndex,
    checkInDate: this.checkInDate.toISOString(),
    checkOutDate: this.checkOutDate.toISOString(),
    numberOfNights: this.numberOfNights,
    numberOfRooms: this.numberOfRooms,
    mealPlan: this.mealPlan,
    adultsCount: this.adultsCount,
    childrenCount: this.childrenCount,
    status: this.status,
    supplierConfirmationNumber: this.supplierConfirmationNumber,
    supplierContactPerson: this.supplierContactPerson,
    supplierContactPhone: this.supplierContactPhone,
    specialRequests: this.specialRequests,
    voucherIssued: this.voucherIssued,
    currentVoucher: currentVoucherDto,
    voucherHistory: voucherHistoryDto,
    supplierCancellation: this.supplierCancellation
      ? {
          status: this.supplierCancellation.status,
          requestedAt: this.supplierCancellation.requestedAt?.toISOString(),
          requestedBy: this.supplierCancellation.requestedBy?.toString(),
          reason: this.supplierCancellation.reason,
          supplierConfirmationReference: this.supplierCancellation.supplierConfirmationReference,
          acknowledgedAt: this.supplierCancellation.acknowledgedAt?.toISOString(),
        }
      : undefined,
    internalNotes: this.internalNotes,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };

  // Confidential cost masking: ADMIN only
  if (role === 'ADMIN') {
    dto.supplierCost = this.supplierCost;
  }

  return dto;
};

export const HotelReservationModel: Model<IHotelReservationDocument> =
  mongoose.models.HotelReservation ||
  mongoose.model<IHotelReservationDocument>('HotelReservation', HotelReservationSchema);
