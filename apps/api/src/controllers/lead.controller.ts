import { ApiResponse, LeadDto, LeadStatus } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { leadService } from '../services/lead.service';

export class LeadController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await leadService.createLead(req.body, actor);

      const response: ApiResponse<LeadDto> = {
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

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await leadService.getLeadById(req.params.id as string, actor);

      const response: ApiResponse<LeadDto> = {
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

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await leadService.updateLead(req.params.id as string, req.body, actor);

      const response: ApiResponse<LeadDto> = {
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

  async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await leadService.assignLead(req.params.id as string, req.body, actor);

      const response: ApiResponse<LeadDto> = {
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
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const search = req.query.search as string | undefined;
      const status = req.query.status as LeadStatus | undefined;
      const destinationId = req.query.destinationId as string | undefined;
      const assignedAgentId = req.query.assignedAgentId as string | undefined;
      const customerId = req.query.customerId as string | undefined;

      const { leads, total } = await leadService.listLeads(
        {
          search,
          status,
          destinationId,
          assignedAgentId,
          customerId,
          skip: (page - 1) * limit,
          limit,
        },
        actor
      );

      const response: ApiResponse<LeadDto[]> = {
        success: true,
        data: leads,
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
  async addActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await leadService.addActivity(req.params.id as string, req.body, actor);

      const response: ApiResponse<LeadDto> = {
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

  async updateFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await leadService.updateFollowUp(req.params.id as string, req.body, actor);

      const response: ApiResponse<LeadDto> = {
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

  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const agentId = req.query.agentId as string | undefined;
      const metrics = await leadService.getMetrics(actor, agentId);

      const response: ApiResponse<typeof metrics> = {
        success: true,
        data: metrics,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async createPublicEnquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await leadService.createPublicEnquiry(req.body, context);

      const response: ApiResponse<typeof result> = {
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
}

export const leadController = new LeadController();
