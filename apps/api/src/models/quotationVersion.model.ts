import { QuotationDto, QuotationVersionDto } from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IQuotationVersionDocument extends Document {
  quotationId: mongoose.Types.ObjectId;
  versionNumber: number;
  changeReason?: string;
  snapshot: QuotationDto;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  toDto(): QuotationVersionDto;
}

const QuotationVersionSchema = new Schema<IQuotationVersionDocument>(
  {
    quotationId: {
      type: Schema.Types.ObjectId,
      ref: 'Quotation',
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    changeReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    snapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

QuotationVersionSchema.index({ quotationId: 1, versionNumber: 1 }, { unique: true });

QuotationVersionSchema.methods.toDto = function (): QuotationVersionDto {
  return {
    id: this._id ? this._id.toString() : '',
    quotationId: this.quotationId ? this.quotationId.toString() : '',
    versionNumber: this.versionNumber,
    changeReason: this.changeReason,
    snapshot: this.snapshot,
    createdBy: this.createdBy ? this.createdBy.toString() : '',
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
  };
};

export const QuotationVersionModel: Model<IQuotationVersionDocument> =
  mongoose.models.QuotationVersion ||
  mongoose.model<IQuotationVersionDocument>('QuotationVersion', QuotationVersionSchema);
