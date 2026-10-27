import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app';
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { tourPackageRepository } from '../src/repositories/package.repository';
import { destinationRepository } from '../src/repositories/destination.repository';
import { taxConfigRepository } from '../src/repositories/taxConfig.repository';
import { userRepository } from '../src/repositories/user.repository';
import { signAccessToken } from '../src/utils/token.utils';

describe('Milestone 3: HTTP Route Security, RBAC & Mutation Protection', () => {
  const adminId = '66554433221100aabbccddee';
  const agentId = '66554433221100aabbccdd11';
  const targetAgentId = '66554433221100aabbccdd22';
  const pkgId = '66554433221100aabbccdd33';
  const taxId = '66554433221100aabbccdd44';
  const destId = '66554433221100aabbccdd55';

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
    vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);

    // Default mock user lookup for auth middleware
    vi.spyOn(userRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === adminId) {
        return {
          _id: { toString: () => adminId },
          role: 'ADMIN',
          status: 'ACTIVE',
          mobile: '9876543210',
          fullName: 'Faisal Bikanerwala',
          toDto: () => ({ id: adminId, role: 'ADMIN', status: 'ACTIVE' }),
        } as any;
      }
      if (id === agentId) {
        return {
          _id: { toString: () => agentId },
          role: 'AGENT',
          status: 'ACTIVE',
          mobile: '9876543211',
          fullName: 'Agent Sharma',
          toDto: () => ({ id: agentId, role: 'AGENT', status: 'ACTIVE' }),
        } as any;
      }
      if (id === targetAgentId) {
        return {
          _id: { toString: () => targetAgentId },
          role: 'AGENT',
          status: 'ACTIVE',
          mobile: '9825000000',
          fullName: 'Target Agent',
          agentProfile: {
            agencyName: 'Target Agency',
            city: 'Ahmedabad',
            maxDiscountPercent: 5,
            maxMarkupPercent: 20,
            canApproveFinalPrice: false,
          },
          toDto: () => ({
            id: targetAgentId,
            fullName: 'Target Agent',
            role: 'AGENT',
            status: 'ACTIVE',
            mobile: '9825000000',
            agentProfile: {
              agencyName: 'Target Agency',
              city: 'Ahmedabad',
              maxDiscountPercent: 5,
              maxMarkupPercent: 20,
              canApproveFinalPrice: false,
            },
          }),
        } as any;
      }
      return null;
    });

    vi.spyOn(userRepository, 'update').mockImplementation(async (id: string, updateData: any) => {
      return {
        _id: { toString: () => id },
        fullName: updateData.fullName || 'Target Agent',
        role: 'AGENT',
        status: updateData.status || 'ACTIVE',
        mobile: '9825000000',
        agentProfile: updateData.agentProfile || {
          agencyName: 'Target Agency',
          city: 'Ahmedabad',
          maxDiscountPercent: 5,
          maxMarkupPercent: 20,
          canApproveFinalPrice: false,
        },
        toDto: () => ({
          id,
          fullName: updateData.fullName || 'Target Agent',
          role: 'AGENT',
          status: updateData.status || 'ACTIVE',
          mobile: '9825000000',
          agentProfile: updateData.agentProfile,
        }),
      } as any;
    });
  });

  describe('Tour Package Routes Security', () => {
    it('PATCH /api/v1/packages/:id permits admin to update package', async () => {
      vi.spyOn(tourPackageRepository, 'findById').mockResolvedValue({
        _id: { toString: () => pkgId },
        title: 'Original Package',
        destinationId: { toString: () => destId },
        toDto: () => ({ id: pkgId, title: 'Original Package' }),
      } as any);

      vi.spyOn(tourPackageRepository, 'update').mockResolvedValue({
        _id: { toString: () => pkgId },
        title: 'Updated Package',
        destinationId: { toString: () => destId },
        toDto: () => ({ id: pkgId, title: 'Updated Package' }),
      } as any);

      vi.spyOn(destinationRepository, 'findById').mockResolvedValue({
        _id: { toString: () => destId },
        name: 'Kashmir Valley',
      } as any);

      const res = await request(app)
        .patch(`/api/v1/packages/${pkgId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Package' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Package');
    });

    it('PATCH /api/v1/packages/:id rejects agent with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/packages/${pkgId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ title: 'Agent Hack Package' });

      expect(res.status).toBe(403);
    });

    it('PATCH /api/v1/packages/:id/publish rejects agent with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/packages/${pkgId}/publish`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ isPublished: false });

      expect(res.status).toBe(403);
    });
  });

  describe('Agent Administration Routes Security', () => {
    it('PATCH /api/v1/users/agents/:id allows admin to edit agent profile', async () => {
      vi.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/v1/users/agents/${targetAgentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Updated Agent Name',
          agentProfile: {
            agencyName: 'Updated Agency Ltd',
            city: 'Surat',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe('Updated Agent Name');
    });

    it('PATCH /api/v1/users/agents/:id rejects non-admin agent with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/agents/${targetAgentId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          fullName: 'Hacked Name',
        });

      expect(res.status).toBe(403);
    });

    it('PATCH /api/v1/users/agents/:id/status allows admin to update agent status', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/agents/${targetAgentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'SUSPENDED',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('PATCH /api/v1/users/agents/:id/status rejects non-admin agent with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/agents/${targetAgentId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: 'ACTIVE',
        });

      expect(res.status).toBe(403);
    });

    it('PATCH /api/v1/users/agents/:id/permissions rejects non-admin agent with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/agents/${targetAgentId}/permissions`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          maxDiscountPercent: 50,
          maxMarkupPercent: 100,
          canApproveFinalPrice: true,
        });

      expect(res.status).toBe(403);
    });

    it('POST /api/v1/users/agents/:id/reset-password allows admin to reset password', async () => {
      const res = await request(app)
        .post(`/api/v1/users/agents/${targetAgentId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          password: 'NewSecurePassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/users/agents/:id/reset-password rejects agent with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/users/agents/${targetAgentId}/reset-password`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          password: 'HackerPassword123!',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Tax Configuration Routes Security', () => {
    it('PATCH /api/v1/taxes/:id allows admin to update tax rule', async () => {
      vi.spyOn(taxConfigRepository, 'findById').mockResolvedValue({
        _id: { toString: () => taxId },
        name: 'Existing GST Rule',
        ratePercent: 5,
        toDto: () => ({ id: taxId, name: 'Existing GST Rule', ratePercent: 5 }),
      } as any);

      vi.spyOn(taxConfigRepository, 'update').mockResolvedValue({
        _id: { toString: () => taxId },
        name: 'Updated GST Rule',
        ratePercent: 6,
        toDto: () => ({ id: taxId, name: 'Updated GST Rule', ratePercent: 6 }),
      } as any);

      const res = await request(app)
        .patch(`/api/v1/taxes/${taxId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ratePercent: 6,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ratePercent).toBe(6);
    });

    it('PATCH /api/v1/taxes/:id rejects agent with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/taxes/${taxId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          ratePercent: 0,
        });

      expect(res.status).toBe(403);
    });
  });
});
