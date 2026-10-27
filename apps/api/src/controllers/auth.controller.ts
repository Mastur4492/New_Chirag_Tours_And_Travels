import { ApiResponse, LoginResponse, RefreshTokenResponse, UserDto } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { REFRESH_TOKEN_COOKIE_NAME } from '../config/constants';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../utils/cookie.utils';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { mobile, password } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login({
        mobile,
        password,
        ipAddress,
        userAgent,
      });

      // Set refresh token in secure HttpOnly cookie
      setRefreshTokenCookie(res, result.tokens.refreshToken);

      const response: ApiResponse<LoginResponse> = {
        success: true,
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
        },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract refresh token from HttpOnly cookie, or Authorization header as fallback
      const tokenFromCookie = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
      const tokenFromHeader = req.headers['x-refresh-token'] as string;
      const refreshToken = tokenFromCookie || tokenFromHeader;

      const result = await authService.refreshAccessToken(refreshToken);

      // Rotate cookie with new refresh token
      setRefreshTokenCookie(res, result.newRefreshToken);

      const response: ApiResponse<RefreshTokenResponse> = {
        success: true,
        data: {
          accessToken: result.accessToken,
        },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      if (userId) {
        await authService.logout(userId, ipAddress, userAgent);
      }

      clearRefreshTokenCookie(res);

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: {
          message: 'Logged out successfully',
        },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const user = await userService.getUserById(userId);

      const response: ApiResponse<UserDto> = {
        success: true,
        data: user,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
