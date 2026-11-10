import { MealPlan, RoomCategoryDto } from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IRoomCategoryDocument extends Document {
  hotelId: mongoose.Types.ObjectId;
  name: string;
  baseOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  extraBedSupported: boolean;
  maxExtraBeds: number;
  extraBedPricePerNight?: number;
  allowedMealPlans: MealPlan[];
  pricePerNight?: number;
  totalRooms?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  toDto(): RoomCategoryDto;
}

const RoomCategorySchema = new Schema<IRoomCategoryDocument>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: [true, 'Hotel ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Room category name is required'],
      trim: true,
      maxlength: 100,
    },
    baseOccupancy: {
      type: Number,
      default: 2,
      min: 1,
      max: 10,
    },
    maxAdults: {
      type: Number,
      default: 3,
      min: 1,
      max: 15,
    },
    maxChildren: {
      type: Number,
      default: 2,
      min: 0,
      max: 10,
    },
    extraBedSupported: {
      type: Boolean,
      default: true,
    },
    maxExtraBeds: {
      type: Number,
      default: 1,
      min: 0,
      max: 5,
    },
    allowedMealPlans: {
      type: [String],
      enum: ['RO', 'CP', 'MAP', 'AP'],
      default: ['RO', 'CP', 'MAP', 'AP'],
    },
    pricePerNight: {
      type: Number,
      min: 0,
      default: 0,
    },
    extraBedPricePerNight: {
      type: Number,
      min: 0,
      default: 1200,
    },
    totalRooms: {
      type: Number,
      min: 0,
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

// Compound uniqueness: Room category names within the same hotel must be unique
RoomCategorySchema.index({ hotelId: 1, name: 1 }, { unique: true });

RoomCategorySchema.methods.toDto = function (): RoomCategoryDto {
  return {
    id: this._id ? this._id.toString() : '',
    hotelId: this.hotelId ? this.hotelId.toString() : '',
    name: this.name,
    baseOccupancy: this.baseOccupancy,
    maxAdults: this.maxAdults,
    maxChildren: this.maxChildren,
    extraBedSupported: this.extraBedSupported,
    maxExtraBeds: this.maxExtraBeds,
    allowedMealPlans: this.allowedMealPlans,
    pricePerNight: this.pricePerNight || 0,
    extraBedPricePerNight: this.extraBedPricePerNight ?? 1200,
    totalRooms: this.totalRooms,
    isActive: this.isActive,
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
    updatedAt: (this.updatedAt instanceof Date ? this.updatedAt : new Date()).toISOString(),
  };
};

export const RoomCategoryModel: Model<IRoomCategoryDocument> =
  mongoose.models.RoomCategory ||
  mongoose.model<IRoomCategoryDocument>('RoomCategory', RoomCategorySchema);
