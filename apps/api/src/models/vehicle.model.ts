import { VehicleCategory, VehicleDto, VehicleStatus } from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IVehicleDocument extends Omit<Document, 'model'> {
  vendorId: mongoose.Types.ObjectId;
  model: string;
  category: VehicleCategory;
  registrationNumber: string;
  seatingCapacity: number;
  hasAC: boolean;
  insuranceExpiry?: Date;
  fitnessExpiry?: Date;
  serviceArea?: string;
  status: VehicleStatus;
  createdAt: Date;
  updatedAt: Date;
  toDto(): VehicleDto;
}

const VehicleSchema = new Schema<IVehicleDocument>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'VehicleVendor',
      required: [true, 'Vendor ID is required'],
      index: true,
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true,
      maxlength: 100,
    },
    category: {
      type: String,
      enum: ['HATCHBACK', 'SEDAN', 'SUV', 'PREMIUM_SUV', 'TEMPO_TRAVELLER', 'BUS'],
      required: true,
      index: true,
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
      maxlength: 25,
    },
    seatingCapacity: {
      type: Number,
      required: true,
      min: 1,
      max: 60,
    },
    hasAC: {
      type: Boolean,
      default: true,
    },
    insuranceExpiry: {
      type: Date,
    },
    fitnessExpiry: {
      type: Date,
    },
    serviceArea: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'INACTIVE'],
      default: 'AVAILABLE',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

VehicleSchema.index({ vendorId: 1, status: 1 });
VehicleSchema.index({ category: 1, status: 1 });

VehicleSchema.methods.toDto = function (): VehicleDto {
  return {
    id: this._id ? this._id.toString() : '',
    vendorId: this.vendorId ? this.vendorId.toString() : '',
    model: this.model,
    category: this.category,
    registrationNumber: this.registrationNumber,
    seatingCapacity: this.seatingCapacity,
    hasAC: this.hasAC,
    insuranceExpiry: this.insuranceExpiry instanceof Date ? this.insuranceExpiry.toISOString().split('T')[0] : undefined,
    fitnessExpiry: this.fitnessExpiry instanceof Date ? this.fitnessExpiry.toISOString().split('T')[0] : undefined,
    serviceArea: this.serviceArea,
    status: this.status,
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
    updatedAt: (this.updatedAt instanceof Date ? this.updatedAt : new Date()).toISOString(),
  };
};

export const VehicleModel: Model<IVehicleDocument> =
  mongoose.models.Vehicle || mongoose.model<IVehicleDocument>('Vehicle', VehicleSchema);
