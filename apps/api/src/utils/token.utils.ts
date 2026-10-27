import { AccessTokenPayload, RefreshTokenPayload } from '@chirag/types';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ErrorCodes } from '../constants/errorCodes';
import { AppError } from './appError';

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Access token has expired', ErrorCodes.TOKEN_EXPIRED);
    }
    throw AppError.unauthorized('Invalid access token', ErrorCodes.INVALID_TOKEN);
  }
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  const tokenPayload: RefreshTokenPayload & { jti: string } = {
    ...payload,
    jti: crypto.randomUUID(),
  };

  return jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Refresh token has expired', ErrorCodes.TOKEN_EXPIRED);
    }
    throw AppError.unauthorized('Invalid refresh token', ErrorCodes.INVALID_TOKEN);
  }
}

/**
 * Deterministically hash a refresh token (SHA-256) for secure storage and comparison in MongoDB.
 * This prevents plain-text tokens from ever residing in the database.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
