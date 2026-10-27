import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Skip verbose logging for health checks
  if (req.path === '/health' || req.path === '/api/v1/health') {
    return next();
  }

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    const context = {
      method,
      path: originalUrl,
      statusCode,
      durationMs: duration,
      ip,
    };

    if (statusCode >= 500) {
      logger.error(`HTTP ${statusCode} ${method} ${originalUrl}`, undefined, context);
    } else if (statusCode >= 400) {
      logger.warn(`HTTP ${statusCode} ${method} ${originalUrl}`, context);
    } else {
      logger.info(`HTTP ${statusCode} ${method} ${originalUrl}`, context);
    }
  });

  next();
}
