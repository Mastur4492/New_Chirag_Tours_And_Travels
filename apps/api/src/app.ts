import path from 'path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import compression from 'compression';
import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import { corsOptions } from './config/cors';
import { env } from './config/env';
import { getHealth } from './controllers/health.controller';
import { errorHandler } from './middlewares/errorHandler';
import { generalApiLimiter } from './middlewares/rateLimiter';
import { requestLogger } from './middlewares/requestLogger';
import { apiRouter } from './routes';
import { AppError } from './utils/appError';

export function createApp(): Express {
  const app: Express = express();

  // Trust reverse proxy headers (Next.js rewrites, NGINX, Cloudflare)
  app.set('trust proxy', 1);

  // HTTP Response Compression (Gzip/Deflate)
  app.use(compression());

  // Security HTTP Headers
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    })
  );

  // Cross-Origin Resource Sharing
  app.use(cors(corsOptions));

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Structured Request Logging
  app.use(requestLogger);

  // Global rate limiter for API routes
  app.use(env.API_PREFIX, generalApiLimiter);

  // Direct root health endpoint
  app.get('/health', getHealth);

  // Serve uploaded media statically
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

  // Mount API router (e.g. /api/v1)
  app.use(env.API_PREFIX, apiRouter);

  // 404 Route Not Found Handler
  app.use((req: Request, _res: Response, next) => {
    next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
