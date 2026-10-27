import { AuthenticatedUser, UserDto } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { corsOptions } from '../src/config/cors';
import { authenticate } from '../src/middlewares/authenticate';
import { requireRole } from '../src/middlewares/authorize';
import { IUserDocument, UserModel } from '../src/models/user.model';
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { userRepository } from '../src/repositories/user.repository';
import { authService } from '../src/services/auth.service';
import { AppError } from '../src/utils/appError';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../src/utils/cookie.utils';
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
} from '../src/utils/token.utils';

describe('Security & Authorization Deep Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);
  });

  describe('1. Refresh Token Rotation & Reuse Detection', () => {
    const mockUserId = '66554433221100aabbccddee';
    const originalRefreshToken = signRefreshToken({ sub: mockUserId });
    const originalHash = hashToken(originalRefreshToken);

    it('should rotate refresh token and issue new access & refresh tokens on valid presentation', async () => {
      const mockUser = {
        _id: { toString: () => mockUserId },
        role: 'AGENT',
        mobile: '9876543210',
        status: 'ACTIVE',
        refreshTokenHash: originalHash,
      } as unknown as IUserDocument;

      vi.spyOn(userRepository, 'findById').mockResolvedValue(mockUser);
      const updateHashSpy = vi.spyOn(userRepository, 'updateRefreshTokenHash').mockResolvedValue();

      const result = await authService.refreshAccessToken(originalRefreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.newRefreshToken).toBeDefined();
      expect(result.newRefreshToken).not.toBe(originalRefreshToken);

      // Verify that the new refresh token's hash was saved
      expect(updateHashSpy).toHaveBeenCalledWith(mockUserId, hashToken(result.newRefreshToken));
    });

    it('should detect token reuse (tampered/old hash mismatch) and immediately revoke session in DB', async () => {
      const alreadyRotatedUser = {
        _id: { toString: () => mockUserId },
        role: 'AGENT',
        mobile: '9876543210',
        status: 'ACTIVE',
        refreshTokenHash: 'newer_already_rotated_hash_64chars',
      } as unknown as IUserDocument;

      vi.spyOn(userRepository, 'findById').mockResolvedValue(alreadyRotatedUser);
      const updateHashSpy = vi.spyOn(userRepository, 'updateRefreshTokenHash').mockResolvedValue();

      // Attacker tries to use the old originalRefreshToken whose hash doesn't match the current stored hash
      await expect(authService.refreshAccessToken(originalRefreshToken)).rejects.toThrowError(
        'Invalid or revoked refresh token. Please sign in again.'
      );

      // CRITICAL SECURITY ASSERTION: Existing session must be wiped (set to null) on reuse detection
      expect(updateHashSpy).toHaveBeenCalledWith(mockUserId, null);
    });

    it('should reject refresh requests for suspended or inactive accounts', async () => {
      const suspendedUser = {
        _id: { toString: () => mockUserId },
        role: 'AGENT',
        status: 'SUSPENDED',
        refreshTokenHash: originalHash,
      } as unknown as IUserDocument;

      vi.spyOn(userRepository, 'findById').mockResolvedValue(suspendedUser);

      await expect(authService.refreshAccessToken(originalRefreshToken)).rejects.toThrowError(
        'User account is not active'
      );
    });
  });

  describe('2. Access Token Verification & Disabled User Rejection', () => {
    const mockUserId = '66554433221100aabbccddee';

    it('should reject access token when user has been suspended in the database', async () => {
      const validToken = signAccessToken({
        sub: mockUserId,
        role: 'AGENT',
        mobile: '9876543210',
      });

      const suspendedUser = {
        _id: { toString: () => mockUserId },
        status: 'SUSPENDED',
      } as unknown as IUserDocument;

      vi.spyOn(userRepository, 'findById').mockResolvedValue(suspendedUser);

      const req = {
        headers: { authorization: `Bearer ${validToken}` },
      } as Request;
      const res = {} as Response;
      const next = vi.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0]?.[0] as AppError;
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain('Account is suspended');
    });

    it('should reject access token when user has been set to inactive in the database', async () => {
      const validToken = signAccessToken({
        sub: mockUserId,
        role: 'AGENT',
        mobile: '9876543210',
      });

      const inactiveUser = {
        _id: { toString: () => mockUserId },
        status: 'INACTIVE',
      } as unknown as IUserDocument;

      vi.spyOn(userRepository, 'findById').mockResolvedValue(inactiveUser);

      const req = {
        headers: { authorization: `Bearer ${validToken}` },
      } as Request;
      const res = {} as Response;
      const next = vi.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0]?.[0] as AppError;
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain('Account is inactive');
    });

    it('should populate req.user context when token is valid and user is active', async () => {
      const validToken = signAccessToken({
        sub: mockUserId,
        role: 'ADMIN',
        mobile: '9876543210',
      });

      const activeAdmin = {
        _id: { toString: () => mockUserId },
        role: 'ADMIN',
        mobile: '9876543210',
        email: 'admin@chirag.com',
        fullName: 'Faisal Bikanerwala',
        status: 'ACTIVE',
      } as unknown as IUserDocument;

      vi.spyOn(userRepository, 'findById').mockResolvedValue(activeAdmin);

      const req = {
        headers: { authorization: `Bearer ${validToken}` },
      } as Request;
      const res = {} as Response;
      const next = vi.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
      expect(req.user?.role).toBe('ADMIN');
      expect(req.user?.fullName).toBe('Faisal Bikanerwala');
    });
  });

  describe('3. Password & Secret Leakage Prevention', () => {
    it('toDto() must strictly omit passwordHash and refreshTokenHash', () => {
      const rawUserInstance = new UserModel({
        fullName: 'Test Agent',
        mobile: '9876543210',
        email: 'agent@test.com',
        passwordHash: '$2a$12$SuperSecretHashedPasswordString',
        refreshTokenHash: 'superSecretSha256HashedRefreshToken',
        role: 'AGENT',
        status: 'ACTIVE',
      });

      const dto: UserDto = rawUserInstance.toDto();

      expect(dto.id).toBeDefined();
      expect(dto.fullName).toBe('Test Agent');
      expect(dto.mobile).toBe('9876543210');
      // Critical security assertions:
      expect((dto as any).passwordHash).toBeUndefined();
      expect((dto as any).refreshTokenHash).toBeUndefined();
      expect((dto as any).__v).toBeUndefined();
    });
  });

  describe('4. Cookie Security & Logout Invalidation', () => {
    it('setRefreshTokenCookie should enforce HttpOnly and restricted auth path', () => {
      const res = {
        cookie: vi.fn(),
      } as unknown as Response;

      setRefreshTokenCookie(res, 'sample-refresh-token-xyz');

      expect(res.cookie).toHaveBeenCalledWith(
        'chirag_refresh_token',
        'sample-refresh-token-xyz',
        expect.objectContaining({
          httpOnly: true,
          path: '/api/v1/auth',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
      );
    });

    it('clearRefreshTokenCookie should clear cookie with matching security parameters', () => {
      const res = {
        clearCookie: vi.fn(),
      } as unknown as Response;

      clearRefreshTokenCookie(res);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'chirag_refresh_token',
        expect.objectContaining({
          httpOnly: true,
          path: '/api/v1/auth',
        })
      );
    });

    it('logout should clear refreshTokenHash in repository', async () => {
      const mockUserId = '66554433221100aabbccddee';
      const mockUser = {
        _id: { toString: () => mockUserId },
        role: 'AGENT',
      } as unknown as IUserDocument;

      vi.spyOn(userRepository, 'findById').mockResolvedValue(mockUser);
      const updateHashSpy = vi.spyOn(userRepository, 'updateRefreshTokenHash').mockResolvedValue();

      await authService.logout(mockUserId);

      expect(updateHashSpy).toHaveBeenCalledWith(mockUserId, null);
    });
  });

  describe('5. CORS Configuration Security', () => {
    it('should allow requests from whitelisted frontend origins', () => {
      const callback = vi.fn();
      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin('http://localhost:3000', callback);
        expect(callback).toHaveBeenCalledWith(null, true);
      }
    });

    it('should allow non-browser / server-to-server requests with undefined origin', () => {
      const callback = vi.fn();
      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin(undefined, callback);
        expect(callback).toHaveBeenCalledWith(null, true);
      }
    });

    it('should reject unauthorized cross-origin requests', () => {
      const callback = vi.fn();
      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin('http://malicious-website.com', callback);
        expect(callback).toHaveBeenCalledWith(expect.any(Error));
      }
    });
  });

  describe('6. Admin-Only Agent Operations RBAC', () => {
    it('requireRole("ADMIN") blocks non-admin roles', () => {
      const adminMiddleware = requireRole('ADMIN');

      const nonAdminReq = {
        user: { id: 'agent_1', role: 'AGENT' } as AuthenticatedUser,
      } as Request;
      const res = {} as Response;
      const next = vi.fn();

      adminMiddleware(nonAdminReq, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0]?.[0] as AppError;
      expect(error.statusCode).toBe(403);
    });
  });
});
