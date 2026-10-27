import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';
import { authService } from '../src/services/auth.service';

describe('AuthService - Cryptographic & Password Security', () => {
  it('should hash passwords using bcrypt with at least 12 salt rounds', async () => {
    const plain = 'SuperSecret123!';
    const hash = await authService.hashPassword(plain);

    expect(typeof hash).toBe('string');
    expect(hash.startsWith('$2a$12$') || hash.startsWith('$2b$12$')).toBe(true);

    const isMatch = await authService.comparePassword(plain, hash);
    expect(isMatch).toBe(true);
  });

  it('should reject incorrect passwords', async () => {
    const plain = 'CorrectPassword123!';
    const wrong = 'WrongPassword123!';
    const hash = await authService.hashPassword(plain);

    const isMatch = await authService.comparePassword(wrong, hash);
    expect(isMatch).toBe(false);
  });
});
