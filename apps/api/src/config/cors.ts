import { CorsOptions } from 'cors';
import { env } from './env';

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or requests without origin (e.g. mobile apps, curl, health checks)
    if (!origin) {
      return callback(null, true);
    }

    if (env.CORS_ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    // In development mode, allow localhost with any port
    if (env.NODE_ENV === 'development' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy violation: Origin '${origin}' is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours
};
