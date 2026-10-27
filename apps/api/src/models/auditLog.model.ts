import { AuditAction, AuditActorType, AuditEntityType, AuditLogDto, UserRole } from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAuditLogDocument extends Document {
  actorType: AuditActorType;
  actorId?: mongoose.Types.ObjectId;
  actorRole?: UserRole;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  ipAddress?: string;
  userAgent?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  notes?: string;
  timestamp: Date;
  toDto(): AuditLogDto;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    actorType: {
      type: String,
      enum: ['USER', 'PUBLIC_CUSTOMER', 'SYSTEM'],
      default: 'USER',
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    actorRole: {
      type: String,
      required: false,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    previousState: { type: Schema.Types.Mixed },
    newState: { type: Schema.Types.Mixed },
    notes: { type: String },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

AuditLogSchema.methods.toDto = function (): AuditLogDto {
  return {
    id: this._id.toString(),
    actorType: this.actorType || 'USER',
    actorId: this.actorId ? this.actorId.toString() : undefined,
    actorRole: this.actorRole,
    action: this.action,
    entityType: this.entityType,
    entityId: this.entityId,
    ipAddress: this.ipAddress,
    userAgent: this.userAgent,
    previousState: this.previousState,
    newState: this.newState,
    notes: this.notes,
    timestamp: this.timestamp.toISOString(),
  };
};

export const AuditLogModel: Model<IAuditLogDocument> =
  mongoose.models.AuditLog || mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);
