import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app';
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { userRepository } from '../src/repositories/user.repository';
import { bookingService } from '../src/services/booking.service';
import { signAccessToken } from '../src/utils/token.utils';

describe('Stage 5A: Booking HTTP Endpoints & Route Security', () => {
  const adminId = '66554433221100aabbccddee';
  const agentId = '66554433221100aabbccdd11';
  const otherAgentId = '66554433221100aabbccdd99';
  const customerId = '66554433221100aabbccdd22';
  const validBookingId = '66554433221100aabbccdd77';

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

  const mockBooking = {
    id: validBookingId,
    bookingNumber: 'BK-20261013-0001',
    quotationId: '66554433221100aabbccdd88',
    quotationVersion: 1,
    leadId: '66554433221100aabbccdd99',
    customerId,
    assignedAgentId: agentId,
    status: 'QUOTE_ACCEPTED',
    pricing: {
      subtotalPaise: 5000000,
      discountPaise: 0,
      taxPaise: 250000,
      totalAmountPaise: 5250000,
      advanceRequiredPaise: 1500000,
    },
    paymentsSummary: {
      totalPaidPaise: 0,
      balancePendingPaise: 5250000,
      verifiedPaymentsCount: 0,
    },
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

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

  it('rejects unauthenticated requests to /api/v1/bookings with 401', async () => {
    const res = await request(app).get('/api/v1/bookings');
    expect(res.status).toBe(401);
  });

  it('rejects customer role from listing bookings with 403', async () => {
    const res = await request(app)
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });

  it('allows admin to list bookings with pagination metadata', async () => {
    vi.spyOn(bookingService, 'listBookings').mockResolvedValue({
      bookings: [mockBooking as any],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const res = await request(app)
      .get('/api/v1/bookings?page=1&limit=20&status=QUOTE_ACCEPTED')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].bookingNumber).toBe('BK-20261013-0001');
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.total).toBe(1);
  });

  it('supports filtering bookings by discrete statuses and multi-status queries', async () => {
    const listSpy = vi.spyOn(bookingService, 'listBookings').mockResolvedValue({
      bookings: [mockBooking as any],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    // Discrete status: OPERATIONAL_PREPARATION
    await request(app)
      .get('/api/v1/bookings?status=OPERATIONAL_PREPARATION')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'OPERATIONAL_PREPARATION' }),
      expect.any(Object)
    );

    // Discrete status: IN_TRIP
    await request(app)
      .get('/api/v1/bookings?status=IN_TRIP')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'IN_TRIP' }),
      expect.any(Object)
    );

    // Multi-status query: OPERATIONAL_PREPARATION,IN_TRIP
    await request(app)
      .get('/api/v1/bookings?status=OPERATIONAL_PREPARATION,IN_TRIP')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'OPERATIONAL_PREPARATION,IN_TRIP' }),
      expect.any(Object)
    );
  });

  it('allows agent to fetch booking metrics for their assigned bookings covering all 7 status values', async () => {
    vi.spyOn(bookingService, 'getBookingMetrics').mockResolvedValue({
      total: 10,
      quoteAccepted: 2,
      pendingConfirmation: 1,
      confirmed: 3,
      operationalPreparation: 2,
      inTrip: 1,
      completed: 1,
      cancelled: 0,
    });

    const res = await request(app)
      .get('/api/v1/bookings/metrics')
      .set('Authorization', `Bearer ${agentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(10);
    expect(res.body.data.quoteAccepted).toBe(2);
    expect(res.body.data.confirmed).toBe(3);
    expect(res.body.data.operationalPreparation).toBe(2);
    expect(res.body.data.inTrip).toBe(1);
  });

  it('allows admin to fetch booking details by id', async () => {
    vi.spyOn(bookingService, 'getBookingById').mockResolvedValue(mockBooking as any);

    const res = await request(app)
      .get(`/api/v1/bookings/${validBookingId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(validBookingId);
  });

  it('rejects invalid ObjectId format with 400 validation error', async () => {
    const res = await request(app)
      .get('/api/v1/bookings/invalid-id')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('allows admin to update booking status with audit reason', async () => {
    vi.spyOn(bookingService, 'updateBookingStatus').mockResolvedValue({
      ...mockBooking,
      status: 'CONFIRMED',
    } as any);

    const res = await request(app)
      .patch(`/api/v1/bookings/${validBookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'CONFIRMED',
        reason: 'Payment verified and hotel confirmed manually by manager',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CONFIRMED');
  });

  it('rejects agent from updating booking status with 403', async () => {
    const res = await request(app)
      .patch(`/api/v1/bookings/${validBookingId}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        status: 'CONFIRMED',
        reason: 'Attempted agent confirmation',
      });

    expect(res.status).toBe(403);
  });

  it('validates status update body and rejects invalid statuses with 400', async () => {
    const res = await request(app)
      .patch(`/api/v1/bookings/${validBookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'INVALID_STATUS',
      });

    expect(res.status).toBe(400);
  });
});
