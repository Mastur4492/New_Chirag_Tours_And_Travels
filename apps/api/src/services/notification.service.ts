import { Types } from 'mongoose';
import { NotificationDto, ListNotificationsResponse, NotificationType } from '@chirag/types';
import { notificationRepository } from '../repositories/notification.repository';
import { AppError } from '../utils/appError';
import { realtimeService } from './realtime.service';

export interface ActorContext {
  userId: string;
  role: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateNotificationInput {
  recipientUserId?: string;
  recipientRole?: 'ADMIN' | 'AGENT';
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  entityType?: 'LEAD' | 'BOOKING' | 'QUOTATION';
  entityId?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  async createNotification(input: CreateNotificationInput): Promise<NotificationDto> {
    const doc = await notificationRepository.create({
      recipientUserId: input.recipientUserId && Types.ObjectId.isValid(input.recipientUserId)
        ? new Types.ObjectId(input.recipientUserId)
        : undefined,
      recipientRole: input.recipientRole,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata || {},
    });

    const dto = doc.toDto(input.recipientUserId);

    // Instant real-time broadcast via SSE
    realtimeService.broadcast({
      type: 'NOTIFICATION',
      recipientRole: input.recipientRole || (input.recipientUserId ? undefined : 'ALL'),
      recipientUserId: input.recipientUserId,
      title: input.title,
      message: input.message,
      data: dto,
    });

    return dto;
  }

  async listNotifications(
    actor: ActorContext,
    options: { limit?: number; unreadOnly?: boolean; skip?: number } = {}
  ): Promise<ListNotificationsResponse> {
    const role = actor.role === 'ADMIN' ? 'ADMIN' : 'AGENT';
    const { notifications, total, unreadCount } = await notificationRepository.findForUser(
      actor.userId,
      role,
      options
    );

    return {
      notifications: notifications.map((n) => n.toDto(actor.userId)),
      unreadCount,
      total,
    };
  }

  async markAsRead(notificationId: string, actor: ActorContext): Promise<NotificationDto> {
    const updated = await notificationRepository.markAsRead(notificationId, actor.userId);
    if (!updated) {
      throw AppError.notFound('Notification not found');
    }
    return updated.toDto(actor.userId);
  }

  async markAllAsRead(actor: ActorContext): Promise<{ success: boolean }> {
    const role = actor.role === 'ADMIN' ? 'ADMIN' : 'AGENT';
    await notificationRepository.markAllAsRead(actor.userId, role);
    return { success: true };
  }

  async getUnreadCount(actor: ActorContext): Promise<{ unreadCount: number }> {
    const role = actor.role === 'ADMIN' ? 'ADMIN' : 'AGENT';
    const unreadCount = await notificationRepository.getUnreadCount(actor.userId, role);
    return { unreadCount };
  }
}

export const notificationService = new NotificationService();
