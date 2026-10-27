import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITransportScheduleLockDocument extends Document {
  resourceType: 'VEHICLE' | 'DRIVER';
  resourceId: mongoose.Types.ObjectId;
  dateStr: string; // YYYY-MM-DD in Asia/Kolkata (IST)
  slotType: 'FULL_DAY';
  assignmentId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  bookingNumber: string;
  reservationIntentId: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransportScheduleLockSchema = new Schema<ITransportScheduleLockDocument>(
  {
    resourceType: {
      type: String,
      enum: ['VEHICLE', 'DRIVER'],
      required: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    dateStr: {
      type: String,
      required: true,
    },
    slotType: {
      type: String,
      enum: ['FULL_DAY'],
      default: 'FULL_DAY',
      required: true,
    },
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'TransportAssignment',
      required: true,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    bookingNumber: {
      type: String,
      required: true,
      trim: true,
    },
    reservationIntentId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index: Strictly one assignment can hold a resource for a calendar slot
TransportScheduleLockSchema.index(
  { resourceType: 1, resourceId: 1, dateStr: 1, slotType: 1 },
  { unique: true }
);

export const TransportScheduleLockModel: Model<ITransportScheduleLockDocument> =
  mongoose.models.TransportScheduleLock ||
  mongoose.model<ITransportScheduleLockDocument>(
    'TransportScheduleLock',
    TransportScheduleLockSchema
  );
