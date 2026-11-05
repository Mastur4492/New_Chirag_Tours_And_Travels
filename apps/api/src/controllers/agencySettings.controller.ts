import { ApiResponse, AgencySettingsDto } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { agencySettingsService } from '../services/agencySettings.service';

export class AgencySettingsController {
  async getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await agencySettingsService.getSettings();
      const response: ApiResponse<AgencySettingsDto> = {
        success: true,
        data: settings,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await agencySettingsService.updateSettings(req.body);
      const response: ApiResponse<AgencySettingsDto> = {
        success: true,
        data: updated,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const agencySettingsController = new AgencySettingsController();

