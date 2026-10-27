import { ApiResponse, DestinationDto } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { destinationService } from '../services/destination.service';

export class DestinationController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await destinationService.createDestination(req.body, actor);

      const response: ApiResponse<DestinationDto> = {
        success: true,
        data: result,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await destinationService.updateDestination(req.params.id as string, req.body, actor);

      const response: ApiResponse<DestinationDto> = {
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

  async toggleStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const { isActive } = req.body;
      const result = await destinationService.toggleDestinationStatus(
        req.params.id as string,
        isActive,
        actor
      );

      const response: ApiResponse<DestinationDto> = {
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

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await destinationService.getDestinationById(req.params.id as string);

      const response: ApiResponse<DestinationDto> = {
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

  async getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await destinationService.getDestinationBySlug(req.params.slug as string);

      const response: ApiResponse<DestinationDto> = {
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

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const search = req.query.search as string | undefined;
      const region = req.query.region as any;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

      const result = await destinationService.listDestinations({
        page,
        limit,
        search,
        region,
        isActive,
      });

      const response: ApiResponse<DestinationDto[]> = {
        success: true,
        data: result.items,
        error: null,
        meta: {
          page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const destinationController = new DestinationController();
