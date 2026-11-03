import { AuditAction, AuditActorType, AuditEntityType, UserRole } from '@chirag/types';
import { auditLogRepository } from '../../repositories/auditLog.repository';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/appError';

export enum AiAuditLevel {
  NONE = 'NONE',
  STANDARD = 'STANDARD',
  CRITICAL_MUTATION = 'CRITICAL_MUTATION',
}

export interface AiMutationAuditParams {
  sessionId: string;
  actorType: AuditActorType;
  actorId?: string;
  actorRole?: UserRole;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  strictAudit?: boolean; // If true, failure to record audit log will abort the mutation
}

export class AiAuditPolicy {
  /**
   * Records an audit log for an AI-triggered operation.
   * For critical mutations (e.g. lead reassignment, stage change), enforces reliable write policy.
   */
  static async recordAiAction(params: AiMutationAuditParams): Promise<void> {
    const isCritical = params.strictAudit ?? false;

    try {
      const sanitizedArgs = { ...params.args };
      // Strip any potential sensitive tokens or passwords
      delete (sanitizedArgs as any).password;
      delete (sanitizedArgs as any).token;

      const recordResult = await auditLogRepository.record({
        actorType: params.actorType,
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        notes: `Executed autonomously via AI Copilot [Tool: ${params.toolName}, Session: ${params.sessionId}]`,
        newState: {
          toolName: params.toolName,
          args: sanitizedArgs,
          result: params.result,
        },
      });

      if (!recordResult && isCritical) {
        logger.error('CRITICAL: Audit log recording returned null for critical AI action', {
          action: params.action,
          toolName: params.toolName,
          entityId: params.entityId,
        });
        throw AppError.internal('Audit system verification failed. Critical mutation was rolled back for security.');
      }
    } catch (error) {
      logger.error('AI Audit Policy Failure:', error, {
        action: params.action,
        toolName: params.toolName,
        sessionId: params.sessionId,
      });

      if (isCritical) {
        if (error instanceof AppError) throw error;
        throw AppError.internal('Failed to persist mandatory audit log for AI mutation. Action aborted.');
      }
    }
  }
}

