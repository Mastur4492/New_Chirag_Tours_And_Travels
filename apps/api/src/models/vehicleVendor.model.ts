import { VehicleVendorDto } from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IVehicleVendorDocument extends Document {
  businessName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  settlementTerms?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  toDto(options?: { includeTerms?: boolean }): VehicleVendorDto;
}

const VehicleVendorSchema = new Schema<IVehicleVendorDocument>(
  {
    businessName: {
      type: String,
      required: [true, 'Vendor business name is required'],
      trim: true,
      maxlength: 150,
      index: true,
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person name is required'],
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    state: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    settlementTerms: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

VehicleVendorSchema.methods.toDto = function (
  options = { includeTerms: true }
): VehicleVendorDto {
  return {
    id: this._id ? this._id.toString() : '',
    businessName: this.businessName,
    contactPerson: this.contactPerson,
    phone: this.phone,
    email: this.email,
    city: this.city,
    state: this.state,
    settlementTerms: options.includeTerms !== false ? this.settlementTerms : undefined,
    isActive: this.isActive,
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
    updatedAt: (this.updatedAt instanceof Date ? this.updatedAt : new Date()).toISOString(),
  };
};

export const VehicleVendorModel: Model<IVehicleVendorDocument> =
  mongoose.models.VehicleVendor ||
  mongoose.model<IVehicleVendorDocument>('VehicleVendor', VehicleVendorSchema);
