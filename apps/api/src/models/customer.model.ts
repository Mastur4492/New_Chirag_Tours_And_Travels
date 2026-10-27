import { CustomerDto, LeadSource } from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICustomerDocument extends Document {
  fullName: string;
  mobile: string;
  email?: string;
  city?: string;
  state?: string;
  notes?: string;
  source: LeadSource;
  assignedAgentId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  toDto(): CustomerDto;
}

const CustomerSchema = new Schema<ICustomerDocument>(
  {
    fullName: {
      type: String,
      required: [true, 'Customer full name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
      index: true,
    },
    mobile: {
      type: String,
      required: [true, 'Customer mobile is required'],
      trim: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    source: {
      type: String,
      enum: [
        'ADMIN_DIRECT',
        'CUSTOMER_WEB',
        'CUSTOMER_APP',
        'AGENT',
        'PHONE',
        'WALK_IN',
        'OTHER',
      ],
      default: 'ADMIN_DIRECT',
      required: true,
      index: true,
    },
    assignedAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

CustomerSchema.methods.toDto = function (): CustomerDto {
  return {
    id: this._id ? this._id.toString() : '',
    fullName: this.fullName,
    mobile: this.mobile,
    email: this.email,
    city: this.city,
    state: this.state,
    notes: this.notes,
    source: this.source,
    assignedAgentId: this.assignedAgentId ? this.assignedAgentId.toString() : undefined,
    createdBy: this.createdBy ? this.createdBy.toString() : '',
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
    updatedAt: (this.updatedAt instanceof Date ? this.updatedAt : new Date()).toISOString(),
  };
};

export const CustomerModel: Model<ICustomerDocument> =
  mongoose.models.Customer || mongoose.model<ICustomerDocument>('Customer', CustomerSchema);
