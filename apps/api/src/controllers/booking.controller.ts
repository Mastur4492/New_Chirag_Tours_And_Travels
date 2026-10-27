import { ApiResponse, BookingDto } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { bookingService } from '../services/booking.service';

export class BookingController {
  async listBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const { status, search, destinationId, page, limit } = req.query;

      const result = await bookingService.listBookings(
        {
          status: status as any,
          search: search ? String(search) : undefined,
          destinationId: destinationId ? String(destinationId) : undefined,
          page: page ? parseInt(String(page), 10) : undefined,
          limit: limit ? parseInt(String(limit), 10) : undefined,
        },
        actor
      );

      const response: ApiResponse<BookingDto[]> = {
        success: true,
        data: result.bookings,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getBookingById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await bookingService.getBookingById(req.params.id as string, actor);

      const response: ApiResponse<BookingDto> = {
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

  async getBookingMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
      };

      const result = await bookingService.getBookingMetrics(actor);

      const response: ApiResponse<typeof result> = {
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

  async updateBookingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await bookingService.updateBookingStatus(
        req.params.id as string,
        req.body,
        actor
      );

      const response: ApiResponse<BookingDto> = {
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

export const bookingController = new BookingController();
