import { Response } from 'express';
import { REFRESH_TOKEN_COOKIE_NAME } from '../config/constants';
import { env } from '../config/env';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    domain: env.COOKIE_DOMAIN,
    path: '/api/v1/auth',
    maxAge: SEVEN_DAYS_MS,
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    domain: env.COOKIE_DOMAIN,
    path: '/api/v1/auth',
  });
}
