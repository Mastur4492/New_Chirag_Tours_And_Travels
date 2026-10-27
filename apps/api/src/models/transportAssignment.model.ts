import {
  IDocumentSnapshotDto,
  SupplierCancellationStatus,
  TransportAssignmentDto,
  TransportAssignmentHistoryDto,
  TransportAssignmentStatus,
} from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';
import { IDocumentSnapshotDoc } from './hotelReservation.model';

export interface ITransportAssignmentHistoryDoc {
  previousVehicleId?: mongoose.Types.ObjectId;
  previousDriverId?: mongoose.Types.ObjectId;
  previousVendorId?: mongoose.Types.ObjectId;
  reassignedAt: Date;
  reassignedBy: mongoose.Types.ObjectId;
  reason?: string;
  previousStatus?: string;
}

export interface ITransportAssignmentDocument extends Document {
  bookingId: mongoose.Types.ObjectId;
  bookingNumber: string;
  transportItemIndex: number;
  assignedVehicleId?: mongoose.Types.ObjectId;
  assignedDriverId?: mongoose.Types.ObjectId;
  assignedVendorId?: mongoose.Types.ObjectId;
  status: TransportAssignmentStatus;
  startDate: Date;
  endDate: Date;
  pickupLocation: string;
  dropLocation: string;
  pickupTime?: string;
  reportingAddress?: string;
  dutySlipIssued: boolean;
  currentDutySlip?: IDocumentSnapshotDoc;
  dutySlipHistory: IDocumentSnapshotDoc[];
  dutySlipAllocationInProgress: boolean;
  dutySlipAllocationClaimedAt?: Date;
  assignmentHistory: ITransportAssignmentHistoryDoc[];
  dispatchedAt?: Date;
  dispatchedBy?: mongoose.Types.ObjectId;
  dispatchNotes?: string;
  supplierCancellation?: {
    status: SupplierCancellationStatus;
    requestedAt?: Date;
    requestedBy?: mongoose.Types.ObjectId;
    reason?: string;
    supplierConfirmationReference?: string;
    acknowledgedAt?: Date;
  };
  activeLockIntentId?: string;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  toDto(): TransportAssignmentDto;
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

const AssignmentHistorySchema = new Schema<ITransportAssignmentHistoryDoc>(
  {
    previousVehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    previousDriverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
    previousVendorId: { type: Schema.Types.ObjectId, ref: 'VehicleVendor' },
    reassignedAt: { type: Date, default: Date.now, required: true },
    reassignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, trim: true },
    previousStatus: { type: String },
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

const TransportAssignmentSchema = new Schema<ITransportAssignmentDocument>(
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
    transportItemIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    assignedVehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      index: true,
    },
    assignedDriverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      index: true,
    },
    assignedVendorId: {
      type: Schema.Types.ObjectId,
      ref: 'VehicleVendor',
    },
    status: {
      type: String,
      enum: ['UNASSIGNED', 'ASSIGNED', 'DISPATCHED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'],
      default: 'UNASSIGNED',
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    pickupLocation: {
      type: String,
      required: true,
      trim: true,
      default: 'Airport / Hotel Pickup',
    },
    dropLocation: {
      type: String,
      required: true,
      trim: true,
      default: 'Sightseeing / Tour Circuit',
    },
    pickupTime: {
      type: String,
      trim: true,
    },
    reportingAddress: {
      type: String,
      trim: true,
    },
    dutySlipIssued: {
      type: Boolean,
      default: false,
      index: true,
    },
    currentDutySlip: {
      type: DocumentSnapshotSchema,
    },
    dutySlipHistory: {
      type: [DocumentSnapshotSchema],
      default: [],
    },
    dutySlipAllocationInProgress: {
      type: Boolean,
      default: false,
    },
    dutySlipAllocationClaimedAt: {
      type: Date,
    },
    assignmentHistory: {
      type: [AssignmentHistorySchema],
      default: [],
    },
    dispatchedAt: {
      type: Date,
    },
    dispatchedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    dispatchNotes: {
      type: String,
      trim: true,
    },
    supplierCancellation: {
      type: SupplierCancellationSchema,
    },
    activeLockIntentId: {
      type: String,
      index: true,
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

// Compound Unique Index: At most one assignment per itinerary transport item
TransportAssignmentSchema.index({ bookingId: 1, transportItemIndex: 1 }, { unique: true });
TransportAssignmentSchema.index({ assignedVehicleId: 1, status: 1 });
TransportAssignmentSchema.index({ assignedDriverId: 1, status: 1 });

TransportAssignmentSchema.methods.toDto = function (
  this: ITransportAssignmentDocument
): TransportAssignmentDto {
  const vehicle = this.assignedVehicleId as any;
  const driver = this.assignedDriverId as any;
  const vendor = this.assignedVendorId as any;

  const currentDutySlipDto: IDocumentSnapshotDto | undefined = this.currentDutySlip
    ? {
        documentNumber: this.currentDutySlip.documentNumber,
        version: this.currentDutySlip.version,
        issuedAt: this.currentDutySlip.issuedAt.toISOString(),
        issuedBy: this.currentDutySlip.issuedBy.toString(),
        reissueReason: this.currentDutySlip.reissueReason,
        documentSnapshot: this.currentDutySlip.documentSnapshot,
      }
    : undefined;

  const dutySlipHistoryDto: IDocumentSnapshotDto[] = (this.dutySlipHistory || []).map((ds) => ({
    documentNumber: ds.documentNumber,
    version: ds.version,
    issuedAt: ds.issuedAt.toISOString(),
    issuedBy: ds.issuedBy.toString(),
    reissueReason: ds.reissueReason,
    documentSnapshot: ds.documentSnapshot,
  }));

  const assignmentHistoryDto: TransportAssignmentHistoryDto[] = (this.assignmentHistory || []).map(
    (h) => ({
      previousVehicleId: h.previousVehicleId?.toString(),
      previousDriverId: h.previousDriverId?.toString(),
      previousVendorId: h.previousVendorId?.toString(),
      reassignedAt: h.reassignedAt.toISOString(),
      reassignedBy: h.reassignedBy.toString(),
      reason: h.reason,
      previousStatus: h.previousStatus,
    })
  );

  return {
    id: this._id.toString(),
    bookingId: this.bookingId.toString(),
    bookingNumber: this.bookingNumber,
    transportItemIndex: this.transportItemIndex,
    assignedVehicleId: vehicle?._id ? vehicle._id.toString() : this.assignedVehicleId?.toString(),
    vehicleRegistrationNumber: vehicle?.registrationNumber,
    vehicleModel: vehicle?.model,
    vehicleCategory: vehicle?.category,
    assignedDriverId: driver?._id ? driver._id.toString() : this.assignedDriverId?.toString(),
    driverName: driver?.fullName,
    driverMobile: driver?.mobile,
    driverLicenseNumber: driver?.licenseNumber,
    assignedVendorId: vendor?._id ? vendor._id.toString() : this.assignedVendorId?.toString(),
    vendorName: vendor?.businessName,
    status: this.status,
    startDate: this.startDate.toISOString(),
    endDate: this.endDate.toISOString(),
    pickupLocation: this.pickupLocation,
    dropLocation: this.dropLocation,
    pickupTime: this.pickupTime,
    reportingAddress: this.reportingAddress,
    dutySlipIssued: this.dutySlipIssued,
    currentDutySlip: currentDutySlipDto,
    dutySlipHistory: dutySlipHistoryDto,
    assignmentHistory: assignmentHistoryDto,
    dispatchedAt: this.dispatchedAt?.toISOString(),
    dispatchedBy: this.dispatchedBy?.toString(),
    dispatchNotes: this.dispatchNotes,
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
};

export const TransportAssignmentModel: Model<ITransportAssignmentDocument> =
  mongoose.models.TransportAssignment ||
  mongoose.model<ITransportAssignmentDocument>('TransportAssignment', TransportAssignmentSchema);
