import { ApiResponse, HotelDto, RoomCategoryDto, SeasonalRateCardDto } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { hotelService } from '../services/hotel.service';

export class HotelController {
  // --- HOTELS ---
  async createHotel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await hotelService.createHotel(req.body, actor);

      const response: ApiResponse<HotelDto> = {
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

  async updateHotel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await hotelService.updateHotel(req.params.id as string, req.body, actor);

      const response: ApiResponse<HotelDto> = {
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

  async getHotelById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = req.user?.role;
      const result = await hotelService.getHotelById(req.params.id as string, role);

      const response: ApiResponse<HotelDto> = {
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

  async listHotels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const destinationId = req.query.destinationId as string | undefined;
      const starRating = req.query.starRating ? Number(req.query.starRating) : undefined;
      const propertyType = req.query.propertyType as any;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
      const search = req.query.search as string | undefined;
      const role = req.user?.role;

      const result = await hotelService.listHotels({
        page,
        limit,
        destinationId,
        starRating,
        propertyType,
        isActive,
        search,
        role,
      });

      const response: ApiResponse<HotelDto[]> = {
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

  // --- ROOM CATEGORIES ---
  async createRoomCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await hotelService.createRoomCategory(
        { ...req.body, hotelId: req.params.hotelId || req.body.hotelId },
        actor
      );

      const response: ApiResponse<RoomCategoryDto> = {
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

  async updateRoomCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await hotelService.updateRoomCategory(
        req.params.roomId as string,
        req.body,
        actor
      );

      const response: ApiResponse<RoomCategoryDto> = {
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

  async listRoomCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hotelId = (req.params.hotelId || req.query.hotelId) as string;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

      const result = await hotelService.listRoomCategoriesByHotel(hotelId, isActive);

      const response: ApiResponse<RoomCategoryDto[]> = {
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

  // --- SEASONAL RATE CARDS ---
  async createRateCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await hotelService.createSeasonalRateCard(req.body, actor);

      const response: ApiResponse<SeasonalRateCardDto> = {
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

  async updateRateCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await hotelService.updateSeasonalRateCard(
        req.params.id as string,
        req.body,
        actor
      );

      const response: ApiResponse<SeasonalRateCardDto> = {
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

  async listRateCards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const hotelId = req.query.hotelId as string | undefined;
      const roomCategoryId = req.query.roomCategoryId as string | undefined;
      const seasonId = req.query.seasonId as string | undefined;
      const mealPlan = req.query.mealPlan as any;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
      const role = req.user?.role;

      const result = await hotelService.listRateCards({
        page,
        limit,
        hotelId,
        roomCategoryId,
        seasonId,
        mealPlan,
        isActive,
        role,
      });

      const response: ApiResponse<SeasonalRateCardDto[]> = {
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

export const hotelController = new HotelController();
