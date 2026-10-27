import { AuthenticatedUser } from '@chirag/types';
import { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { buildTenantScopedFilter, enforceAgentOwnership } from '../src/middlewares/agentScoping';
import { requireRole, requireSelfOrAdmin } from '../src/middlewares/authorize';
import { AppError } from '../src/utils/appError';

describe('Authorization & RBAC Middleware', () => {
  const adminUser: AuthenticatedUser = {
    id: 'user_admin_1',
    role: 'ADMIN',
    mobile: '9876543210',
    fullName: 'Faisal Bikanerwala',
  };

  const agentUser: AuthenticatedUser = {
    id: 'user_agent_1',
    role: 'AGENT',
    mobile: '9876543211',
    fullName: 'Rahul Agent',
  };

  const customerUser: AuthenticatedUser = {
    id: 'user_customer_1',
    role: 'CUSTOMER',
    mobile: '9876543212',
    fullName: 'Amit Traveler',
  };

  describe('requireRole', () => {
    it('should allow ADMIN on admin-only route', () => {
      const middleware = requireRole('ADMIN');
      const req = { user: adminUser } as Request;
      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject AGENT on admin-only route with 403 Forbidden', () => {
      const middleware = requireRole('ADMIN');
      const req = { user: agentUser } as Request;
      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0]?.[0] as AppError;
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(403);
    });

    it('should reject unauthenticated request with 401 Unauthorized', () => {
      const middleware = requireRole('ADMIN', 'AGENT');
      const req = {} as Request;
      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0]?.[0] as AppError;
      expect(error.statusCode).toBe(401);
    });
  });

  describe('requireSelfOrAdmin', () => {
    it('should allow ADMIN to access any resource id', () => {
      const middleware = requireSelfOrAdmin('id');
      const req = { user: adminUser, params: { id: 'other_user_id' } } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should allow AGENT to access their own resource id', () => {
      const middleware = requireSelfOrAdmin('id');
      const req = { user: agentUser, params: { id: 'user_agent_1' } } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should deny AGENT from accessing another user resource id', () => {
      const middleware = requireSelfOrAdmin('id');
      const req = { user: agentUser, params: { id: 'user_agent_2' } } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0]?.[0] as AppError;
      expect(error.statusCode).toBe(403);
    });
  });

  describe('buildTenantScopedFilter', () => {
    it('should return empty filter for ADMIN (unrestricted access)', () => {
      const filter = buildTenantScopedFilter(adminUser);
      expect(filter).toEqual({});
    });

    it('should scope queries to assignedAgentId for AGENT', () => {
      const filter = buildTenantScopedFilter(agentUser);
      expect(filter).toEqual({ assignedAgentId: 'user_agent_1' });
    });

    it('should scope queries to customerId for CUSTOMER', () => {
      const filter = buildTenantScopedFilter(customerUser);
      expect(filter).toEqual({ customerId: 'user_customer_1' });
    });
  });

  describe('enforceAgentOwnership', () => {
    it('should allow ADMIN to access any agent resource', () => {
      expect(() => enforceAgentOwnership('user_agent_99', adminUser)).not.toThrow();
    });

    it('should allow AGENT to access own resource', () => {
      expect(() => enforceAgentOwnership('user_agent_1', agentUser)).not.toThrow();
    });

    it('should throw 403 if AGENT attempts to access another agent resource', () => {
      expect(() => enforceAgentOwnership('user_agent_99', agentUser)).toThrowError(AppError);
      try {
        enforceAgentOwnership('user_agent_99', agentUser);
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
      }
    });
  });
});
