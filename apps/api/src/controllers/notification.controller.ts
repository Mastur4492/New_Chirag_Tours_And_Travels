import { ApiResponse, NotificationDto, ListNotificationsResponse } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { notificationService } from '../services/notification.service';

export class NotificationController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
      const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await notificationService.listNotifications(actor, { limit, skip, unreadOnly });

      const response: ApiResponse<ListNotificationsResponse> = {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await notificationService.getUnreadCount(actor);

      const response: ApiResponse<{ unreadCount: number }> = {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await notificationService.markAsRead(req.params.id as string, actor);

      const response: ApiResponse<NotificationDto> = {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await notificationService.markAllAsRead(actor);

      const response: ApiResponse<{ success: boolean }> = {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
