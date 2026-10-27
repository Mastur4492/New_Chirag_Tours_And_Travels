import { createAgentSchema, loginSchema, mobileSchema, phoneSchema } from '@chirag/validation';
import { describe, expect, it } from 'vitest';

describe('Validation Schemas', () => {
  describe('phoneSchema / mobileSchema', () => {
    it('should validate and normalize standard 10-digit Indian mobile numbers', () => {
      const result = phoneSchema.parse('9876543210');
      expect(result).toBe('9876543210');
    });

    it('should strip +91 prefix and spaces for Indian mobile numbers', () => {
      const result = phoneSchema.parse('+91 98765 43210');
      expect(result).toBe('9876543210');
    });

    it('should strip leading 0 and dashes for Indian numbers', () => {
      const result = phoneSchema.parse('09876-543210');
      expect(result).toBe('9876543210');
    });

    it('should validate and normalize international E.164 phone numbers', () => {
      // US number
      expect(phoneSchema.parse('+1 (415) 555-2671')).toBe('+14155552671');
      // UK number
      expect(phoneSchema.parse('+44 7911 123456')).toBe('+447911123456');
      // UAE number
      expect(phoneSchema.parse('+971 50 123 4567')).toBe('+971501234567');
      // Australia number
      expect(phoneSchema.parse('+61 412 345 678')).toBe('+61412345678');
    });

    it('should reject invalid phone formats or garbage strings', () => {
      expect(() => phoneSchema.parse('12345')).toThrow();
      expect(() => phoneSchema.parse('not-a-number')).toThrow();
      expect(() => phoneSchema.parse('++919876543210')).toThrow();
      expect(() => phoneSchema.parse('5555555555')).toThrow(); // Invalid domestic 10-digit prefix
    });

    it('should maintain mobileSchema as compatible alias', () => {
      expect(mobileSchema.parse('+1 415 555 2671')).toBe('+14155552671');
      expect(mobileSchema.parse('9876543210')).toBe('9876543210');
    });
  });

  describe('loginSchema', () => {
    it('should pass with valid credentials (domestic)', () => {
      const valid = loginSchema.parse({
        mobile: '9876543210',
        password: 'Password123!',
      });
      expect(valid.mobile).toBe('9876543210');
      expect(valid.password).toBe('Password123!');
    });

    it('should pass with valid credentials (international phone)', () => {
      const valid = loginSchema.parse({
        mobile: '+1 415 555 2671',
        password: 'Password123!',
      });
      expect(valid.mobile).toBe('+14155552671');
      expect(valid.password).toBe('Password123!');
    });

    it('should reject short passwords', () => {
      expect(() =>
        loginSchema.parse({
          mobile: '9876543210',
          password: '123',
        })
      ).toThrow();
    });
  });

  describe('createAgentSchema', () => {
    it('should pass with valid agent data and profile', () => {
      const valid = createAgentSchema.parse({
        fullName: 'Rahul Sharma',
        mobile: '+91 9876543210',
        email: 'rahul@example.com',
        password: 'AgentPassword123',
        agentProfile: {
          agencyName: 'Sharma Travels',
          city: 'Mumbai',
          maxDiscountPercent: 5,
          maxMarkupPercent: 15,
          canApproveFinalPrice: false,
        },
      });

      expect(valid.fullName).toBe('Rahul Sharma');
      expect(valid.mobile).toBe('9876543210');
      expect(valid.email).toBe('rahul@example.com');
      expect(valid.agentProfile?.maxDiscountPercent).toBe(5);
    });

    it('should allow international agent mobile numbers', () => {
      const valid = createAgentSchema.parse({
        fullName: 'David Miller',
        mobile: '+44 7911 123456',
        email: 'david@millertravels.co.uk',
        password: 'AgentPassword123',
      });

      expect(valid.mobile).toBe('+447911123456');
    });

    it('should reject invalid discount bounds', () => {
      expect(() =>
        createAgentSchema.parse({
          fullName: 'Rahul Sharma',
          mobile: '9876543210',
          password: 'AgentPassword123',
          agentProfile: {
            maxDiscountPercent: 85, // Exceeds max 50
          },
        })
      ).toThrow();
    });
  });
});
