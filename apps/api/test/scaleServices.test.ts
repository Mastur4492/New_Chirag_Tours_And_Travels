import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { cacheService } from '../src/services/cache.service';
import { jobQueueService } from '../src/services/jobQueue.service';
import { pdfService } from '../src/services/pdf.service';
import { whatsappService } from '../src/services/whatsapp.service';
import { app } from '../src/app';

describe('Scale Phase Services: Caching, Async Job Queue, PDF Generation & WhatsApp Webhooks', () => {
  beforeEach(async () => {
    await cacheService.flush();
  });

  describe('1. CacheService & TTL Engine', () => {
    it('sets and retrieves items from cache', async () => {
      await cacheService.set('test:key1', { hello: 'world' }, 60);
      const val = await cacheService.get<{ hello: string }>('test:key1');
      expect(val).toEqual({ hello: 'world' });
    });

    it('returns null on cache miss', async () => {
      const val = await cacheService.get('test:missing');
      expect(val).toBeNull();
    });

    it('getOrSet executes producer on miss and uses cache on hit', async () => {
      let callCount = 0;
      const producer = async () => {
        callCount++;
        return { data: 'fresh' };
      };

      const res1 = await cacheService.getOrSet('test:getOrSet', producer, 60);
      expect(res1).toEqual({ data: 'fresh' });
      expect(callCount).toBe(1);

      const res2 = await cacheService.getOrSet('test:getOrSet', producer, 60);
      expect(res2).toEqual({ data: 'fresh' });
      expect(callCount).toBe(1); // Cached! No second producer call
    });

    it('invalidates matching keys with delPattern', async () => {
      await cacheService.set('season:resolve:dest1:2026-11-01', 'PEAK');
      await cacheService.set('season:resolve:dest1:2026-11-02', 'PEAK');
      await cacheService.set('hotel:rates:h1', { rate: 5000 });

      const deleted = await cacheService.delPattern('season:');
      expect(deleted).toBe(2);

      expect(await cacheService.get('season:resolve:dest1:2026-11-01')).toBeNull();
      expect(await cacheService.get('season:resolve:dest1:2026-11-02')).toBeNull();
      expect(await cacheService.get('hotel:rates:h1')).not.toBeNull();
    });

    it('provides diagnostic statistics', () => {
      const stats = cacheService.getStats();
      expect(stats).toHaveProperty('engine');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRatioPercent');
    });
  });

  describe('2. Background Job Queue & Asynchronous Workers', () => {
    it('enqueues and processes a registered job', async () => {
      let processedPayload: any = null;
      jobQueueService.registerHandler('PROCESS_LEAD_NOTIFICATIONS', async (payload, updateProgress) => {
        updateProgress(50);
        processedPayload = payload;
        return { success: true };
      });

      const job = await jobQueueService.enqueue('PROCESS_LEAD_NOTIFICATIONS', { leadId: 'lead_123' });
      expect(job.status).toBe('QUEUED');
      expect(job.type).toBe('PROCESS_LEAD_NOTIFICATIONS');

      // Wait a tick for async worker
      await new Promise((r) => setTimeout(r, 60));

      const updated = jobQueueService.getJob(job.id);
      expect(updated?.status).toBe('COMPLETED');
      expect(updated?.progressPercent).toBe(100);
      expect(processedPayload).toEqual({ leadId: 'lead_123' });
    });

    it('returns queue statistics', () => {
      const stats = jobQueueService.getQueueStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('completed');
    });
  });

  describe('3. PDF Proposal & Invoice Generation Engine', () => {
    const mockQuote: any = {
      quotationNumber: 'QT-2026-TEST-99',
      destinationName: 'Kashmir Valley',
      durationNights: 4,
      numberOfAdults: 2,
      numberOfChildren: 1,
      startDate: '2026-11-10T00:00:00.000Z',
      customerName: 'Aarav Sharma',
      customerMobile: '+91 98765 43210',
      customerEmail: 'aarav@example.com',
      pricing: {
        totalAmount: 48500,
        taxAmount: 2310,
        baseCost: 46190,
      },
      itinerary: [
        {
          dayNumber: 1,
          title: 'Arrival in Srinagar & Dal Lake Shikara',
          description: 'Meet and greet at airport, transfer to luxury houseboat.',
          hotelName: 'Wangnoo Heritage Houseboats',
          roomCategoryName: 'Royal Suite',
          mealPlan: 'MAP',
          vehicleModel: 'Toyota Innova Crysta',
        },
      ],
    };

    it('generates high-fidelity HTML proposal with branding and bank details', () => {
      const html = pdfService.generateQuotationHtml(mockQuote);
      expect(html).toContain('New Chirag Tours & Travels');
      expect(html).toContain('Faisal Bikanerwala');
      expect(html).toContain('+91 99786 55529');
      expect(html).toContain('QT-2026-TEST-99');
      expect(html).toContain('Kashmir Valley');
      expect(html).toContain('Aarav Sharma');
      expect(html).toContain('48,500');
      expect(html).toContain('Wangnoo Heritage Houseboats');
      expect(html).toContain('Toyota Innova Crysta');
      expect(html).toContain('HDFC0001842');
    });
  });

  describe('4. WhatsApp Automation & Webhook Integration', () => {
    it('dispatches quotation brochure message', async () => {
      const res = await whatsappService.sendQuoteBrochure({
        token: 'public_token_abc_123',
        quotationNumber: 'QT-2026-001',
        customerName: 'Zoya Patel',
        customerMobile: '+919978655529',
        destinationName: 'Kerala Backwaters',
        durationNights: 5,
        totalAmount: 62000,
      });

      expect(res.success).toBe(true);
      expect(res.messageId).toBeDefined();
    });

    it('dispatches booking confirmation message', async () => {
      const res = await whatsappService.sendBookingConfirmation({
        bookingNumber: 'BK-2026-0042',
        customerName: 'Zoya Patel',
        customerMobile: '+919978655529',
        destinationName: 'Kerala Backwaters',
        travelDate: '15 Nov 2026',
        totalAmount: 62000,
        advancePaid: 20000,
      });

      expect(res.success).toBe(true);
    });

    it('GET /api/v1/webhooks/whatsapp verifies challenge with correct token', async () => {
      const res = await request(app)
        .get('/api/v1/webhooks/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'chirag_travels_webhook_secret_2026',
          'hub.challenge': 'CHALLENGE_CODE_12345',
        });

      expect(res.status).toBe(200);
      expect(res.text).toBe('CHALLENGE_CODE_12345');
    });

    it('GET /api/v1/webhooks/whatsapp rejects challenge with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/webhooks/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': 'CHALLENGE_CODE_12345',
        });

      expect(res.status).toBe(403);
    });

    it('POST /api/v1/webhooks/whatsapp handles incoming greeting and replies with menu', async () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '919978655529',
                      text: { body: 'Hello' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/webhooks/whatsapp')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'EVENT_RECEIVED' });
    });
  });
});
