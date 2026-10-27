import { ApiResponse, TaxConfigDto } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { taxConfigService } from '../services/taxConfig.service';

export class TaxConfigController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await taxConfigService.createTaxRule(req.body, actor);

      const response: ApiResponse<TaxConfigDto> = {
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

      const result = await taxConfigService.updateTaxRule(req.params.id as string, req.body, actor);

      const response: ApiResponse<TaxConfigDto> = {
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
      const result = await taxConfigService.getTaxRuleById(req.params.id as string);

      const response: ApiResponse<TaxConfigDto> = {
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

  async getDefault(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await taxConfigService.getDefaultTaxRule();

      const response: ApiResponse<TaxConfigDto | null> = {
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
      const isApplicable =
        req.query.isApplicable !== undefined ? req.query.isApplicable === 'true' : undefined;
      const jurisdiction = req.query.jurisdiction as string | undefined;

      const result = await taxConfigService.listTaxRules({ isApplicable, jurisdiction });

      const response: ApiResponse<TaxConfigDto[]> = {
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

export const taxConfigController = new TaxConfigController();
