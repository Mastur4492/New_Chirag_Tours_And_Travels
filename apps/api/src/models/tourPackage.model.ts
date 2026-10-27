import {
  ItineraryDayDto,
  MealPlan,
  TourPackageDto,
  VehicleCategory,
} from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITourPackageDocument extends Document {
  title: string;
  slug: string;
  destinationId: mongoose.Types.ObjectId;
  durationNights: number;
  durationDays: number;
  overview?: string;
  dayWiseItinerary: ItineraryDayDto[];
  inclusions: string[];
  exclusions: string[];
  termsAndConditions: string[];
  cancellationPolicy: string[];
  featuredImage?: string;
  galleryImages: string[];
  defaultMealPlan?: MealPlan;
  defaultVehicleCategory?: VehicleCategory;
  startingPrice?: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  toDto(): TourPackageDto;
}

const ItineraryDaySchema = new Schema<ItineraryDayDto>(
  {
    dayNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    nightStayDestination: { type: String, required: true, trim: true },
    mealsIncluded: { type: [String], default: [] },
    activities: { type: [String], default: [] },
  },
  { _id: false }
);

const TourPackageSchema = new Schema<ITourPackageDocument>(
  {
    title: {
      type: String,
      required: [true, 'Tour package title is required'],
      trim: true,
      maxlength: 150,
      index: true,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: 'Destination',
      required: [true, 'Destination ID is required'],
      index: true,
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
    overview: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    dayWiseItinerary: {
      type: [ItineraryDaySchema],
      required: true,
      validate: [
        (val: ItineraryDayDto[]) => val.length > 0,
        'At least one itinerary day is required',
      ],
    },
    inclusions: { type: [String], default: [] },
    exclusions: { type: [String], default: [] },
    termsAndConditions: { type: [String], default: [] },
    cancellationPolicy: { type: [String], default: [] },
    featuredImage: { type: String },
    galleryImages: { type: [String], default: [] },
    defaultMealPlan: {
      type: String,
      enum: ['RO', 'CP', 'MAP', 'AP'],
    },
    defaultVehicleCategory: {
      type: String,
      enum: ['HATCHBACK', 'SEDAN', 'SUV', 'PREMIUM_SUV', 'TEMPO_TRAVELLER', 'BUS'],
    },
    startingPrice: {
      type: Number,
      min: 0,
    },
    isPublished: {
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

TourPackageSchema.index({ destinationId: 1, isPublished: 1 });

TourPackageSchema.methods.toDto = function (): TourPackageDto {
  return {
    id: this._id ? this._id.toString() : '',
    title: this.title,
    slug: this.slug,
    destinationId: this.destinationId ? this.destinationId.toString() : '',
    durationNights: this.durationNights,
    durationDays: this.durationDays,
    overview: this.overview,
    dayWiseItinerary: this.dayWiseItinerary || [],
    inclusions: this.inclusions || [],
    exclusions: this.exclusions || [],
    termsAndConditions: this.termsAndConditions || [],
    cancellationPolicy: this.cancellationPolicy || [],
    featuredImage: this.featuredImage,
    galleryImages: this.galleryImages || [],
    defaultMealPlan: this.defaultMealPlan,
    defaultVehicleCategory: this.defaultVehicleCategory,
    startingPrice: this.startingPrice,
    isPublished: this.isPublished,
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
    updatedAt: (this.updatedAt instanceof Date ? this.updatedAt : new Date()).toISOString(),
  };
};

export const TourPackageModel: Model<ITourPackageDocument> =
  mongoose.models.TourPackage ||
  mongoose.model<ITourPackageDocument>('TourPackage', TourPackageSchema);
