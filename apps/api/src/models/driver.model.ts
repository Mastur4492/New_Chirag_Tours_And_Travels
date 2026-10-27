import { DriverDto, DriverStatus } from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IDriverDocument extends Document {
  vendorId: mongoose.Types.ObjectId;
  assignedVehicleId?: mongoose.Types.ObjectId;
  fullName: string;
  mobile: string;
  licenseNumber: string;
  licenseExpiry?: Date;
  languages: string[];
  status: DriverStatus;
  createdAt: Date;
  updatedAt: Date;
  toDto(): DriverDto;
}

const DriverSchema = new Schema<IDriverDocument>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'VehicleVendor',
      required: [true, 'Vendor ID is required'],
      index: true,
    },
    assignedVehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Driver full name is required'],
      trim: true,
      maxlength: 100,
    },
    mobile: {
      type: String,
      required: [true, 'Driver mobile number is required'],
      trim: true,
      index: true,
    },
    licenseNumber: {
      type: String,
      required: [true, 'Driver license number is required'],
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
      maxlength: 30,
    },
    licenseExpiry: {
      type: Date,
    },
    languages: {
      type: [String],
      default: ['Hindi', 'English'],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ON_DUTY', 'OFF_DUTY', 'BLACKLISTED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

DriverSchema.index({ vendorId: 1, status: 1 });

DriverSchema.methods.toDto = function (): DriverDto {
  return {
    id: this._id ? this._id.toString() : '',
    vendorId: this.vendorId ? this.vendorId.toString() : '',
    assignedVehicleId: this.assignedVehicleId ? this.assignedVehicleId.toString() : undefined,
    fullName: this.fullName,
    mobile: this.mobile,
    licenseNumber: this.licenseNumber,
    licenseExpiry: this.licenseExpiry instanceof Date ? this.licenseExpiry.toISOString().split('T')[0] : undefined,
    languages: this.languages,
    status: this.status,
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
    updatedAt: (this.updatedAt instanceof Date ? this.updatedAt : new Date()).toISOString(),
  };
};

export const DriverModel: Model<IDriverDocument> =
  mongoose.models.Driver || mongoose.model<IDriverDocument>('Driver', DriverSchema);
