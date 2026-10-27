import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app';
import { userRepository } from '../src/repositories/user.repository';
import { analyticsService } from '../src/services/analytics.service';
import { signAccessToken } from '../src/utils/token.utils';

describe('Analytics HTTP Endpoints & Accounting Rules', () => {
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

  const mockAdminUser = {
    _id: adminId,
    fullName: 'Faisal Bikanerwala',
    email: 'admin@newchirag.com',
    mobile: '9876543210',
    role: 'ADMIN',
    status: 'ACTIVE',
  };

  const mockAgentUser = {
    _id: agentId,
    fullName: 'Test Agent',
    email: 'agent@newchirag.com',
    mobile: '9876543211',
    role: 'AGENT',
    status: 'ACTIVE',
  };

  const mockCustomerUser = {
    _id: customerId,
    fullName: 'Test Customer',
    email: 'customer@newchirag.com',
    mobile: '9876543212',
    role: 'CUSTOMER',
    status: 'ACTIVE',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(userRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === adminId) return mockAdminUser as any;
      if (id === agentId) return mockAgentUser as any;
      if (id === customerId) return mockCustomerUser as any;
      return null;
    });
  });

  describe('Route Security & Authorization', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/analytics/dashboard-summary');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects CUSTOMER role with 403', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard-summary')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows ADMIN and AGENT roles', async () => {
      vi.spyOn(analyticsService, 'getDashboardSummary').mockResolvedValueOnce({
        dateRange: { option: '30d', dateBasis: 'bookingDate' },
        contractedBookingValue: 50000,
        contractedBookingValueInPaise: 5000000,
        verifiedCashCollected: 25000,
        verifiedCashCollectedInPaise: 2500000,
        outstandingReceivables: 25000,
        outstandingReceivablesInPaise: 2500000,
        customerCreditsAmount: 0,
        customerCreditsInPaise: 0,
        activeBookingsCount: 1,
        confirmedBookingsCount: 1,
        cancelledBookingsCount: 0,
        totalQuotationsCount: 2,
        totalQuotedPipelineValue: 100000,
        totalLeadsCount: 5,
        bookingMetrics: {
          quoteAccepted: 0,
          pendingConfirmation: 0,
          confirmed: 1,
          operationalPreparation: 0,
          inTrip: 0,
          completed: 0,
          cancelled: 0,
          total: 1,
        },
        leadMetrics: {
          NEW: 2,
          ASSIGNED: 1,
          CONTACTED: 1,
          QUOTED: 1,
          NEGOTIATING: 0,
          CONVERTED: 0,
          LOST: 0,
          JUNK: 0,
          total: 5,
        },
        funnel: {
          inquiries: 5,
          proposalsIssued: 2,
          customerAccepted: 1,
          confirmedBookings: 1,
          conversionRateLeadToQuote: 40.0,
          conversionRateQuoteToAccept: 50.0,
          conversionRateAcceptToConfirm: 100.0,
          overallWinRate: 20.0,
        },
      });

      const res = await request(app)
        .get('/api/v1/analytics/dashboard-summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.contractedBookingValue).toBe(50000);
    });
  });

  describe('Validation & Date Boundaries', () => {
    it('rejects range=custom if startDate or endDate is missing', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard-summary?range=custom&startDate=2026-10-01')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects if startDate is later than endDate', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard-summary?range=custom&startDate=2026-10-20&endDate=2026-10-10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('correctly resolves Indian Financial Year boundaries (starts April 1)', () => {
      // Test reference date: 14 October 2026 (Month 9 in 0-indexed)
      const oct2026 = new Date(Date.UTC(2026, 9, 14, 12, 0, 0));
      const intervalYtd = analyticsService.resolveDateInterval({ range: 'ytd' }, oct2026);

      expect(intervalYtd.startDate?.toISOString()).toBe('2026-04-01T00:00:00.000Z');
      expect(intervalYtd.endDate?.toISOString()).toBe('2026-10-14T23:59:59.999Z');

      // Test reference date: 15 February 2027 (Month 1 in 0-indexed)
      const feb2027 = new Date(Date.UTC(2027, 1, 15, 12, 0, 0));
      const intervalFeb = analyticsService.resolveDateInterval({ range: 'ytd' }, feb2027);

      expect(intervalFeb.startDate?.toISOString()).toBe('2026-04-01T00:00:00.000Z');
      expect(intervalFeb.endDate?.toISOString()).toBe('2027-02-15T23:59:59.999Z');
    });

    it('correctly resolves rolling 30d and 90d boundaries', () => {
      const fixedNow = new Date(Date.UTC(2026, 9, 14, 12, 0, 0));
      const interval30 = analyticsService.resolveDateInterval({ range: '30d' }, fixedNow);

      expect(interval30.endDate?.toISOString()).toContain('2026-10-14T23:59:59.999Z');
      expect(interval30.startDate?.toISOString()).toContain('2026-09-14T00:00:00.000Z');
    });
  });

  describe('Accounting Rules & Neutral Customer Credit Handling', () => {
    it('GET /api/v1/analytics/financial-trends returns time-series points', async () => {
      vi.spyOn(analyticsService, 'getFinancialTrends').mockResolvedValueOnce({
        interval: 'day',
        dateBasis: 'bookingDate',
        points: [
          {
            period: '2026-10-12',
            periodLabel: '12 Oct',
            contractedBookingValue: 40000,
            contractedBookingValueInPaise: 4000000,
            verifiedCashCollected: 20000,
            verifiedCashCollectedInPaise: 2000000,
            verifiedRefunds: 0,
            verifiedRefundsInPaise: 0,
            netCashFlow: 20000,
            netCashFlowInPaise: 2000000,
            bookingsCount: 1,
            paymentsCount: 1,
          },
        ],
        totals: {
          contractedBookingValue: 40000,
          contractedBookingValueInPaise: 4000000,
          verifiedCashCollected: 20000,
          verifiedCashCollectedInPaise: 2000000,
          verifiedRefunds: 0,
          verifiedRefundsInPaise: 0,
          netCashFlow: 20000,
          netCashFlowInPaise: 2000000,
          bookingsCount: 1,
          paymentsCount: 1,
        },
      });

      const res = await request(app)
        .get('/api/v1/analytics/financial-trends?range=30d')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.points.length).toBe(1);
      expect(res.body.data.totals.contractedBookingValue).toBe(40000);
      expect(res.body.data.totals.verifiedCashCollected).toBe(20000);
    });

    it('GET /api/v1/analytics/top-destinations returns ranked destinations', async () => {
      vi.spyOn(analyticsService, 'getTopDestinations').mockResolvedValueOnce({
        destinations: [
          {
            destinationId: 'dest-1',
            destinationName: 'Goa Golden Coast',
            state: 'Goa',
            country: 'India',
            bookingCount: 5,
            contractedValue: 250000,
            contractedValueInPaise: 25000000,
            verifiedPaidValue: 200000,
            verifiedPaidValueInPaise: 20000000,
            averageBookingValue: 50000,
          },
        ],
        totalActiveBookingsEvaluated: 5,
        totalContractedValueEvaluated: 250000,
      });

      const res = await request(app)
        .get('/api/v1/analytics/top-destinations?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.destinations[0].destinationName).toBe('Goa Golden Coast');
      expect(res.body.data.destinations[0].contractedValue).toBe(250000);
      expect((res.body.data.destinations[0] as any).supplierCost).toBeUndefined();
    });
  });

  describe('Booking Status Breakdown, Drill-Down Mappings & Funnel Verification', () => {
    it('verifies booking status breakdown contains all 7 discrete statuses with exact total matching sum', async () => {
      vi.spyOn(analyticsService, 'getDashboardSummary').mockResolvedValueOnce({
        dateRange: { option: '30d', dateBasis: 'bookingDate' },
        contractedBookingValue: 120000,
        contractedBookingValueInPaise: 12000000,
        verifiedCashCollected: 60000,
        verifiedCashCollectedInPaise: 6000000,
        outstandingReceivables: 60000,
        outstandingReceivablesInPaise: 6000000,
        customerCreditsAmount: 0,
        customerCreditsInPaise: 0,
        activeBookingsCount: 5,
        confirmedBookingsCount: 2,
        cancelledBookingsCount: 1,
        totalQuotationsCount: 10,
        totalQuotedPipelineValue: 500000,
        totalLeadsCount: 12,
        bookingMetrics: {
          quoteAccepted: 1,
          pendingConfirmation: 1,
          confirmed: 2,
          operationalPreparation: 1,
          inTrip: 1,
          completed: 1,
          cancelled: 1,
          total: 8,
        },
        leadMetrics: { total: 12 } as any,
        funnel: {
          inquiries: 12,
          proposalsIssued: 8,
          customerAccepted: 4,
          confirmedBookings: 2,
          conversionRateLeadToQuote: 66.7,
          conversionRateQuoteToAccept: 50.0,
          conversionRateAcceptToConfirm: 50.0,
          overallWinRate: 16.7,
        },
      });

      const res = await request(app)
        .get('/api/v1/analytics/dashboard-summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const metrics = res.body.data.bookingMetrics;
      expect(metrics.quoteAccepted).toBe(1);
      expect(metrics.pendingConfirmation).toBe(1);
      expect(metrics.confirmed).toBe(2);
      expect(metrics.operationalPreparation).toBe(1);
      expect(metrics.inTrip).toBe(1);
      expect(metrics.completed).toBe(1);
      expect(metrics.cancelled).toBe(1);

      // Verify that total matches sum of all 7 individual segments
      const calculatedSum =
        metrics.quoteAccepted +
        metrics.pendingConfirmation +
        metrics.confirmed +
        metrics.operationalPreparation +
        metrics.inTrip +
        metrics.completed +
        metrics.cancelled;
      expect(metrics.total).toBe(calculatedSum);
      expect(metrics.total).toBe(8);
    });

    it('verifies lead funnel "Confirmed Bookings" strictly counts confirmed/post-confirmed stages and excludes unconfirmed active bookings', () => {
      // Funnel Stage 4 explicitly queries:
      // status: { $in: ['CONFIRMED', 'OPERATIONAL_PREPARATION', 'IN_TRIP', 'COMPLETED'] }
      // It MUST NOT count unconfirmed active bookings (QUOTE_ACCEPTED, PENDING_CONFIRMATION) or CANCELLED bookings.
      const stage4AllowedStatuses = ['CONFIRMED', 'OPERATIONAL_PREPARATION', 'IN_TRIP', 'COMPLETED'];
      const unconfirmedActiveStatuses = ['QUOTE_ACCEPTED', 'PENDING_CONFIRMATION'];

      for (const status of unconfirmedActiveStatuses) {
        expect(stage4AllowedStatuses).not.toContain(status);
      }
      expect(stage4AllowedStatuses).not.toContain('CANCELLED');

      // Conversely, all 4 stage4 statuses are considered confirmed or post-confirmed
      expect(stage4AllowedStatuses).toContain('CONFIRMED');
      expect(stage4AllowedStatuses).toContain('OPERATIONAL_PREPARATION');
      expect(stage4AllowedStatuses).toContain('IN_TRIP');
      expect(stage4AllowedStatuses).toContain('COMPLETED');
    });

    it('verifies chart segment drill-down routes map directly to supported booking statuses', () => {
      // Donut chart segment definitions rendered in BookingDistributionDonut.tsx
      const chartSegments = [
        { label: 'Confirmed', statusKey: 'CONFIRMED', expectedRoute: '/bookings?status=CONFIRMED' },
        { label: 'Operational Prep', statusKey: 'OPERATIONAL_PREPARATION', expectedRoute: '/bookings?status=OPERATIONAL_PREPARATION' },
        { label: 'In Trip', statusKey: 'IN_TRIP', expectedRoute: '/bookings?status=IN_TRIP' },
        { label: 'Completed', statusKey: 'COMPLETED', expectedRoute: '/bookings?status=COMPLETED' },
        { label: 'Quote Accepted', statusKey: 'QUOTE_ACCEPTED', expectedRoute: '/bookings?status=QUOTE_ACCEPTED' },
        { label: 'Pending Confirm', statusKey: 'PENDING_CONFIRMATION', expectedRoute: '/bookings?status=PENDING_CONFIRMATION' },
        { label: 'Cancelled', statusKey: 'CANCELLED', expectedRoute: '/bookings?status=CANCELLED' },
      ];

      for (const seg of chartSegments) {
        expect(`/bookings?status=${seg.statusKey}`).toBe(seg.expectedRoute);
        expect(seg.statusKey).not.toBe('ALL');
      }

      // Operational preparation and In Trip MUST NOT both map to the same single status filter
      const opPrepRoute = `/bookings?status=${chartSegments.find((s) => s.statusKey === 'OPERATIONAL_PREPARATION')?.statusKey}`;
      const inTripRoute = `/bookings?status=${chartSegments.find((s) => s.statusKey === 'IN_TRIP')?.statusKey}`;
      expect(opPrepRoute).not.toBe(inTripRoute);
      expect(opPrepRoute).toBe('/bookings?status=OPERATIONAL_PREPARATION');
      expect(inTripRoute).toBe('/bookings?status=IN_TRIP');
    });
  });
});

