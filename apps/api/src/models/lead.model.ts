import { LeadDto, LeadSource, LeadStatus } from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ILeadDocument extends Document {
  leadNumber: string;
  customerId: mongoose.Types.ObjectId;
  destinationId: mongoose.Types.ObjectId;
  packageId?: mongoose.Types.ObjectId;
  tentativeTravelDate?: Date;
  durationNights?: number;
  numberOfAdults: number;
  numberOfChildren: number;
  budgetEstimate?: number;
  specialRequirements?: string;
  source: LeadSource;
  status: LeadStatus;
  assignedAgentId?: mongoose.Types.ObjectId;
  assignedBy?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  lostReason?: string;
  nextFollowUpDate?: Date;
  followUpNotes?: string;
  timeline: Array<{
    _id?: mongoose.Types.ObjectId;
    type: any;
    title: string;
    content?: string;
    actorId?: mongoose.Types.ObjectId;
    actorName?: string;
    createdAt: Date;
  }>;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  toDto(): LeadDto;
}

const LeadSchema = new Schema<ILeadDocument>(
  {
    leadNumber: {
      type: String,
      required: [true, 'Lead number is required'],
      unique: true,
      index: true,
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
      index: true,
    },
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: 'Destination',
      required: [true, 'Destination is required'],
      index: true,
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: 'TourPackage',
      index: true,
    },
    tentativeTravelDate: {
      type: Date,
    },
    durationNights: {
      type: Number,
      min: 1,
    },
    numberOfAdults: {
      type: Number,
      required: true,
      default: 2,
      min: 1,
    },
    numberOfChildren: {
      type: Number,
      default: 0,
      min: 0,
    },
    budgetEstimate: {
      type: Number,
      min: 0,
    },
    specialRequirements: {
      type: String,
      trim: true,
      maxlength: 2000,
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
    status: {
      type: String,
      enum: [
        'NEW',
        'ASSIGNED',
        'CONTACTED',
        'QUOTED',
        'NEGOTIATING',
        'CONVERTED',
        'LOST',
        'JUNK',
      ],
      default: 'NEW',
      required: true,
      index: true,
    },
    assignedAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAt: {
      type: Date,
    },
    lostReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    nextFollowUpDate: {
      type: Date,
      index: true,
    },
    followUpNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    timeline: [
      {
        type: {
          type: String,
          enum: [
            'NOTE',
            'STATUS_CHANGE',
            'ASSIGNMENT',
            'QUOTATION_CREATED',
            'QUOTATION_REVISED',
            'QUOTATION_ACCEPTED',
            'MODIFICATION_REQUESTED',
          ],
          default: 'NOTE',
        },
        title: {
          type: String,
          required: true,
          trim: true,
        },
        content: {
          type: String,
          trim: true,
        },
        actorId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        actorName: {
          type: String,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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

// High-performance compound indexes for CRM filtering and dashboard lookups
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ status: 1, createdAt: -1 });
LeadSchema.index({ assignedAgentId: 1, status: 1 });
LeadSchema.index({ nextFollowUpDate: 1, status: 1 });

LeadSchema.methods.toDto = function (): LeadDto {
  const customer = this.populated('customerId') ? (this.customerId as any) : undefined;
  const destination = this.populated('destinationId') ? (this.destinationId as any) : undefined;
  const assignedAgent = this.populated('assignedAgentId') ? (this.assignedAgentId as any) : undefined;

  return {
    id: this._id ? this._id.toString() : '',
    leadNumber: this.leadNumber,
    customerId: customer ? customer._id.toString() : this.customerId ? this.customerId.toString() : '',
    customerName: customer ? customer.fullName : undefined,
    customerMobile: customer ? customer.mobile : undefined,
    destinationId: destination ? destination._id.toString() : this.destinationId ? this.destinationId.toString() : '',
    destinationName: destination ? destination.name : undefined,
    packageId: this.packageId ? this.packageId.toString() : undefined,
    tentativeTravelDate: this.tentativeTravelDate
      ? (this.tentativeTravelDate instanceof Date ? this.tentativeTravelDate : new Date(this.tentativeTravelDate)).toISOString()
      : undefined,
    durationNights: this.durationNights,
    numberOfAdults: this.numberOfAdults,
    numberOfChildren: this.numberOfChildren,
    budgetEstimate: this.budgetEstimate,
    specialRequirements: this.specialRequirements,
    source: this.source,
    status: this.status,
    assignedAgentId: assignedAgent
      ? assignedAgent._id.toString()
      : this.assignedAgentId
        ? this.assignedAgentId.toString()
        : undefined,
    assignedAgentName: assignedAgent ? assignedAgent.fullName : undefined,
    assignedBy: this.assignedBy ? this.assignedBy.toString() : undefined,
    assignedAt: this.assignedAt
      ? (this.assignedAt instanceof Date ? this.assignedAt : new Date(this.assignedAt)).toISOString()
      : undefined,
    lostReason: this.lostReason,
    nextFollowUpDate: this.nextFollowUpDate
      ? (this.nextFollowUpDate instanceof Date ? this.nextFollowUpDate : new Date(this.nextFollowUpDate)).toISOString()
      : undefined,
    followUpNotes: this.followUpNotes,
    timeline: (this.timeline || []).map((t: any) => ({
      id: t._id ? t._id.toString() : (t.id || ''),
      type: t.type,
      title: t.title,
      content: t.content,
      actorId: t.actorId ? t.actorId.toString() : undefined,
      actorName: t.actorName,
      createdAt: (t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt || Date.now())).toISOString(),
    })),
    createdBy: this.createdBy ? this.createdBy.toString() : '',
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
    updatedAt: (this.updatedAt instanceof Date ? this.updatedAt : new Date()).toISOString(),
  };
};

export const LeadModel: Model<ILeadDocument> =
  mongoose.models.Lead || mongoose.model<ILeadDocument>('Lead', LeadSchema);
