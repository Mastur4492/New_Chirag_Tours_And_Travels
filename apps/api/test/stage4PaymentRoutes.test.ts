import mongoose from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app';
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { userRepository } from '../src/repositories/user.repository';
import { paymentService } from '../src/services/payment.service';
import { signAccessToken } from '../src/utils/token.utils';

describe('Stage 4: Payment HTTP Endpoints & Route Security', () => {
  const adminId = '66554433221100aabbccddee';
  const agentId = '66554433221100aabbccdd11';
  const customerId = '66554433221100aabbccdd22';

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

    vi.spyOn(userRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === adminId) {
        return {
          _id: { toString: () => adminId },
          role: 'ADMIN',
          status: 'ACTIVE',
          mobile: '9876543210',
          fullName: 'Admin User',
        } as any;
      }
      if (id === agentId) {
        return {
          _id: { toString: () => agentId },
          role: 'AGENT',
          status: 'ACTIVE',
          mobile: '9876543211',
          fullName: 'Agent User',
        } as any;
      }
      if (id === customerId) {
        return {
          _id: { toString: () => customerId },
          role: 'CUSTOMER',
          status: 'ACTIVE',
          mobile: '9876543212',
          fullName: 'Customer User',
        } as any;
      }
      return null;
    });
  });

  const validPaymentPayload = {
    bookingId: '66554433221100aabbccddee',
    amount: 25000,
    paymentType: 'ADVANCE',
    paymentMethod: 'UPI',
    transactionReference: 'UPI-REF-123456',
  };

  const mockPaymentDto: any = {
    id: '66554433221100aabbccdd33',
    bookingId: '66554433221100aabbccddee',
    receiptNumber: 'NCT-RCT-2026-00001',
    amount: 25000,
    amountInPaise: 2500000,
    currency: 'INR',
    paymentType: 'ADVANCE',
    paymentMethod: 'UPI',
    status: 'SUBMITTED',
    paymentDate: new Date().toISOString(),
    recordedBy: agentId,
    isRefund: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .send(validPaymentPayload);

    expect(res.status).toBe(401);
  });

  it('rejects customer role with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(validPaymentPayload);

    expect(res.status).toBe(403);
  });

  it('allows agent to submit manual payment (status 201)', async () => {
    vi.spyOn(paymentService, 'recordPayment').mockResolvedValue(mockPaymentDto);

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${agentToken}`)
      .send(validPaymentPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.receiptNumber).toBe('NCT-RCT-2026-00001');
    expect(res.body.data.status).toBe('SUBMITTED');
  });

  it('validates request schema and rejects invalid payment amounts with 400', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...validPaymentPayload,
        amount: -500, // Invalid negative amount
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects non-admin (agent) from verifying payment with 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/v1/payments/${mockPaymentDto.id}/verify`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send();

    expect(res.status).toBe(403);
  });

  it('allows admin to verify payment (status 200)', async () => {
    const verifiedDto = {
      ...mockPaymentDto,
      status: 'VERIFIED',
      verifiedBy: adminId,
      verifiedAt: new Date().toISOString(),
    };
    vi.spyOn(paymentService, 'verifyPayment').mockResolvedValue(verifiedDto);

    const res = await request(app)
      .post(`/api/v1/payments/${mockPaymentDto.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('VERIFIED');
  });

  it('allows admin to reject payment with reason (status 200)', async () => {
    const rejectedDto = {
      ...mockPaymentDto,
      status: 'REJECTED',
      verifiedBy: adminId,
      rejectionReason: 'Invalid transaction reference',
    };
    vi.spyOn(paymentService, 'rejectPayment').mockResolvedValue(rejectedDto);

    const res = await request(app)
      .post(`/api/v1/payments/${mockPaymentDto.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rejectionReason: 'Invalid transaction reference' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('REJECTED');
  });

  it('allows admin to submit decision via /decision route with validation (status 200)', async () => {
    const verifiedDto = {
      ...mockPaymentDto,
      status: 'VERIFIED',
      verifiedBy: adminId,
      verifiedAt: new Date().toISOString(),
    };
    vi.spyOn(paymentService, 'verifyPayment').mockResolvedValue(verifiedDto);

    const res = await request(app)
      .post(`/api/v1/payments/${mockPaymentDto.id}/decision`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'VERIFY' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('VERIFIED');
  });

  it('allows recording refund with valid payload and permissions (status 201)', async () => {
    const refundDto = {
      ...mockPaymentDto,
      receiptNumber: 'NCT-RFD-2026-00001',
      isRefund: true,
      originalPaymentId: mockPaymentDto.id,
      refundReason: 'Customer canceled room',
    };
    vi.spyOn(paymentService, 'recordRefund').mockResolvedValue(refundDto);

    const res = await request(app)
      .post('/api/v1/payments/refund')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bookingId: '66554433221100aabbccddee',
        originalPaymentId: mockPaymentDto.id,
        amount: 5000,
        refundReason: 'Customer canceled room',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isRefund).toBe(true);
  });

  it('fetches booking payments ledger and verified summary (status 200)', async () => {
    vi.spyOn(paymentService, 'getPaymentsForBooking').mockResolvedValue({
      payments: [mockPaymentDto],
      summary: {
        totalPaid: 25000,
        totalRefunded: 0,
        netPaid: 25000,
        balancePending: 75000,
      },
    });

    const res = await request(app)
      .get('/api/v1/payments/booking/66554433221100aabbccddee')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payments).toHaveLength(1);
    expect(res.body.data.summary.netPaid).toBe(25000);
  });

  it('allows admin to explicitly reconcile refund allocations (status 200)', async () => {
    vi.spyOn(paymentService, 'reconcileRefundAllocations').mockResolvedValue({
      reconciledPaise: 1000000,
      previousPaise: 2000000,
      headroomPaise: 1000000,
      healed: true,
    });

    const res = await request(app)
      .post(`/api/v1/payments/${mockPaymentDto.id}/reconcile-refunds`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.healed).toBe(true);
    expect(res.body.data.reconciledPaise).toBe(1000000);
  });

  it('rejects agent from reconciling refund allocations with 403', async () => {
    const res = await request(app)
      .post(`/api/v1/payments/${mockPaymentDto.id}/reconcile-refunds`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(403);
  });
});
