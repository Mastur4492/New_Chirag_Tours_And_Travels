import { SeasonDto, SeasonType } from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISeasonDocument extends Document {
  name: string;
  seasonType: SeasonType;
  destinationId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  priority: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  toDto(): SeasonDto;
}

const SeasonSchema = new Schema<ISeasonDocument>(
  {
    name: {
      type: String,
      required: [true, 'Season name is required'],
      trim: true,
      maxlength: 100,
    },
    seasonType: {
      type: String,
      enum: ['REGULAR', 'PEAK', 'SUPER_PEAK', 'OFF_SEASON', 'FESTIVAL'],
      required: true,
      index: true,
    },
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: 'Destination',
      required: [true, 'Destination ID is required'],
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      index: true,
    },
    priority: {
      type: Number,
      required: true,
      default: 10,
      min: 1,
      max: 100,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for querying seasons by destination and date ranges
SeasonSchema.index({ destinationId: 1, startDate: 1, endDate: 1 });
SeasonSchema.index({ destinationId: 1, priority: -1 });

SeasonSchema.methods.toDto = function (): SeasonDto {
  return {
    id: this._id ? this._id.toString() : '',
    name: this.name,
    seasonType: this.seasonType,
    destinationId: this.destinationId ? this.destinationId.toString() : '',
    startDate: this.startDate instanceof Date ? (this.startDate.toISOString().split('T')[0] || '') : String(this.startDate),
    endDate: this.endDate instanceof Date ? (this.endDate.toISOString().split('T')[0] || '') : String(this.endDate),
    priority: this.priority,
    description: this.description,
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
    updatedAt: (this.updatedAt instanceof Date ? this.updatedAt : new Date()).toISOString(),
  };
};

export const SeasonModel: Model<ISeasonDocument> =
  mongoose.models.Season || mongoose.model<ISeasonDocument>('Season', SeasonSchema);
