import mongoose from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app';
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { destinationRepository } from '../src/repositories/destination.repository';
import { hotelRepository } from '../src/repositories/hotel.repository';
import { roomCategoryRepository } from '../src/repositories/roomCategory.repository';
import { seasonalRateCardRepository } from '../src/repositories/seasonalRateCard.repository';
import { seasonRepository } from '../src/repositories/season.repository';
import { taxConfigRepository } from '../src/repositories/taxConfig.repository';
import { transportRepository } from '../src/repositories/transport.repository';
import { userRepository } from '../src/repositories/user.repository';
import { signAccessToken } from '../src/utils/token.utils';

describe('Phase 2: Master Data HTTP Endpoints & Route Security', () => {
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

    // Default mock user lookup for auth middleware
    vi.spyOn(userRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === adminId) {
        return {
          _id: { toString: () => adminId },
          role: 'ADMIN',
          status: 'ACTIVE',
          mobile: '9876543210',
          fullName: 'Faisal Bikanerwala',
        } as any;
      }
      if (id === agentId) {
        return {
          _id: { toString: () => agentId },
          role: 'AGENT',
          status: 'ACTIVE',
          mobile: '9876543211',
          fullName: 'Agent Sharma',
        } as any;
      }
      return null;
    });
  });

  // ==========================================
  // ROUTE SECURITY: DESTINATIONS
  // ==========================================
  describe('Destinations Endpoints', () => {
    it('GET /api/v1/destinations allows public reading with envelope', async () => {
      vi.spyOn(destinationRepository, 'findMany').mockResolvedValue({
        destinations: [],
        total: 0,
      });

      const res = await request(app).get('/api/v1/destinations');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta).toHaveProperty('timestamp');
    });

    it('POST /api/v1/destinations rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/v1/destinations')
        .send({ name: 'Goa', region: 'WEST' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/v1/destinations rejects AGENT with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/destinations')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ name: 'Goa', region: 'WEST' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('POST /api/v1/destinations validates payload and returns 400 on malformed body', async () => {
      const res = await request(app)
        .post('/api/v1/destinations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ region: 'INVALID_REGION' }); // Missing required 'name' and invalid enum

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // ROUTE SECURITY: HOTELS & RATE CARDS
  // ==========================================
  describe('Hotels and Rate Cards Endpoints', () => {
    it('GET /api/v1/hotels allows reading active hotels', async () => {
      vi.spyOn(hotelRepository, 'findMany').mockResolvedValue({
        hotels: [],
        total: 0,
      });
      vi.spyOn(roomCategoryRepository, 'findByHotelIds').mockResolvedValue([]);
      vi.spyOn(seasonalRateCardRepository, 'findMany').mockResolvedValue({ rateCards: [] } as any);

      const res = await request(app).get('/api/v1/hotels');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('POST /api/v1/hotels rejects non-admin with 403', async () => {
      const res = await request(app)
        .post('/api/v1/hotels')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ name: 'Test Hotel' });

      expect(res.status).toBe(403);
    });

    it('POST /api/v1/hotels/rate-cards rejects non-admin with 403', async () => {
      const res = await request(app)
        .post('/api/v1/hotels/rate-cards')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          hotelId: new mongoose.Types.ObjectId().toString(),
          roomCategoryId: new mongoose.Types.ObjectId().toString(),
          seasonId: new mongoose.Types.ObjectId().toString(),
          mealPlan: 'CP',
          baseCostPerNight: 2000,
          standardSellingPrice: 3500,
          validFrom: '2026-10-01',
          validTo: '2026-12-31',
        });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // ROUTE SECURITY: SEASONS
  // ==========================================
  describe('Seasons Endpoints', () => {
    it('GET /api/v1/seasons/resolve calculates date season', async () => {
      const destId = new mongoose.Types.ObjectId().toString();
      vi.spyOn(seasonRepository, 'findByDestination').mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/v1/seasons/resolve?destinationId=${destId}&date=2026-11-15`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.seasonType).toBe('REGULAR');
    });

    it('POST /api/v1/seasons rejects non-admin with 403', async () => {
      const res = await request(app)
        .post('/api/v1/seasons')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          name: 'Peak Season',
          seasonType: 'PEAK',
          destinationId: new mongoose.Types.ObjectId().toString(),
          startDate: '2026-12-01',
          endDate: '2026-12-31',
        });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // ROUTE SECURITY: TRANSPORT
  // ==========================================
  describe('Transport Endpoints', () => {
    it('POST /api/v1/transport/vendors rejects non-admin with 403', async () => {
      const res = await request(app)
        .post('/api/v1/transport/vendors')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ businessName: 'Vendor 1' });

      expect(res.status).toBe(403);
    });

    it('POST /api/v1/transport/tariffs rejects non-admin with 403', async () => {
      const res = await request(app)
        .post('/api/v1/transport/tariffs')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          destinationId: new mongoose.Types.ObjectId().toString(),
          vehicleCategory: 'SEDAN',
          tariffBasis: 'PER_DAY',
          baseSupplierCost: 2000,
          standardSellingRate: 3000,
        });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // ROUTE SECURITY: TAX CONFIG
  // ==========================================
  describe('Taxes Endpoints', () => {
    it('GET /api/v1/taxes returns tax rule list', async () => {
      vi.spyOn(taxConfigRepository, 'findMany').mockResolvedValue([]);

      const res = await request(app).get('/api/v1/taxes');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('POST /api/v1/taxes rejects non-admin with 403', async () => {
      const res = await request(app)
        .post('/api/v1/taxes')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          name: 'Custom GST Rule',
          ratePercent: 5,
        });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // MASTER DATA SAFETY & REFERENCE CONSTRAINTS
  // ==========================================
  describe('Master Data Safety & Schedule Lock Protection', () => {
    it('PATCH /api/v1/transport/vehicles/:id rejects deactivation if vehicle has active schedule locks', async () => {
      const vehicleId = '66554433221100aabbccdd55';
      vi.spyOn(transportRepository, 'findVehicleById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(vehicleId),
        vendorId: new mongoose.Types.ObjectId(),
        registrationNumber: 'DL01AB1234',
        model: 'Innova Crysta',
        toDto: () => ({ id: vehicleId, registrationNumber: 'DL01AB1234', status: 'AVAILABLE' }),
      } as any);

      // Simulate active schedule locks exist
      const { transportScheduleLockRepository } = await import('../src/repositories/transportScheduleLock.repository');
      vi.spyOn(transportScheduleLockRepository, 'countActiveLocksForResource').mockResolvedValue(2);

      const res = await request(app)
        .patch(`/api/v1/transport/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('active schedule lock(s)');
    });

    it('PATCH /api/v1/transport/drivers/:id rejects off-duty status if driver has active schedule locks', async () => {
      const driverId = '66554433221100aabbccdd66';
      vi.spyOn(transportRepository, 'findDriverById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(driverId),
        vendorId: new mongoose.Types.ObjectId(),
        licenseNumber: 'DL1234567890123',
        fullName: 'Ramesh Kumar',
        toDto: () => ({ id: driverId, fullName: 'Ramesh Kumar', status: 'ACTIVE' }),
      } as any);

      const { transportScheduleLockRepository } = await import('../src/repositories/transportScheduleLock.repository');
      vi.spyOn(transportScheduleLockRepository, 'countActiveLocksForResource').mockResolvedValue(1);

      const res = await request(app)
        .patch(`/api/v1/transport/drivers/${driverId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'OFF_DUTY' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('active schedule lock(s)');
    });

    it('DELETE /api/v1/seasons/:id rejects deletion when seasonal rate cards are linked', async () => {
      const seasonId = '66554433221100aabbccdd77';
      vi.spyOn(seasonRepository, 'findById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(seasonId),
        name: 'Peak Season 2026',
        toDto: () => ({ id: seasonId, name: 'Peak Season 2026' }),
      } as any);

      const { seasonalRateCardRepository } = await import('../src/repositories/seasonalRateCard.repository');
      vi.spyOn(seasonalRateCardRepository, 'findMany').mockResolvedValue({
        rateCards: [{ _id: new mongoose.Types.ObjectId() } as any],
        total: 1,
      });

      const res = await request(app)
        .delete(`/api/v1/seasons/${seasonId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('seasonal rate card(s) are linked to this season');
    });
  });
});
