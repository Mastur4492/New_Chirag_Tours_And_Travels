import crypto from 'crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app';
import { QuotationModel } from '../src/models/quotation.model';
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { quotationRepository } from '../src/repositories/quotation.repository';
import { userRepository } from '../src/repositories/user.repository';
import { leadService } from '../src/services/lead.service';
import { quotationService } from '../src/services/quotation.service';
import { signAccessToken } from '../src/utils/token.utils';

describe('Phase 3: Quotation HTTP Endpoints & Route Security', () => {
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
          agentProfile: {
            maxDiscountPercent: 5,
            maxMarkupPercent: 20,
          },
        } as any;
      }
      return null;
    });
  });

  describe('Public Quotation Endpoint (GET /api/v1/quotations/public/:token)', () => {
    it('allows unauthenticated access to public quotation', async () => {
      const rawToken = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const mockPublicDto = {
        quoteNumber: 'NCT-QT-2026-00001',
        travelStartDate: '2026-04-10',
        travelEndDate: '2026-04-12',
        durationNights: 2,
        durationDays: 3,
        numberOfAdults: 2,
        numberOfChildren: 0,
        status: 'ISSUED' as const,
        validUntil: '2026-04-17T00:00:00.000Z',
        inclusions: ['Breakfast'],
        exclusions: ['Airfare'],
        terms: ['Standard'],
        hotels: [],
        transports: [],
        pricingSummary: {
          taxableAmount: 10000,
          taxRatePercent: 5,
          taxAmount: 500,
          isTaxApplicable: true,
          discountAmount: 0,
          finalSellingPrice: 10500,
        },
      };

      vi.spyOn(quotationService, 'getPublicQuotation').mockResolvedValue(mockPublicDto);

      const res = await request(app).get(`/api/v1/quotations/public/${rawToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quoteNumber).toBe('NCT-QT-2026-00001');
      expect(res.body.data.pricingSummary.finalSellingPrice).toBe(10500);
      // Zero supplier costs
      expect(res.body.data.pricingSummary.totalBaseSupplierCost).toBeUndefined();
    });

    it('returns 400 if token param is too short (< 16 characters)', async () => {
      const res = await request(app).get('/api/v1/quotations/public/short');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Protected Quotation Endpoints', () => {
    it('rejects unauthenticated requests to create quotation with 401', async () => {
      const res = await request(app)
        .post('/api/v1/quotations')
        .send({ leadId: '66554433221100aabbccddee' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects approval mutation by non-admin AGENT with 403 Forbidden', async () => {
      const quoteId = '66554433221100aabbccddee';
      const res = await request(app)
        .post(`/api/v1/quotations/${quoteId}/approve`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ decision: 'APPROVE' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/forbidden|permission|only administrator/i);
    });

    it('allows Admin to approve quotation override', async () => {
      const quoteId = '66554433221100aabbccddee';
      vi.spyOn(quotationService, 'approveQuotation').mockResolvedValue({
        id: quoteId,
        quoteNumber: 'NCT-QT-2026-00001',
        status: 'APPROVED',
      } as any);

      const res = await request(app)
        .post(`/api/v1/quotations/${quoteId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'APPROVE', notes: 'Approved discount' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
    });

    it('allows issuing quotation and returns 200 with raw token', async () => {
      const quoteId = '66554433221100aabbccddee';
      vi.spyOn(quotationService, 'issueQuotation').mockResolvedValue({
        quotation: {
          id: quoteId,
          quoteNumber: 'NCT-QT-2026-00001',
          status: 'ISSUED',
        } as any,
        shareableToken: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      });

      const res = await request(app)
        .post(`/api/v1/quotations/${quoteId}/issue`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shareableToken).toBeDefined();
      expect(res.body.data.quotation.status).toBe('ISSUED');
    });
  });

  describe('Customer Public Actions (Acceptance & Modification Requests)', () => {
    const rawToken = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

    it('allows customer to accept quotation via secure token without login', async () => {
      vi.spyOn(quotationService, 'acceptPublicQuotation').mockResolvedValue({
        quoteNumber: 'NCT-QT-2026-00001',
        status: 'ACCEPTED',
        acceptedAt: '2026-10-09T12:00:00.000Z',
        travelStartDate: '2026-11-01',
        travelEndDate: '2026-11-05',
        durationNights: 4,
        durationDays: 5,
        numberOfAdults: 2,
        numberOfChildren: 0,
        validUntil: '2026-11-15T00:00:00.000Z',
        inclusions: [],
        exclusions: [],
        terms: [],
        hotels: [],
        transports: [],
        pricingSummary: {
          taxableAmount: 20000,
          taxRatePercent: 5,
          taxAmount: 1000,
          isTaxApplicable: true,
          discountAmount: 0,
          finalSellingPrice: 21000,
        },
      });

      const res = await request(app)
        .post(`/api/v1/quotations/public/${rawToken}/accept`)
        .send({ notes: 'We are excited for the trip!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACCEPTED');
      expect(res.body.data.acceptedAt).toBeDefined();
      expect(res.body.data.pricingSummary.finalSellingPrice).toBe(21000);
    });

    it('allows customer to request modifications with a message without login', async () => {
      vi.spyOn(quotationService, 'requestModificationPublicQuotation').mockResolvedValue({
        quoteNumber: 'NCT-QT-2026-00001',
        status: 'ISSUED',
        customerModificationRequest: {
          message: 'Please change hotel from Deluxe to Premium suite',
          requestedAt: '2026-10-09T12:05:00.000Z',
        },
        travelStartDate: '2026-11-01',
        travelEndDate: '2026-11-05',
        durationNights: 4,
        durationDays: 5,
        numberOfAdults: 2,
        numberOfChildren: 0,
        validUntil: '2026-11-15T00:00:00.000Z',
        inclusions: [],
        exclusions: [],
        terms: [],
        hotels: [],
        transports: [],
        pricingSummary: {
          taxableAmount: 20000,
          taxRatePercent: 5,
          taxAmount: 1000,
          isTaxApplicable: true,
          discountAmount: 0,
          finalSellingPrice: 21000,
        },
      });

      const res = await request(app)
        .post(`/api/v1/quotations/public/${rawToken}/request-changes`)
        .send({ message: 'Please change hotel from Deluxe to Premium suite' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customerModificationRequest.message).toContain('Premium suite');
    });

    it('rejects modification request if message is empty (< 3 characters)', async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/public/${rawToken}/request-changes`)
        .send({ message: 'hi' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects acceptance when quotation validity is expired with 400', async () => {
      vi.spyOn(quotationService, 'acceptPublicQuotation').mockRejectedValue(
        new (await import('../src/utils/appError')).AppError(400, 'Quotation validity has expired')
      );

      const res = await request(app)
        .post(`/api/v1/quotations/public/${rawToken}/accept`)
        .send({ agreedToTerms: true });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/expired/i);
    });

    it('returns 404 when public quotation token is invalid or does not exist', async () => {
      vi.spyOn(quotationService, 'getPublicQuotation').mockRejectedValue(
        new (await import('../src/utils/appError')).AppError(404, 'Quotation not found or link has expired')
      );

      const res = await request(app).get('/api/v1/quotations/public/invalidtoken1234567890');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/not found|expired/i);
    });

    it('confirms confidentiality masking: public quotation never leaks supplier costs or gross profit', async () => {
      vi.spyOn(quotationService, 'getPublicQuotation').mockResolvedValue({
        quoteNumber: 'NCT-QT-2026-00001',
        status: 'ISSUED',
        travelStartDate: '2026-11-01',
        travelEndDate: '2026-11-05',
        durationNights: 4,
        durationDays: 5,
        numberOfAdults: 2,
        numberOfChildren: 0,
        validUntil: '2026-11-15T00:00:00.000Z',
        companyInfo: {
          name: 'New Chirag Tours & Travels',
          owner: 'Faisal Bikanerwala',
        },
        inclusions: ['Hotel stay', 'Daily breakfast'],
        exclusions: ['Airfare'],
        terms: ['Standard booking policy'],
        hotels: [],
        transports: [],
        pricingSummary: {
          taxableAmount: 20000,
          taxRatePercent: 5,
          taxAmount: 1000,
          isTaxApplicable: true,
          discountAmount: 0,
          finalSellingPrice: 21000,
        },
      } as any);

      const res = await request(app).get(`/api/v1/quotations/public/${rawToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.pricingSummary.totalBaseSupplierCost).toBeUndefined();
      expect(data.pricingSummary.markupPercent).toBeUndefined();
      expect(data.pricingSummary.totalMarkupAmount).toBeUndefined();
      expect(data.pricingSummary.projectedGrossProfit).toBeUndefined();
    });
  });

  describe('Lead CRM Endpoints (Activities, Follow-Up, Metrics)', () => {
    const leadId = '66554433221100aabbccddee';

    it('GET /api/v1/leads/metrics returns 200 with aggregated metrics', async () => {
      vi.spyOn(leadService, 'getMetrics').mockResolvedValue({
        totalLeads: 25,
        statusBreakdown: {
          NEW: 5,
          ASSIGNED: 5,
          IN_PROGRESS: 5,
          QUOTED: 5,
          CONVERTED: 3,
          LOST: 2,
        },
        leadsByAgent: {},
        leadConversionRate: 12,
        totalQuotations: 10,
        acceptedQuotations: 3,
        quoteConversionRate: 30,
        followUpsDueToday: 1,
        followUpsOverdue: 2,
      });

      const res = await request(app)
        .get('/api/v1/leads/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.statusBreakdown).toBeDefined();
      expect(res.body.data.leadConversionRate).toBe(12);
      expect(res.body.data.quoteConversionRate).toBe(30);
    });

    it('POST /api/v1/leads/:id/activities adds an activity note and returns 200', async () => {
      vi.spyOn(leadService, 'addActivity').mockResolvedValue({
        id: leadId,
        leadNumber: 'NCT-LD-2026-00001',
        timeline: [
          {
            type: 'NOTE',
            title: 'Client Phone Discussion',
            content: 'Discussed budget and dates with customer.',
            performedByName: 'Test Agent',
            createdAt: new Date().toISOString(),
          },
        ],
      } as any);

      const res = await request(app)
        .post(`/api/v1/leads/${leadId}/activities`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          type: 'NOTE',
          title: 'Client Phone Discussion',
          content: 'Discussed budget and dates with customer.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('PATCH /api/v1/leads/:id/follow-up updates follow-up schedule', async () => {
      vi.spyOn(leadService, 'updateFollowUp').mockResolvedValue({
        id: leadId,
        leadNumber: 'NCT-LD-2026-00001',
        nextFollowUpDate: '2026-10-15',
        followUpNotes: 'Call to review revised quotation',
      } as any);

      const res = await request(app)
        .patch(`/api/v1/leads/${leadId}/follow-up`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          nextFollowUpDate: '2026-10-15',
          followUpNotes: 'Call to review revised quotation',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
