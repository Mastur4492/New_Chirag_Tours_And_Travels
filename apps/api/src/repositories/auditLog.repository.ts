import { AuditAction, AuditActorType, AuditEntityType, UserRole } from '@chirag/types';
import mongoose from 'mongoose';
import { AuditLogModel, IAuditLogDocument } from '../models/auditLog.model';
import { logger } from '../utils/logger';

export interface CreateAuditLogParams {
  actorType?: AuditActorType;
  actorId?: string;
  actorRole?: UserRole;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  ipAddress?: string;
  userAgent?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  notes?: string;
}

export class AuditLogRepository {
  async record(params: CreateAuditLogParams): Promise<IAuditLogDocument | null> {
    try {
      const actorType: AuditActorType =
        params.actorType ||
        (params.actorId && params.actorId !== 'PUBLIC_CUSTOMER' && params.actorId !== 'SYSTEM'
          ? 'USER'
          : params.actorId === 'PUBLIC_CUSTOMER'
          ? 'PUBLIC_CUSTOMER'
          : 'SYSTEM');

      let actorObjectId: mongoose.Types.ObjectId | undefined = undefined;
      if (params.actorId && mongoose.Types.ObjectId.isValid(params.actorId)) {
        actorObjectId = new mongoose.Types.ObjectId(params.actorId);
      }

      const log = new AuditLogModel({
        actorType,
        actorId: actorObjectId,
        actorRole: params.actorRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        previousState: params.previousState,
        newState: params.newState,
        notes: params.notes,
      });

      return await log.save();
    } catch (error) {
      // Never crash the primary business transaction if an audit log recording fails, but log it loudly
      logger.error('Failed to write audit log entry:', error, { action: params.action, entityId: params.entityId });
      return null;
    }
  }

  async findQuotationAcceptanceLog(quotationId: string): Promise<IAuditLogDocument | null> {
    return AuditLogModel.findOne({
      entityType: 'QUOTATION',
      entityId: quotationId,
      action: 'QUOTATION_STATUS_UPDATED',
      'newState.status': 'ACCEPTED',
    }).exec();
  }

  async findPaymentActionLog(
    paymentId: string,
    action: AuditAction
  ): Promise<IAuditLogDocument | null> {
    return AuditLogModel.findOne({
      entityType: 'PAYMENT',
      entityId: paymentId,
      action,
    }).exec();
  }

  async findLogs(filter: {
    actorType?: AuditActorType;
    actorId?: string;
    actorRole?: UserRole;
    action?: AuditAction;
    entityType?: AuditEntityType;
    entityId?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    skip?: number;
    limit?: number;
  }): Promise<{ logs: IAuditLogDocument[]; total: number }> {
    const query: Record<string, any> = {};

    if (filter.actorType) {
      query.actorType = filter.actorType;
    }

    if (filter.actorId) {
      if (mongoose.Types.ObjectId.isValid(filter.actorId)) {
        query.actorId = new mongoose.Types.ObjectId(filter.actorId);
      } else {
        query.actorId = filter.actorId;
      }
    }

    if (filter.actorRole) {
      query.actorRole = filter.actorRole;
    }

    if (filter.action) {
      query.action = filter.action;
    }

    if (filter.entityType) {
      query.entityType = filter.entityType;
    }

    if (filter.entityId) {
      query.entityId = { $regex: filter.entityId.trim(), $options: 'i' };
    }

    if (filter.startDate || filter.endDate) {
      query.timestamp = {};
      if (filter.startDate) {
        query.timestamp.$gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        query.timestamp.$lte = new Date(filter.endDate);
      }
    }

    const skip = filter.skip || 0;
    const limit = Math.min(filter.limit || 50, 100);

    const [logs, total] = await Promise.all([
      AuditLogModel.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).exec(),
      AuditLogModel.countDocuments(query).exec(),
    ]);

    return { logs, total };
  }
}

export const auditLogRepository = new AuditLogRepository();
