import mongoose, { Document, Model, Schema } from 'mongoose';
import { NotificationDto, NotificationType } from '@chirag/types';

export interface INotificationDocument extends Document {
  recipientUserId?: mongoose.Types.ObjectId;
  recipientRole?: 'ADMIN' | 'AGENT';
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  entityType?: 'LEAD' | 'BOOKING' | 'QUOTATION';
  entityId?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  readBy?: Array<{
    userId: mongoose.Types.ObjectId;
    readAt: Date;
  }>;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  toDto(currentUserId?: string): NotificationDto;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    recipientRole: {
      type: String,
      enum: ['ADMIN', 'AGENT'],
      index: true,
    },
    type: {
      type: String,
      enum: [
        'NEW_CUSTOMER_ENQUIRY',
        'LEAD_ASSIGNED',
        'LEAD_STATUS_CHANGED',
        'BOOKING_CONFIRMED',
        'QUOTATION_ACCEPTED',
        'GENERAL',
      ],
      default: 'GENERAL',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    link: {
      type: String,
      trim: true,
    },
    entityType: {
      type: String,
      enum: ['LEAD', 'BOOKING', 'QUOTATION'],
    },
    entityId: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readBy: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// High-performance compound indexes for user inbox lookups
NotificationSchema.index({ recipientUserId: 1, createdAt: -1 });
NotificationSchema.index({ recipientRole: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });

NotificationSchema.methods.toDto = function (currentUserId?: string): NotificationDto {
  let isUserRead = this.isRead;
  if (currentUserId && this.readBy && this.readBy.length > 0) {
    const readEntry = this.readBy.find((r: any) => r.userId?.toString() === currentUserId);
    if (readEntry) {
      isUserRead = true;
    }
  }

  return {
    id: this._id ? this._id.toString() : '',
    recipientUserId: this.recipientUserId ? this.recipientUserId.toString() : undefined,
    recipientRole: this.recipientRole,
    type: this.type,
    title: this.title,
    message: this.message,
    link: this.link,
    entityType: this.entityType,
    entityId: this.entityId,
    metadata: this.metadata,
    isRead: isUserRead,
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
    readAt: this.readAt ? (this.readAt instanceof Date ? this.readAt : new Date(this.readAt)).toISOString() : undefined,
  };
};

export const NotificationModel: Model<INotificationDocument> =
  mongoose.models.Notification || mongoose.model<INotificationDocument>('Notification', NotificationSchema);
