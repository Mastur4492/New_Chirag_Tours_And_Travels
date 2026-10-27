import { ApiResponse, SeasonDto, SeasonType } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { seasonService } from '../services/season.service';

export class SeasonController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await seasonService.createSeason(req.body, actor);

      const response: ApiResponse<SeasonDto> = {
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

      const result = await seasonService.updateSeason(req.params.id as string, req.body, actor);

      const response: ApiResponse<SeasonDto> = {
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

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      await seasonService.deleteSeason(req.params.id as string, actor);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Season deleted successfully' },
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
      const result = await seasonService.getSeasonById(req.params.id as string);

      const response: ApiResponse<SeasonDto> = {
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
      const seasonType = req.query.seasonType as any;

      const result = await seasonService.listSeasons({
        page,
        limit,
        destinationId,
        seasonType,
      });

      const response: ApiResponse<SeasonDto[]> = {
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

  async resolveSeason(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const destinationId = (req.query.destinationId as string) || '';
      const date = (req.query.date as string) || (new Date().toISOString().split('T')[0] || '');

      const resolvedSeason = await seasonService.resolveSeasonForDate(destinationId, date);

      const response: ApiResponse<{ seasonType: SeasonType; date: string }> = {
        success: true,
        data: { seasonType: resolvedSeason, date },
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const seasonController = new SeasonController();
