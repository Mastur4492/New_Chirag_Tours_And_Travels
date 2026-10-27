import { TaxConfigDto, TaxConfigType } from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITaxConfigDocument extends Document {
  name: string;
  taxType: TaxConfigType;
  ratePercent: number;
  isApplicable: boolean;
  jurisdiction: string;
  description?: string;
  isDefault: boolean;
  isConfirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
  toDto(): TaxConfigDto;
}

const TaxConfigSchema = new Schema<ITaxConfigDocument>(
  {
    name: {
      type: String,
      required: [true, 'Tax rule name is required'],
      trim: true,
      maxlength: 100,
      unique: true,
      index: true,
    },
    taxType: {
      type: String,
      enum: ['GST', 'VAT', 'CUSTOM', 'ZERO_RATED', 'EXEMPT'],
      default: 'GST',
      index: true,
    },
    ratePercent: {
      type: Number,
      required: [true, 'Tax rate percent is required'],
      min: [0, 'Rate cannot be negative'],
      max: [100, 'Rate cannot exceed 100'],
    },
    isApplicable: {
      type: Boolean,
      default: true,
      index: true,
    },
    jurisdiction: {
      type: String,
      default: 'IN',
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    isConfirmed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

TaxConfigSchema.methods.toDto = function (): TaxConfigDto {
  return {
    id: this._id ? this._id.toString() : '',
    name: this.name,
    taxType: this.taxType,
    ratePercent: this.ratePercent,
    isApplicable: this.isApplicable,
    jurisdiction: this.jurisdiction,
    description: this.description,
    isDefault: this.isDefault,
    isConfirmed: Boolean(this.isConfirmed),
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
    updatedAt: (this.updatedAt instanceof Date ? this.updatedAt : new Date()).toISOString(),
  };
};


export const TaxConfigModel: Model<ITaxConfigDocument> =
  mongoose.models.TaxConfig ||
  mongoose.model<ITaxConfigDocument>('TaxConfig', TaxConfigSchema);
