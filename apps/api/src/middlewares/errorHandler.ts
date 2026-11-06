import { ApiErrorResponse } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ErrorCode, ErrorCodes } from '../constants/errorCodes';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString();
  let statusCode = 500;
  let code: ErrorCode = ErrorCodes.INTERNAL_SERVER_ERROR;

  let message = 'An unexpected internal server error occurred';
  let details: ApiErrorResponse['error']['details'];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.message && err.message.startsWith('CORS policy violation')) {
    statusCode = 403;
    code = ErrorCodes.FORBIDDEN;
    message = err.message;
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = ErrorCodes.BAD_REQUEST;
    message = `Invalid format for field: ${err.path}`;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    message = 'Validation error';
    details = Object.values(err.errors).map((val) => ({
      field: val.path,
      issue: val.message,
    }));
  } else if ((err as { code?: number }).code === 11000) {
    statusCode = 409;
    code = ErrorCodes.CONFLICT;
    message = 'Duplicate field value entered. A record with this unique value already exists.';
  } else if (err.name === 'ZodError') {
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    message = 'Validation error';
    details = ((err as any).errors || []).map((e: any) => ({
      field: e.path?.join('.') || '',
      issue: e.message,
    }));
  } else if (err.name === 'SyntaxError') {
    statusCode = 400;
    code = ErrorCodes.BAD_REQUEST;
    message = 'Malformed JSON in request body';
  } else if (err.name === 'PricingValidationError') {
    statusCode = 400;
    code = ErrorCodes.BAD_REQUEST;
    message = err.message;
  } else {
    logger.error(`Unhandled Exception on ${req.method} ${req.originalUrl}:`, err);
  }

  const responseBody: ApiErrorResponse = {
    success: false,
    data: null,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    meta: {
      timestamp,
    },
  };

  res.status(statusCode).json(responseBody);
}
