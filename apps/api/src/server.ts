import http from 'http';
import { app } from './app';
import { connectDB, disconnectDB } from './config/database';
import { env } from './config/env';
import { realtimeService } from './services/realtime.service';
import { logger } from './utils/logger';

async function startServer(): Promise<void> {
  try {
    await connectDB();

    const server = http.createServer(app);

    server.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`🚀 API Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      logger.info(`📡 API Endpoints base: http://localhost:${env.PORT}${env.API_PREFIX}`);
      logger.info(`🩺 Health check: http://localhost:${env.PORT}/health`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      realtimeService.destroy();
      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDB();
        logger.info('Graceful shutdown completed.');
        process.exit(0);
      });

      // Force shutdown if taking longer than 10s
      setTimeout(() => {
        logger.error('Forcefully terminating process after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
