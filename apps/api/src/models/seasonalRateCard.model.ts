import { MealPlan, SeasonalRateCardDto } from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISeasonalRateCardDocument extends Document {
  hotelId: mongoose.Types.ObjectId;
  roomCategoryId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;
  mealPlan: MealPlan;
  baseCostPerNight: number;
  extraAdultBedCost: number;
  childWithBedCost: number;
  childWithoutBedCost: number;
  standardSellingPrice: number;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  toDto(options?: { includeSupplierCost?: boolean }): SeasonalRateCardDto;
}

const SeasonalRateCardSchema = new Schema<ISeasonalRateCardDocument>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: [true, 'Hotel ID is required'],
      index: true,
    },
    roomCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'RoomCategory',
      required: [true, 'Room category ID is required'],
      index: true,
    },
    seasonId: {
      type: Schema.Types.ObjectId,
      ref: 'Season',
      required: [true, 'Season ID is required'],
      index: true,
    },
    mealPlan: {
      type: String,
      enum: ['RO', 'CP', 'MAP', 'AP'],
      required: true,
      index: true,
    },
    baseCostPerNight: {
      type: Number,
      required: [true, 'Base cost per night is required'],
      min: [0, 'Base cost must be non-negative'],
    },
    extraAdultBedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    childWithBedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    childWithoutBedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    standardSellingPrice: {
      type: Number,
      required: [true, 'Standard selling price is required'],
      min: [0, 'Standard selling price must be non-negative'],
    },
    validFrom: {
      type: Date,
      required: [true, 'Valid from date is required'],
      index: true,
    },
    validTo: {
      type: Date,
      required: [true, 'Valid to date is required'],
      index: true,
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

// Compound indexes for looking up rate cards by hotel, room, season, meal plan
SeasonalRateCardSchema.index(
  { hotelId: 1, roomCategoryId: 1, seasonId: 1, mealPlan: 1 },
  { unique: true }
);
SeasonalRateCardSchema.index({ hotelId: 1, validFrom: 1, validTo: 1, isActive: 1 });

SeasonalRateCardSchema.methods.toDto = function (
  options = { includeSupplierCost: true }
): SeasonalRateCardDto {
  const includeCost = options.includeSupplierCost !== false;
  return {
    id: this._id ? this._id.toString() : '',
    hotelId: this.hotelId ? this.hotelId.toString() : '',
    roomCategoryId: this.roomCategoryId ? this.roomCategoryId.toString() : '',
    seasonId: this.seasonId ? this.seasonId.toString() : '',
    mealPlan: this.mealPlan,
    baseCostPerNight: includeCost ? this.baseCostPerNight : 0,
    extraAdultBedCost: includeCost ? this.extraAdultBedCost : 0,
    childWithBedCost: includeCost ? this.childWithBedCost : 0,
    childWithoutBedCost: includeCost ? this.childWithoutBedCost : 0,
    standardSellingPrice: this.standardSellingPrice,
    validFrom: this.validFrom instanceof Date ? (this.validFrom.toISOString().split('T')[0] || '') : String(this.validFrom),
    validTo: this.validTo instanceof Date ? (this.validTo.toISOString().split('T')[0] || '') : String(this.validTo),
    isActive: this.isActive,
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
    updatedAt: (this.updatedAt instanceof Date ? this.updatedAt : new Date()).toISOString(),
  };
};

export const SeasonalRateCardModel: Model<ISeasonalRateCardDocument> =
  mongoose.models.SeasonalRateCard ||
  mongoose.model<ISeasonalRateCardDocument>('SeasonalRateCard', SeasonalRateCardSchema);
