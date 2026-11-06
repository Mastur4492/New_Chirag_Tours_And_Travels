import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app';
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { bookingRepository } from '../src/repositories/booking.repository';
import { paymentRepository } from '../src/repositories/payment.repository';
import { userRepository } from '../src/repositories/user.repository';
import { leadRepository } from '../src/repositories/lead.repository';
import { quotationRepository } from '../src/repositories/quotation.repository';
import { destinationRepository } from '../src/repositories/destination.repository';
import { tourPackageRepository } from '../src/repositories/package.repository';
import { destinationService } from '../src/services/destination.service';
import { tourPackageService } from '../src/services/package.service';
import { paymentService } from '../src/services/payment.service';
import { bookingService } from '../src/services/booking.service';
import { operationsService } from '../src/services/operations.service';
import { agencySettingsService } from '../src/services/agencySettings.service';
import { signAccessToken } from '../src/utils/token.utils';

describe('Role-Based Authorization & RBAC Regression Test Suite', () => {
  const adminId = '66554433221100aabbccddee';
  const agentId = '66554433221100aabbccdd11';
  const customerId = '66554433221100aabbccdd22';
  const resourceId = '66554433221100aabbccdd33';

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

  const customerToken = signAccessToken({
    sub: customerId,
    role: 'CUSTOMER',
    mobile: '9876543212',
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);

    // Mock active user lookup for authentication middleware
    vi.spyOn(userRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === adminId) {
        return {
          _id: { toString: () => adminId },
          role: 'ADMIN',
          status: 'ACTIVE',
          mobile: '9876543210',
          fullName: 'Super Admin',
          toDto: () => ({ id: adminId, role: 'ADMIN', status: 'ACTIVE' }),
        } as any;
      }
      if (id === agentId) {
        return {
          _id: { toString: () => agentId },
          role: 'AGENT',
          status: 'ACTIVE',
          mobile: '9876543211',
          fullName: 'Desk Agent',
          toDto: () => ({ id: agentId, role: 'AGENT', status: 'ACTIVE' }),
        } as any;
      }
      if (id === customerId) {
        return {
          _id: { toString: () => customerId },
          role: 'CUSTOMER',
          status: 'ACTIVE',
          mobile: '9876543212',
          fullName: 'Portal Customer',
          toDto: () => ({ id: customerId, role: 'CUSTOMER', status: 'ACTIVE' }),
        } as any;
      }
      return null;
    });
  });

  // =========================================================================
  // 1. UNAUTHENTICATED REQUESTS (HTTP 401)
  // =========================================================================
  describe('1. Unauthenticated Access Protection (HTTP 401)', () => {
    it('1.1: rejects GET /api/v1/bookings without token with 401', async () => {
      const res = await request(app).get('/api/v1/bookings');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('1.2: rejects GET /api/v1/leads without token with 401', async () => {
      const res = await request(app).get('/api/v1/leads');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('1.3: rejects POST /api/v1/payments/:id/verify without token with 401', async () => {
      const res = await request(app).post(`/api/v1/payments/${resourceId}/verify`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('1.4: rejects GET /api/v1/audit-logs without token with 401', async () => {
      const res = await request(app).get('/api/v1/audit-logs');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('1.5: rejects GET /api/v1/users without token with 401', async () => {
      const res = await request(app).get('/api/v1/users');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // =========================================================================
  // 2. CUSTOMER ROLE RESTRICTIONS (HTTP 403)
  // =========================================================================
  describe('2. Customer Role Authorization Restrictions (HTTP 403)', () => {
    it('2.1: rejects Customer token from listing bookings with 403', async () => {
      const res = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('2.2: rejects Customer token from listing leads with 403', async () => {
      const res = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('2.3: rejects Customer token from accessing audit logs with 403', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('2.4: rejects Customer token from accessing user management with 403', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('2.5: rejects Customer token from viewing booking payments ledger with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/payments/booking/${resourceId}`)
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('2.6: rejects Customer token from viewing operations summary with 403', async () => {
      // Operations endpoints require ADMIN or AGENT
      const res = await request(app)
        .patch(`/api/v1/operations/hotel-reservations/${resourceId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ confirmationNumber: 'CONF123' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // =========================================================================
  // 3. AGENT ROLE RESTRICTIONS (HTTP 403)
  // =========================================================================
  describe('3. Agent Role Authorization Restrictions (HTTP 403)', () => {
    it('3.1: rejects Agent from verifying payments (POST /api/v1/payments/:id/verify) with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/payments/${resourceId}/verify`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ verificationNotes: 'Agent trying to self-verify' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('3.2: rejects Agent from rejecting payments (POST /api/v1/payments/:id/reject) with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/payments/${resourceId}/reject`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ rejectionReason: 'Agent trying to reject' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('3.3: rejects Agent from deciding payment verification (POST /api/v1/payments/:id/decision) with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/payments/${resourceId}/decision`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ decision: 'VERIFY' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('3.4: rejects Agent from reconciling refund allocations with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/payments/${resourceId}/reconcile-refunds`)
        .set('Authorization', `Bearer ${agentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('3.5: rejects Agent from mutating booking status (PATCH /api/v1/bookings/:id/status) with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${resourceId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: 'CONFIRMED', auditReason: 'Agent unauthorized status change' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('3.6: rejects Agent from assigning transport (PATCH /api/v1/operations/transport-assignments/:id/assign) with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/operations/transport-assignments/${resourceId}/assign`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ vehicleId: resourceId, driverId: resourceId });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('3.7: rejects Agent from generating hotel voucher (POST /api/v1/operations/hotel-reservations/:id/voucher) with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/operations/hotel-reservations/${resourceId}/voucher`)
        .set('Authorization', `Bearer ${agentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('3.8: rejects Agent from issuing transport duty slip (POST /api/v1/operations/transport-assignments/:id/duty-slip) with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/operations/transport-assignments/${resourceId}/duty-slip`)
        .set('Authorization', `Bearer ${agentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('3.9: rejects Agent from accessing audit logs with 403', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${agentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('3.10: rejects Agent from mutating agency settings with 403', async () => {
      const res = await request(app)
        .put('/api/v1/settings/agency')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ agencyName: 'Hacked Agency' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // =========================================================================
  // 4. ADMIN ROLE PERMISSIONS (HTTP 200/201)
  // =========================================================================
  describe('4. Admin Role Privileged Permissions', () => {
    it('4.1: allows Admin to verify payment (POST /api/v1/payments/:id/verify)', async () => {
      vi.spyOn(paymentService, 'verifyPayment').mockResolvedValue({
        id: resourceId,
        status: 'VERIFIED',
      } as any);

      const res = await request(app)
        .post(`/api/v1/payments/${resourceId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ settlementReference: 'UTR123456789' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('4.2: allows Admin to reject payment (POST /api/v1/payments/:id/reject)', async () => {
      vi.spyOn(paymentService, 'rejectPayment').mockResolvedValue({
        id: resourceId,
        status: 'REJECTED',
      } as any);

      const res = await request(app)
        .post(`/api/v1/payments/${resourceId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejectionReason: 'Screenshot illegible' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('4.3: allows Admin to update booking status (PATCH /api/v1/bookings/:id/status)', async () => {
      vi.spyOn(bookingService, 'updateBookingStatus').mockResolvedValue({
        id: resourceId,
        status: 'CONFIRMED',
      } as any);

      const res = await request(app)
        .patch(`/api/v1/bookings/${resourceId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED', auditReason: 'Payment verified and hotel allotment locked' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('4.4: allows Admin to access audit logs', async () => {
      vi.spyOn(auditLogRepository, 'findLogs').mockResolvedValue({
        logs: [],
        total: 0,
      } as any);

      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================================
  // 5. PUBLIC CATALOG & PUBLIC QUOTATION ENDPOINTS
  // =========================================================================
  describe('5. Public Catalog & Public Quotation Endpoints Retain Open Access', () => {
    it('5.1: allows public access to destinations (GET /api/v1/destinations) without token', async () => {
      vi.spyOn(destinationService, 'listDestinations').mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      } as any);

      const res = await request(app).get('/api/v1/destinations');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('5.2: allows public access to packages (GET /api/v1/packages) without token', async () => {
      vi.spyOn(tourPackageService, 'listPackages').mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      } as any);

      const res = await request(app).get('/api/v1/packages');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('5.3: handles public quotation lookup without requiring auth token (returns 404 for invalid token, not 401)', async () => {
      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(null);
      vi.spyOn(quotationRepository, 'findBySupersededTokenHash').mockResolvedValue(null);

      const res = await request(app).get('/api/v1/quotations/public/nonexistent-token');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('5.4: handles public quotation acceptance without requiring auth token (returns 404 for invalid token, not 401)', async () => {
      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(null);
      vi.spyOn(quotationRepository, 'findBySupersededTokenHash').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/quotations/public/nonexistent-token/accept')
        .send({ agreedToTerms: true });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
