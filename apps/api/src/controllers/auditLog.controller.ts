import { ApiResponse, AuditAction, AuditActorType, AuditEntityType, AuditLogDto, UserRole } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { auditLogRepository } from '../repositories/auditLog.repository';

export class AuditLogController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const actorType = req.query.actorType as AuditActorType | undefined;
      const actorId = req.query.actorId as string | undefined;
      const actorRole = req.query.actorRole as UserRole | undefined;
      const action = req.query.action as AuditAction | undefined;
      const entityType = req.query.entityType as AuditEntityType | undefined;
      const entityId = req.query.entityId as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const { logs, total } = await auditLogRepository.findLogs({
        actorType,
        actorId,
        actorRole,
        action,
        entityType,
        entityId,
        startDate,
        endDate,
        skip: (page - 1) * limit,
        limit,
      });

      const response: ApiResponse<AuditLogDto[]> = {
        success: true,
        data: logs.map((log) => log.toDto()),
        error: null,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const auditLogController = new AuditLogController();
