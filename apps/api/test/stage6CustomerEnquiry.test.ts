import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { destinationRepository } from '../src/repositories/destination.repository';
import { tourPackageRepository } from '../src/repositories/package.repository';
import { customerRepository } from '../src/repositories/customer.repository';
import { leadRepository } from '../src/repositories/lead.repository';
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { userRepository } from '../src/repositories/user.repository';
import { signAccessToken } from '../src/utils/token.utils';
import { publicEnquirySchema } from '@chirag/validation';
import * as sequenceModule from '../src/models/sequence.model';

describe('Phase D Milestone D.1 — Customer Enquiry & Package Publication Guards', () => {
  const adminId = '66554433221100aabbccddee';
  const destId = '66554433221100aabbccdd55';
  const publishedPkgId = '66554433221100aabbccdd66';
  const unpublishedPkgId = '66554433221100aabbccdd77';

  const adminToken = signAccessToken({
    sub: adminId,
    role: 'ADMIN',
    mobile: '9876543210',
  });

  const mockDestination = {
    _id: new mongoose.Types.ObjectId(destId),
    name: 'Kashmir Paradise',
    slug: 'kashmir-paradise',
    isActive: true,
    toDto: () => ({ id: destId, name: 'Kashmir Paradise', slug: 'kashmir-paradise', isActive: true }),
  };

  const mockPublishedPackage = {
    _id: new mongoose.Types.ObjectId(publishedPkgId),
    title: 'Splendors of Kashmir 6N7D',
    slug: 'splendors-of-kashmir-6n7d',
    destinationId: new mongoose.Types.ObjectId(destId),
    isPublished: true,
    toDto: () => ({
      id: publishedPkgId,
      title: 'Splendors of Kashmir 6N7D',
      slug: 'splendors-of-kashmir-6n7d',
      destinationId: destId,
      isPublished: true,
    }),
  };

  const mockUnpublishedPackage = {
    _id: new mongoose.Types.ObjectId(unpublishedPkgId),
    title: 'Secret Kashmir Winter Trek (Draft)',
    slug: 'secret-kashmir-winter-trek-draft',
    destinationId: new mongoose.Types.ObjectId(destId),
    isPublished: false,
    toDto: () => ({
      id: unpublishedPkgId,
      title: 'Secret Kashmir Winter Trek (Draft)',
      slug: 'secret-kashmir-winter-trek-draft',
      destinationId: destId,
      isPublished: false,
    }),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);
    vi.spyOn(sequenceModule, 'getNextSequenceValue').mockResolvedValue(42);

    // Mock admin user lookup
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
      return null;
    });

    // Mock destination lookups
    vi.spyOn(destinationRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === destId) return mockDestination as any;
      return null;
    });

    // Mock tour package lookups
    vi.spyOn(tourPackageRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === publishedPkgId) return mockPublishedPackage as any;
      if (id === unpublishedPkgId) return mockUnpublishedPackage as any;
      return null;
    });

    vi.spyOn(tourPackageRepository, 'findBySlug').mockImplementation(async (slug: string) => {
      if (slug === 'splendors-of-kashmir-6n7d') return mockPublishedPackage as any;
      if (slug === 'secret-kashmir-winter-trek-draft') return mockUnpublishedPackage as any;
      return null;
    });
  });

  describe('Section 1: Package Publication Guards', () => {
    it('allows anonymous visitor to view a published package by slug', async () => {
      const res = await request(app).get('/api/v1/packages/slug/splendors-of-kashmir-6n7d');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('splendors-of-kashmir-6n7d');
    });

    it('blocks anonymous visitor from viewing an unpublished draft package by slug (returns 404)', async () => {
      const res = await request(app).get('/api/v1/packages/slug/secret-kashmir-winter-trek-draft');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('blocks anonymous visitor from viewing an unpublished draft package by ID (returns 404)', async () => {
      const res = await request(app).get(`/api/v1/packages/${unpublishedPkgId}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('allows authenticated administrator to view an unpublished draft package by slug', async () => {
      const res = await request(app)
        .get('/api/v1/packages/slug/secret-kashmir-winter-trek-draft')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isPublished).toBe(false);
    });

    it('allows authenticated administrator to view an unpublished draft package by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/packages/${unpublishedPkgId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('forces isPublished: true filter when anonymous visitor lists packages', async () => {
      const findManySpy = vi.spyOn(tourPackageRepository, 'findMany').mockResolvedValue({
        packages: [mockPublishedPackage as any],
        total: 1,
      });

      const res = await request(app).get('/api/v1/packages');
      expect(res.status).toBe(200);
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isPublished: true,
        })
      );
    });
  });

  describe('Section 2: Public Enquiry Schema Validation', () => {
    it('accepts valid public enquiry payload with standard Indian 10-digit mobile', () => {
      const validPayload = {
        fullName: 'Rahul Sharma',
        mobile: '9876543210',
        email: 'rahul.sharma@example.com',
        destinationId: destId,
        packageId: publishedPkgId,
        tentativeTravelDate: '2026-12-15',
        durationNights: 5,
        numberOfAdults: 2,
        numberOfChildren: 1,
        budgetEstimate: 75000,
        specialRequirements: 'Vegetarian meals preferred and lake-view room.',
      };

      const result = publicEnquirySchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects invalid mobile numbers', () => {
      const invalidPayload = {
        fullName: 'Rahul Sharma',
        mobile: '12345', // invalid
        destinationId: destId,
      };

      const result = publicEnquirySchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('rejects malformed destination IDs', () => {
      const invalidPayload = {
        fullName: 'Rahul Sharma',
        mobile: '9876543210',
        destinationId: 'not-a-mongo-id',
      };

      const result = publicEnquirySchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('Section 3: Public Enquiry Endpoint Execution & Customer Deduplication', () => {
    it('successfully processes public enquiry, deduplicating customer and creating lead', async () => {
      const customerId = '66554433221100aabbccddee';
      const leadId = '66554433221100aabbccddff';

      const mockCustomer = {
        _id: new mongoose.Types.ObjectId(customerId),
        fullName: 'Amit Patel',
        mobile: '9876543210',
        email: 'amit.patel@example.com',
        source: 'CUSTOMER_WEB',
      };

      const mockLead = {
        _id: new mongoose.Types.ObjectId(leadId),
        leadNumber: 'NCT-LD-2026-00042',
        createdAt: new Date(),
      };

      // Mock customer lookup and creation
      vi.spyOn(customerRepository, 'findByMobile').mockResolvedValue(null);
      vi.spyOn(customerRepository, 'create').mockResolvedValue(mockCustomer as any);
      vi.spyOn(leadRepository, 'create').mockResolvedValue(mockLead as any);

      const res = await request(app)
        .post('/api/v1/leads/public-enquiry')
        .send({
          fullName: 'Amit Patel',
          mobile: '+91 98765 43210',
          email: 'amit.patel@example.com',
          destinationId: destId,
          packageId: publishedPkgId,
          tentativeTravelDate: '2026-11-20',
          durationNights: 6,
          numberOfAdults: 2,
          numberOfChildren: 0,
          specialRequirements: 'Honeymoon arrangement requested.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.leadNumber).toBe('NCT-LD-2026-00042');
      expect(res.body.data.destinationName).toBe('Kashmir Paradise');
      expect(res.body.data.customerName).toBe('Amit Patel');
    });

    it('reuses existing customer record on duplicate phone number inquiry', async () => {
      const existingCustomerId = '66554433221100aabbccddee';
      const leadId = '66554433221100aabbccee01';

      const existingCustomer = {
        _id: new mongoose.Types.ObjectId(existingCustomerId),
        fullName: 'Amit Patel',
        mobile: '9876543210',
        email: 'amit.patel@example.com',
        source: 'CUSTOMER_WEB',
      };

      const mockLead = {
        _id: new mongoose.Types.ObjectId(leadId),
        leadNumber: 'NCT-LD-2026-00043',
        createdAt: new Date(),
      };

      vi.spyOn(customerRepository, 'findByMobile').mockResolvedValue(existingCustomer as any);
      const customerCreateSpy = vi.spyOn(customerRepository, 'create');
      vi.spyOn(leadRepository, 'create').mockResolvedValue(mockLead as any);

      const res = await request(app)
        .post('/api/v1/leads/public-enquiry')
        .send({
          fullName: 'Amit Patel',
          mobile: '9876543210',
          destinationId: destId,
          numberOfAdults: 4,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(customerCreateSpy).not.toHaveBeenCalled();
      expect(res.body.data.leadNumber).toBe('NCT-LD-2026-00043');
    });

    it('silently drops bot submissions when honeypot field is populated without creating DB records', async () => {
      const customerCreateSpy = vi.spyOn(customerRepository, 'create');
      const leadCreateSpy = vi.spyOn(leadRepository, 'create');

      const res = await request(app)
        .post('/api/v1/leads/public-enquiry')
        .send({
          fullName: 'Spam Bot',
          mobile: '9876543210',
          destinationId: destId,
          honeypot: 'http://malicious-spam-link.ru',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.leadNumber).toBe('NCT-LD-RECEIVED');
      expect(customerCreateSpy).not.toHaveBeenCalled();
      expect(leadCreateSpy).not.toHaveBeenCalled();
    });

    it('rejects inquiry for an inactive destination with 404', async () => {
      vi.spyOn(destinationRepository, 'findById').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(destId),
        name: 'Closed Circuit',
        isActive: false,
      } as any);

      const res = await request(app)
        .post('/api/v1/leads/public-enquiry')
        .send({
          fullName: 'Traveler',
          mobile: '9876543210',
          destinationId: destId,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
