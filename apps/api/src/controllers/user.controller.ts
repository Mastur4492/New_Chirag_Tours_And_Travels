import { ApiResponse, UserDto } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { userService } from '../services/user.service';

export class UserController {
  async createAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const agent = await userService.createAgent(req.body, adminId, ipAddress, userAgent);

      const response: ApiResponse<UserDto> = {
        success: true,
        data: agent,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateAgentPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const agentId = req.params.id as string;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const updatedAgent = await userService.updateAgentPermissions(
        agentId,
        req.body,
        adminId,
        ipAddress,
        userAgent
      );

      const response: ApiResponse<UserDto> = {
        success: true,
        data: updatedAgent,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async listAgents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const search = req.query.search as string | undefined;
      const status = req.query.status as any;

      const result = await userService.listAgents({
        page,
        limit,
        search,
        status,
      });

      const response: ApiResponse<UserDto[]> = {
        success: true,
        data: result.agents,
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

  async getAgentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const agentId = req.params.id as string;
      const agent = await userService.getUserById(agentId);

      const response: ApiResponse<UserDto> = {
        success: true,
        data: agent,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateAgentProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const agentId = req.params.id as string;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const updatedAgent = await userService.updateAgentProfile(
        agentId,
        req.body,
        adminId,
        ipAddress,
        userAgent
      );

      const response: ApiResponse<UserDto> = {
        success: true,
        data: updatedAgent,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateAgentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const agentId = req.params.id as string;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const updatedAgent = await userService.updateAgentStatus(
        agentId,
        req.body.status,
        adminId,
        ipAddress,
        userAgent
      );

      const response: ApiResponse<UserDto> = {
        success: true,
        data: updatedAgent,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async resetAgentPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const agentId = req.params.id as string;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const updatedAgent = await userService.resetAgentPassword(
        agentId,
        req.body.password,
        adminId,
        ipAddress,
        userAgent
      );

      const response: ApiResponse<UserDto> = {
        success: true,
        data: updatedAgent,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
