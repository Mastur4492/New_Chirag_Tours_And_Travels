import { describe, expect, it } from 'vitest';
import { ErrorCodes } from '../src/constants/errorCodes';
import { AppError } from '../src/utils/appError';
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../src/utils/token.utils';

describe('Token Utilities', () => {
  const samplePayload = {
    sub: '66554433221100aabbccddee',
    role: 'ADMIN' as const,
    mobile: '9876543210',
  };

  it('should sign and successfully verify a valid access token', () => {
    const token = signAccessToken(samplePayload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(samplePayload.sub);
    expect(decoded.role).toBe(samplePayload.role);
    expect(decoded.mobile).toBe(samplePayload.mobile);
  });

  it('should reject a malformed or tampered access token', () => {
    const token = signAccessToken(samplePayload);
    const tampered = token.slice(0, -5) + 'abcde';

    expect(() => verifyAccessToken(tampered)).toThrowError(AppError);
    try {
      verifyAccessToken(tampered);
    } catch (err: any) {
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe(ErrorCodes.INVALID_TOKEN);
    }
  });

  it('should sign and successfully verify a refresh token', () => {
    const token = signRefreshToken({ sub: samplePayload.sub });
    expect(typeof token).toBe('string');

    const decoded = verifyRefreshToken(token);
    expect(decoded.sub).toBe(samplePayload.sub);
  });

  it('should produce deterministic SHA-256 hash for secure token storage', () => {
    const token = 'sample-refresh-token-uuid-12345';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex string length
    expect(hash1).not.toBe(token);
  });
});
