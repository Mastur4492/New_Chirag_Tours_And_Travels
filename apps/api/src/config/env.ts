import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from workspace root or current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PREFIX: z.string().default('/api/v1'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long'),
  JWT_ACCESS_EXPIRY: z.string().default('24h'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001,http://localhost:3002')
    .transform((val) => val.split(',').map((origin) => origin.trim()).filter(Boolean)),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? process.env.NODE_ENV === 'production' : val === 'true')),
  COOKIE_DOMAIN: z.string().optional(),
  BOOTSTRAP_ADMIN_NAME: z.string().optional(),
  BOOTSTRAP_ADMIN_MOBILE: z.string().optional(),
  BOOTSTRAP_ADMIN_EMAIL: z.string().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  CACHE_DEFAULT_TTL: z.coerce.number().default(900),
  WHATSAPP_API_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().default('chirag_travels_webhook_secret_2026'),
  WHATSAPP_BUSINESS_MOBILE: z.string().default('+919978655529'),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    if (process.env.NODE_ENV !== 'test') {
      const formattedErrors = error.errors.map((err) => `  - ${err.path.join('.')}: ${err.message}`).join('\n');
      console.error('❌ FATAL: Environment validation failed:\n' + formattedErrors);
      process.exit(1);
    }
  }
  // Fallback for tests if needed
  parsedEnv = {
    PORT: 5000,
    NODE_ENV: 'test',
    API_PREFIX: '/api/v1',
    MONGODB_URI: 'mongodb://localhost:27017/chirag_travels_test',
    JWT_ACCESS_SECRET: 'test_access_secret_super_long_key_at_least_32_chars',
    JWT_ACCESS_EXPIRY: '24h',
    JWT_REFRESH_SECRET: 'test_refresh_secret_super_long_key_at_least_32_chars',
    JWT_REFRESH_EXPIRY: '7d',
    CORS_ALLOWED_ORIGINS: ['http://localhost:3000'],
    COOKIE_SECURE: false,
    REDIS_URL: undefined,
    CACHE_DEFAULT_TTL: 900,
    WHATSAPP_API_TOKEN: undefined,
    WHATSAPP_PHONE_NUMBER_ID: undefined,
    WHATSAPP_VERIFY_TOKEN: 'chirag_travels_webhook_secret_2026',
    WHATSAPP_BUSINESS_MOBILE: '+919978655529',
  };
}

export const env = parsedEnv;
