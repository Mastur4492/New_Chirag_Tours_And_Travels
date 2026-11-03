import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ErrorCodes } from '../constants/errorCodes';
import { AppError } from '../utils/appError';
import { AiSessionModel } from '../models/aiSession.model';

/**
 * Public Anonymous Customer AI Chat Limiter (Per IP)
 */
export const customerAiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : env.NODE_ENV === 'development' ? 500 : 30,
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
      message: 'You have reached the AI chat rate limit. Please try again in a few minutes or contact our travel desk.',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  },
});

/**
 * Authenticated Agent & Admin AI Chat Limiter (Per Authenticated User ID)
 */
export const authenticatedAiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 2000 : env.NODE_ENV === 'development' ? 1000 : 120,
  keyGenerator: (req) => (req as any).user?.id || req.ip || 'anonymous',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      code: ErrorCodes.TOO_MANY_REQUESTS,
      message: 'AI Copilot usage quota temporarily exceeded for your account. Please wait a few moments.',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  },
});

/**
 * Token Budget Verification Guard
 * Checks if the existing session has breached its allocated token budget.
 */
export async function verifyTokenBudget(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const sessionId = req.body?.sessionId || req.query?.sessionId;
    if (!sessionId) {
      return next();
    }

    const session = await AiSessionModel.findOne({ sessionId });
    if (session && session.totalTokensUsed >= session.tokenBudget) {
      throw AppError.badRequest(
        `This conversation has reached its session token budget limit (${session.tokenBudget.toLocaleString()} tokens). Please start a fresh conversation.`
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

