import {
  ApiResponse,
  DriverDto,
  TransportTariffDto,
  VehicleDto,
  VehicleVendorDto,
} from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { transportService } from '../services/transport.service';

export class TransportController {
  // ===================== VENDORS =====================
  async createVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await transportService.createVendor(req.body, actor);

      const response: ApiResponse<VehicleVendorDto> = {
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

  async updateVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await transportService.updateVendor(req.params.id as string, req.body, actor);

      const response: ApiResponse<VehicleVendorDto> = {
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

  async getVendorById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = req.user?.role;
      const result = await transportService.getVendorById(req.params.id as string, role);

      const response: ApiResponse<VehicleVendorDto> = {
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

  async listVendors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const search = req.query.search as string | undefined;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
      const role = req.user?.role;

      const result = await transportService.listVendors({
        page,
        limit,
        search,
        isActive,
        role,
      });

      const response: ApiResponse<VehicleVendorDto[]> = {
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

  // ===================== VEHICLES =====================
  async createVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await transportService.createVehicle(req.body, actor);

      const response: ApiResponse<VehicleDto> = {
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

  async updateVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await transportService.updateVehicle(req.params.id as string, req.body, actor);

      const response: ApiResponse<VehicleDto> = {
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

  async getVehicleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await transportService.getVehicleById(req.params.id as string);

      const response: ApiResponse<VehicleDto> = {
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

  async listVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const vendorId = req.query.vendorId as string | undefined;
      const category = req.query.category as any;
      const status = req.query.status as any;
      const search = req.query.search as string | undefined;

      const result = await transportService.listVehicles({
        page,
        limit,
        vendorId,
        category,
        status,
        search,
      });

      const response: ApiResponse<VehicleDto[]> = {
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

  // ===================== DRIVERS =====================
  async createDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await transportService.createDriver(req.body, actor);

      const response: ApiResponse<DriverDto> = {
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

  async updateDriver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await transportService.updateDriver(req.params.id as string, req.body, actor);

      const response: ApiResponse<DriverDto> = {
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

  async getDriverById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await transportService.getDriverById(req.params.id as string);

      const response: ApiResponse<DriverDto> = {
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

  async listDrivers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const vendorId = req.query.vendorId as string | undefined;
      const status = req.query.status as any;
      const search = req.query.search as string | undefined;

      const result = await transportService.listDrivers({
        page,
        limit,
        vendorId,
        status,
        search,
      });

      const response: ApiResponse<DriverDto[]> = {
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

  // ===================== TARIFFS =====================
  async createTariff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await transportService.createTariff(req.body, actor);

      const response: ApiResponse<TransportTariffDto> = {
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

  async updateTariff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await transportService.updateTariff(req.params.id as string, req.body, actor);

      const response: ApiResponse<TransportTariffDto> = {
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

  async getTariffById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = req.user?.role;
      const result = await transportService.getTariffById(req.params.id as string, role);

      const response: ApiResponse<TransportTariffDto> = {
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

  async listTariffs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const destinationId = req.query.destinationId as string | undefined;
      const vehicleCategory = req.query.vehicleCategory as any;
      const seasonType = req.query.seasonType as any;
      const tariffBasis = req.query.tariffBasis as any;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
      const role = req.user?.role;

      const result = await transportService.listTariffs({
        page,
        limit,
        destinationId,
        vehicleCategory,
        seasonType,
        tariffBasis,
        isActive,
        role,
      });

      const response: ApiResponse<TransportTariffDto[]> = {
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

export const transportController = new TransportController();
