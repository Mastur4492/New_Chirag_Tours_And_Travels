import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { ErrorCodes } from '../constants/errorCodes';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : env.NODE_ENV === 'development' ? 500 : 20,
  skip: (req) => {
    const ip = req.ip || req.socket.remoteAddress || '';
    return env.NODE_ENV === 'development' && (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1');
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      code: ErrorCodes.TOO_MANY_REQUESTS,
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  },
});

export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 10000 : env.NODE_ENV === 'development' ? 20000 : 1000,
  skip: (req) => {
    // Never throttle local internal loopback requests from Next.js proxies/dev servers
    const ip = req.ip || req.socket.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      code: ErrorCodes.TOO_MANY_REQUESTS,
      message: 'Too many requests from this IP. Please slow down.',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  },
});

export const enquiryRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : env.NODE_ENV === 'development' ? 500 : 5,
  skip: (req) => {
    const ip = req.ip || req.socket.remoteAddress || '';
    return env.NODE_ENV === 'development' && (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1');
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      code: ErrorCodes.TOO_MANY_REQUESTS,
      message: 'Too many enquiry submissions from this IP. Please wait a few minutes or contact us directly on WhatsApp.',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  },
});
