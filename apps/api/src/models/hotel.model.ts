import { HotelDto, HotelPropertyType } from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IHotelDocument extends Document {
  name: string;
  destinationId: mongoose.Types.ObjectId;
  starRating: number;
  propertyType: HotelPropertyType;
  address?: string;
  city?: string;
  contactPhone?: string;
  contactEmail?: string;
  vendorName?: string;
  amenities: string[];
  images: string[];
  checkInTime: string;
  checkOutTime: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  toDto(options?: { includeVendorInfo?: boolean }): HotelDto;
}

const HotelSchema = new Schema<IHotelDocument>(
  {
    name: {
      type: String,
      required: [true, 'Hotel name is required'],
      trim: true,
      maxlength: 150,
      index: true,
    },
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: 'Destination',
      required: [true, 'Destination ID is required'],
      index: true,
    },
    starRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    propertyType: {
      type: String,
      enum: ['HOTEL', 'RESORT', 'HOUSEBOAT', 'HOMESTAY', 'LUXURY_CAMP', 'HERITAGE_HAVELI'],
      required: true,
      index: true,
    },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    vendorName: { type: String, trim: true },
    amenities: { type: [String], default: [] },
    images: { type: [String], default: [] },
    checkInTime: { type: String, default: '14:00' },
    checkOutTime: { type: String, default: '11:00' },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for querying active hotels by destination and star category
HotelSchema.index({ destinationId: 1, isActive: 1, starRating: -1 });

HotelSchema.methods.toDto = function (options = { includeVendorInfo: true }): HotelDto {
  return {
    id: this._id ? this._id.toString() : '',
    name: this.name,
    destinationId: this.destinationId ? this.destinationId.toString() : '',
    starRating: this.starRating,
    propertyType: this.propertyType,
    address: this.address,
    city: this.city,
    contactPhone: options.includeVendorInfo ? this.contactPhone : undefined,
    contactEmail: options.includeVendorInfo ? this.contactEmail : undefined,
    vendorName: options.includeVendorInfo ? this.vendorName : undefined,
    amenities: this.amenities,
    images: this.images,
    checkInTime: this.checkInTime,
    checkOutTime: this.checkOutTime,
    isActive: this.isActive,
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
    updatedAt: (this.updatedAt instanceof Date ? this.updatedAt : new Date()).toISOString(),
  };
};

export const HotelModel: Model<IHotelDocument> =
  mongoose.models.Hotel || mongoose.model<IHotelDocument>('Hotel', HotelSchema);
