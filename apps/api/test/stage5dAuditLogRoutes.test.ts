import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app';
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { userRepository } from '../src/repositories/user.repository';
import { signAccessToken } from '../src/utils/token.utils';

describe('Milestone 4: Audit Log API & Security RBAC', () => {
  const adminId = '66554433221100aabbccddee';
  const agentId = '66554433221100aabbccdd11';

  const adminToken = signAccessToken({
    sub: adminId,
    role: 'ADMIN',
    mobile: '9876543210',
  });

  const agentToken = signAccessToken({
    sub: agentId,
    role: 'AGENT',
    mobile: '9876543211',
  });

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(userRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === adminId) {
        return {
          _id: { toString: () => adminId },
          role: 'ADMIN',
          status: 'ACTIVE',
          isActive: true,
          mobile: '9876543210',
          name: 'Faisal Admin',
        } as any;
      }
      if (id === agentId) {
        return {
          _id: { toString: () => agentId },
          role: 'AGENT',
          status: 'ACTIVE',
          isActive: true,
          mobile: '9876543211',
          name: 'Partner Agent',
        } as any;
      }
      return null;
    });
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/audit-logs');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('forbids AGENT role from accessing audit logs with 403', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('allows ADMIN role to query audit logs with pagination and filters', async () => {
    const mockLog = {
      toDto: () => ({
        id: 'log-001',
        action: 'PAYMENT_VERIFIED',
        entityType: 'PAYMENT',
        entityId: 'pay-123',
        actorType: 'USER',
        actorId: adminId,
        actorRole: 'ADMIN',
        timestamp: new Date().toISOString(),
      }),
    };

    const findSpy = vi
      .spyOn(auditLogRepository, 'findLogs')
      .mockResolvedValue({ logs: [mockLog as any], total: 1 });

    const res = await request(app)
      .get('/api/v1/audit-logs?entityType=PAYMENT&action=PAYMENT_VERIFIED&page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].action).toBe('PAYMENT_VERIFIED');
    expect(res.body.meta.total).toBe(1);
    expect(res.body.meta.page).toBe(1);

    expect(findSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'PAYMENT',
        action: 'PAYMENT_VERIFIED',
        skip: 0,
        limit: 10,
      })
    );
  });
});
