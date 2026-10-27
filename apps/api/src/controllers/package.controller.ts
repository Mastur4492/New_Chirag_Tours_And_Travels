import { ApiResponse, TourPackageDto } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { tourPackageService } from '../services/package.service';

export class TourPackageController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await tourPackageService.createPackage(req.body, actor);

      const response: ApiResponse<TourPackageDto> = {
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

      const result = await tourPackageService.updatePackage(
        req.params.id as string,
        req.body,
        actor
      );

      const response: ApiResponse<TourPackageDto> = {
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

  async togglePublish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const { isPublished } = req.body;
      const result = await tourPackageService.togglePublish(
        req.params.id as string,
        isPublished,
        actor
      );

      const response: ApiResponse<TourPackageDto> = {
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
      const result = await tourPackageService.getPackageById(req.params.id as string, req.user?.role);

      const response: ApiResponse<TourPackageDto> = {
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
      const result = await tourPackageService.getPackageBySlug(req.params.slug as string, req.user?.role);

      const response: ApiResponse<TourPackageDto> = {
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
      const destinationId = req.query.destinationId as string | undefined;
      const isPublished =
        req.query.isPublished !== undefined ? req.query.isPublished === 'true' : undefined;
      const search = req.query.search as string | undefined;

      const result = await tourPackageService.listPackages({
        page,
        limit,
        destinationId,
        isPublished,
        search,
        callerRole: req.user?.role,
      });

      const response: ApiResponse<TourPackageDto[]> = {
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

export const tourPackageController = new TourPackageController();
