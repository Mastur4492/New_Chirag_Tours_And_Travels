import { ApiErrorDetail } from '@chirag/types';
import { ErrorCode, ErrorCodes } from '../constants/errorCodes';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: ApiErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    code: ErrorCode = ErrorCodes.BAD_REQUEST,
    details?: ApiErrorDetail[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code: ErrorCode = ErrorCodes.BAD_REQUEST, details?: ApiErrorDetail[]): AppError {
    return new AppError(400, message, code, details);
  }

  static unauthorized(message: string = 'Authentication required', code: ErrorCode = ErrorCodes.UNAUTHORIZED): AppError {
    return new AppError(401, message, code);
  }

  static forbidden(message: string = 'Access denied. Insufficient permissions', code: ErrorCode = ErrorCodes.FORBIDDEN): AppError {
    return new AppError(403, message, code);
  }

  static notFound(message: string = 'Resource not found', code: ErrorCode = ErrorCodes.NOT_FOUND): AppError {
    return new AppError(404, message, code);
  }

  static conflict(message: string, code: ErrorCode = ErrorCodes.CONFLICT): AppError {
    return new AppError(409, message, code);
  }

  static internal(message: string = 'Internal server error'): AppError {
    return new AppError(500, message, ErrorCodes.INTERNAL_SERVER_ERROR);
  }
}
