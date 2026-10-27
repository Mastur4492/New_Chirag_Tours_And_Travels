import { DestinationDto, DestinationRegion } from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IDestinationDocument extends Document {
  name: string;
  slug: string;
  country: string;
  state?: string;
  region: DestinationRegion;
  description?: string;
  coverImages: string[];
  highlights: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  toDto(): DestinationDto;
}

const DestinationSchema = new Schema<IDestinationDocument>(
  {
    name: {
      type: String,
      required: [true, 'Destination name is required'],
      trim: true,
      maxlength: 100,
      unique: true,
      index: true,
    },
    slug: {
      type: String,
      required: [true, 'Destination slug is required'],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    country: {
      type: String,
      required: true,
      default: 'India',
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    region: {
      type: String,
      enum: [
        'NORTH',
        'SOUTH',
        'EAST',
        'WEST',
        'CENTRAL',
        'NORTH_EAST',
        'ISLANDS',
        'INTERNATIONAL',
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    coverImages: {
      type: [String],
      default: [],
    },
    highlights: {
      type: [String],
      default: [],
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

DestinationSchema.methods.toDto = function (): DestinationDto {
  return {
    id: this._id ? this._id.toString() : '',
    name: this.name,
    slug: this.slug,
    country: this.country,
    state: this.state,
    region: this.region,
    description: this.description,
    coverImages: this.coverImages,
    highlights: this.highlights,
    isActive: this.isActive,
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
    updatedAt: (this.updatedAt instanceof Date ? this.updatedAt : new Date()).toISOString(),
  };
};

export const DestinationModel: Model<IDestinationDocument> =
  mongoose.models.Destination || mongoose.model<IDestinationDocument>('Destination', DestinationSchema);
