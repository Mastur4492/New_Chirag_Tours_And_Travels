import { ApiErrorDetail } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { ErrorCodes } from '../constants/errorCodes';
import { AppError } from '../utils/appError';

interface RequestValidationSchema {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validateRequest(schemas: RequestValidationSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      next();
    } catch (error: any) {
      if (error instanceof ZodError || error?.name === 'ZodError') {
        const details: ApiErrorDetail[] = (error.errors || []).map((err: any) => ({
          field: err.path?.join('.') || '',
          issue: err.message,
        }));
        next(
          new AppError(
            400,
            'Request validation failed',
            ErrorCodes.VALIDATION_ERROR,
            details
          )
        );
        return;
      }
      next(error);
    }
  };
}
