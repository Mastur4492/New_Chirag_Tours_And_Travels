import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { env } from './env';

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) {
    logger.debug('Database already connected');
    return;
  }

  try {
    mongoose.connection.on('connected', () => {
      isConnected = true;
      logger.info('✅ MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      isConnected = false;
      logger.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('⚠️ MongoDB disconnected');
    });

    await mongoose.connect(env.MONGODB_URI, {
      autoIndex: env.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 50,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
  } catch (error) {
    logger.error('❌ Failed to connect to MongoDB:', error);
    if (env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
