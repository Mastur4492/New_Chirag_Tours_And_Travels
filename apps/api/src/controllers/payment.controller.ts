import { ApiResponse, PaymentRecordDto } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { paymentService } from '../services/payment.service';

export class PaymentController {
  async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await paymentService.recordPayment(req.body, actor);

      const response: ApiResponse<PaymentRecordDto> = {
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

  async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const { settlementReference, notes } = req.body || {};
      const result = await paymentService.verifyPayment(req.params.id as string, actor, {
        settlementReference,
        notes,
      });

      const response: ApiResponse<PaymentRecordDto> = {
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

  async rejectPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const rejectionReason = req.body?.rejectionReason || req.body?.reason;
      const result = await paymentService.rejectPayment(req.params.id as string, rejectionReason, actor);

      const response: ApiResponse<PaymentRecordDto> = {
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

  async handleDecision(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const { decision } = req.body;
      const rejectionReason = req.body?.rejectionReason || req.body?.reason;
      const { settlementReference, notes } = req.body || {};
      let result: PaymentRecordDto;

      if (decision === 'VERIFY') {
        result = await paymentService.verifyPayment(req.params.id as string, actor, {
          settlementReference,
          notes,
        });
      } else {
        result = await paymentService.rejectPayment(req.params.id as string, rejectionReason || '', actor);
      }

      const response: ApiResponse<PaymentRecordDto> = {
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

  async recordRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await paymentService.recordRefund(req.body, actor);

      const response: ApiResponse<PaymentRecordDto> = {
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

  async getPaymentsForBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
      };

      const result = await paymentService.getPaymentsForBooking(req.params.bookingId as string, actor);

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

  async getPaymentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
      };

      const result = await paymentService.getPaymentById(req.params.id as string, actor);

      const response: ApiResponse<PaymentRecordDto> = {
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

  async reconcileRefunds(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = {
        userId: req.user!.id,
        role: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await paymentService.reconcileRefundAllocations(req.params.id as string, actor);

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
}

export const paymentController = new PaymentController();
