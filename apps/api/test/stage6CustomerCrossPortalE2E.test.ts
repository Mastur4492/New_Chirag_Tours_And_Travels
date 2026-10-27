import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { UserModel } from '../src/models/user.model';
import { DestinationModel } from '../src/models/destination.model';
import { TourPackageModel } from '../src/models/tourPackage.model';
import { CustomerModel } from '../src/models/customer.model';
import { LeadModel } from '../src/models/lead.model';
import { QuotationModel } from '../src/models/quotation.model';
import { BookingModel } from '../src/models/booking.model';
import { SequenceModel } from '../src/models/sequence.model';
import { TaxConfigModel } from '../src/models/taxConfig.model';
import { HotelModel } from '../src/models/hotel.model';
import { VehicleModel } from '../src/models/vehicle.model';
import { VehicleVendorModel } from '../src/models/vehicleVendor.model';
import { TransportTariffModel } from '../src/models/transportTariff.model';
import { signAccessToken } from '../src/utils/token.utils';
import { quotationService } from '../src/services/quotation.service';

const testDbName = `chirag_test_phase_d_customer_${Date.now()}`;
const testMongoUri = `mongodb://localhost:27017/${testDbName}`;

describe('Phase D Milestone D.6 — Live Cross-Portal & End-to-End Customer Web Tests', () => {
  let adminUser: any;
  let adminToken: string;
  let destination: any;
  let publishedPackage: any;
  let draftPackage: any;
  let hotel: any;
  let roomCategory: any;
  let vehicle: any;
  let tariff: any;

  beforeAll(async () => {
    // Connect to isolated, disposable test database
    await mongoose.connect(testMongoUri);

    // Bootstrap test Admin user
    adminUser = await UserModel.create({
      fullName: 'Faisal Bikanerwala',
      mobile: '9978655529',
      email: 'admin@chiragtravels.com',
      passwordHash: 'hashed_pw_for_test',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    adminToken = signAccessToken({
      sub: adminUser._id.toString(),
      role: 'ADMIN',
      mobile: adminUser.mobile,
    });

    // Create Destination
    destination = await DestinationModel.create({
      name: 'Kashmir Valley Circuit',
      slug: 'kashmir-valley-circuit',
      country: 'India',
      state: 'Jammu and Kashmir',
      region: 'NORTH',
      description: 'The crown of India with Dal Lake and Gulmarg snow meadows.',
      isActive: true,
      createdBy: adminUser._id,
    });

    // Create Vehicle Vendor, Vehicle & Tariff
    const vendor = await VehicleVendorModel.create({
      businessName: 'Kashmir Valley Tourist Cabs',
      contactPerson: 'Gulzar Ahmed',
      phone: '9876543211',
      city: 'Srinagar',
      isActive: true,
    });

    vehicle = await VehicleModel.create({
      vendorId: vendor._id,
      model: 'Toyota Innova Crysta',
      category: 'SUV',
      registrationNumber: 'JK01AB9988',
      seatingCapacity: 6,
      hasAC: true,
      status: 'AVAILABLE',
    });

    tariff = await TransportTariffModel.create({
      destinationId: destination._id,
      vehicleCategory: 'SUV',
      seasonType: 'REGULAR',
      tariffBasis: 'PER_DAY',
      circuitName: 'Kashmir Sightseeing 2026',
      baseSupplierCost: 350000,
      standardSellingRate: 450000,
      driverDailyAllowanceCost: 50000,
      isTollParkingIncluded: true,
      isNightHaltIncluded: true,
      nightHaltCharge: 80000,
      isActive: true,
    });

    // Create Published Tour Package
    publishedPackage = await TourPackageModel.create({
      title: 'Splendors of Kashmir 6N7D',
      slug: 'splendors-of-kashmir-6n7d',
      destinationId: destination._id,
      durationNights: 6,
      durationDays: 7,
      overview: 'Srinagar, Gulmarg, Pahalgam and Sonmarg signature package.',
      dayWiseItinerary: [
        {
          dayNumber: 1,
          title: 'Arrival in Srinagar & Shikara Ride',
          description: 'Airport reception and Dal Lake houseboat check-in with evening sunset Shikara ride.',
          nightStayDestination: 'Srinagar',
          mealsIncluded: ['Dinner'],
          activities: ['Dal Lake Shikara'],
        },
        {
          dayNumber: 2,
          title: 'Srinagar to Gulmarg Day Excursion',
          description: 'Gondola ride up to Apharwat Peak and snow meadow exploration.',
          nightStayDestination: 'Srinagar',
          mealsIncluded: ['Breakfast', 'Dinner'],
          activities: ['Gulmarg Gondola'],
        },
      ],
      inclusions: ['Houseboat & Hotel Stays', 'Breakfast & Dinner', 'Private Chauffeur Innova'],
      exclusions: ['Flights', 'Gondola Phase 2 Tickets', 'Personal Tips'],
      isPublished: true,
      startingPrice: 38500,
      createdBy: adminUser._id,
    });

    // Create Unpublished Draft Package
    draftPackage = await TourPackageModel.create({
      title: 'Secret Kashmir Winter Trek (Internal Draft)',
      slug: 'secret-kashmir-winter-trek-internal-draft',
      destinationId: destination._id,
      durationNights: 4,
      durationDays: 5,
      overview: 'Internal draft itinerary for adventure groups.',
      dayWiseItinerary: [
        {
          dayNumber: 1,
          title: 'Internal Planning Day',
          description: 'Draft route inspection.',
          nightStayDestination: 'Srinagar',
          mealsIncluded: [],
          activities: [],
        },
      ],
      inclusions: [],
      exclusions: [],
      isPublished: false,
      createdBy: adminUser._id,
    });
  });

  afterAll(async () => {
    // Drop disposable test database and clean up connection
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  describe('Scenario 1: Public Destination & Package Publication Isolation', () => {
    it('allows anonymous visitor to discover active destination by slug', async () => {
      const res = await request(app).get(`/api/v1/destinations/slug/${destination.slug}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Kashmir Valley Circuit');
    });

    it('allows anonymous visitor to view published package by slug', async () => {
      const res = await request(app).get(`/api/v1/packages/slug/${publishedPackage.slug}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Splendors of Kashmir 6N7D');
      expect(res.body.data.isPublished).toBe(true);
    });

    it('denies anonymous visitor access to unpublished draft package (returns 404)', async () => {
      const res = await request(app).get(`/api/v1/packages/slug/${draftPackage.slug}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('denies anonymous visitor access to draft package by ObjectId (returns 404)', async () => {
      const res = await request(app).get(`/api/v1/packages/${draftPackage._id}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('filters out draft packages when anonymous visitor lists packages', async () => {
      const res = await request(app).get('/api/v1/packages');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const pkgIds = res.body.data.map((p: any) => p.id);
      expect(pkgIds).toContain(publishedPackage._id.toString());
      expect(pkgIds).not.toContain(draftPackage._id.toString());
    });
  });

  describe('Scenario 2: Public Enquiry Submission, CRM Ingestion & Deduplication', () => {
    let leadNumberFromFirstEnquiry: string;

    it('successfully processes public enquiry with CUSTOMER_WEB source and sequential lead number', async () => {
      const res = await request(app)
        .post('/api/v1/leads/public-enquiry')
        .send({
          fullName: 'Tariq Khan',
          mobile: '+91 98250 12345',
          email: 'tariq.khan@example.com',
          destinationId: destination._id.toString(),
          packageId: publishedPackage._id.toString(),
          tentativeTravelDate: '2026-11-20',
          durationNights: 6,
          numberOfAdults: 2,
          numberOfChildren: 1,
          budgetEstimate: 80000,
          specialRequirements: 'Vegetarian meals and heater in room.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customerName).toBe('Tariq Khan');
      expect(res.body.data.destinationName).toBe('Kashmir Valley Circuit');
      expect(res.body.data.leadNumber).toMatch(/^NCT-LD-\d{4}-\d{5}$/);
      leadNumberFromFirstEnquiry = res.body.data.leadNumber;

      // Verify record in database
      const createdLead = await LeadModel.findOne({ leadNumber: leadNumberFromFirstEnquiry });
      expect(createdLead).not.toBeNull();
      expect(createdLead?.source).toBe('CUSTOMER_WEB');
      expect(createdLead?.status).toBe('NEW');
      expect(createdLead?.numberOfAdults).toBe(2);

      const createdCustomer = await CustomerModel.findById(createdLead?.customerId);
      expect(createdCustomer).not.toBeNull();
      expect(createdCustomer?.mobile).toBe('9825012345'); // Normalized Indian 10-digit
      expect(createdCustomer?.source).toBe('CUSTOMER_WEB');
    });

    it('deduplicates customer on subsequent enquiry with same phone number', async () => {
      const customerCountBefore = await CustomerModel.countDocuments();

      const res = await request(app)
        .post('/api/v1/leads/public-enquiry')
        .send({
          fullName: 'Tariq Khan (Family Trip)',
          mobile: '9825012345', // Same normalized number
          destinationId: destination._id.toString(),
          durationNights: 4,
          numberOfAdults: 4,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.leadNumber).not.toBe(leadNumberFromFirstEnquiry);

      const customerCountAfter = await CustomerModel.countDocuments();
      expect(customerCountAfter).toBe(customerCountBefore); // No new customer created
    });

    it('silently traps bot submissions when honeypot is filled without modifying database', async () => {
      const customerCountBefore = await CustomerModel.countDocuments();
      const leadCountBefore = await LeadModel.countDocuments();

      const res = await request(app)
        .post('/api/v1/leads/public-enquiry')
        .send({
          fullName: 'Spam Bot Automator',
          mobile: '9999999999',
          destinationId: destination._id.toString(),
          honeypot: 'https://spam-marketing-payload.xyz',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.leadNumber).toBe('NCT-LD-RECEIVED');

      const customerCountAfter = await CustomerModel.countDocuments();
      const leadCountAfter = await LeadModel.countDocuments();

      expect(customerCountAfter).toBe(customerCountBefore);
      expect(leadCountAfter).toBe(leadCountBefore);
    });

    it('allows Admin to find and manage the ingested public leads in CRM', async () => {
      const res = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const leadNumbers = res.body.data.map((l: any) => l.leadNumber);
      expect(leadNumbers).toContain(leadNumberFromFirstEnquiry);
    });
  });

  describe('Scenario 3: Customer Public Quotation Experience & Booking Request Acceptance', () => {
    let customerDoc: any;
    let leadDoc: any;
    let quoteToken: string;
    let quotationId: string;

    beforeAll(async () => {
      customerDoc = await CustomerModel.findOne({ mobile: '9825012345' });
      leadDoc = await LeadModel.findOne({ customerId: customerDoc._id });

      // Create confirmed tax rule satisfying Phase C.1 Tax Confirmation Guard
      await TaxConfigModel.create({
        name: 'GST Tour Operator Service 5%',
        taxType: 'GST',
        ratePercent: 5,
        isApplicable: true,
        isDefault: true,
        isConfirmed: true,
        confirmedBy: adminUser._id,
        confirmedAt: new Date(),
      });

      // Create quotation using quotationService
      const quote = await quotationService.createQuotation(
        {
          leadId: leadDoc._id.toString(),
          destinationId: destination._id.toString(),
          packageId: publishedPackage._id.toString(),
          travelStartDate: '2026-11-20',
          travelEndDate: '2026-11-26',
          numberOfAdults: 2,
          numberOfChildren: 1,
          markupPercent: 10,
          discountPercent: 0,
          isTaxApplicable: true,
          hotels: [],
          transports: [
            {
              vehicleId: vehicle._id.toString(),
              tariffId: tariff._id.toString(),
              pricingBasis: 'PER_DAY',
              numberOfDays: 6,
              notes: 'Chauffeur driven sightseeing',
            },
          ],
          inclusions: ['Dedicated Innova Chauffeur with parking and driver allowance'],
          exclusions: ['Flight Tickets', 'Monument Entries'],
          validityDays: 14,
        },
        {
          userId: adminUser._id.toString(),
          role: 'ADMIN',
          ipAddress: '127.0.0.1',
          userAgent: 'TestAgent/1.0',
        }
      );

      quotationId = quote.id;

      // Issue quotation to generate public token
      const issued = await quotationService.issueQuotation(
        quotationId,
        {
          userId: adminUser._id.toString(),
          role: 'ADMIN',
          ipAddress: '127.0.0.1',
          userAgent: 'TestAgent/1.0',
        }
      );

      quoteToken = issued.shareableToken!;
      expect(quoteToken).toBeDefined();
    });

    it('customer retrieves quotation via public token with zero financial leakage', async () => {
      const res = await request(app).get(`/api/v1/quotations/public/${quoteToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.destinationName).toBe('Kashmir Valley Circuit');
      expect(data.customerName).toBe('Tariq Khan');
      expect(data.hotels).toHaveLength(0);
      expect(data.transports).toHaveLength(1);

      // Verify no sensitive fields leak
      expect((data as any).markupPercent).toBeUndefined();
      expect((data as any).totalCost).toBeUndefined();
      expect((data as any).projectedProfit).toBeUndefined();
      expect((data as any).agentCommission).toBeUndefined();
      expect((data as any).internalNotes).toBeUndefined();
    });

    it('customer requests adjustments to the quotation itinerary', async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/public/${quoteToken}/request-changes`)
        .send({
          message: 'Can we upgrade the vehicle to Crysta ZX and add Sonmarg day trip?',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedQuote = await QuotationModel.findById(quotationId);
      expect(updatedQuote?.customerModificationRequest?.message).toBe(
        'Can we upgrade the vehicle to Crysta ZX and add Sonmarg day trip?'
      );
    });

    it('customer accepts quotation, creating an unconfirmed booking request', async () => {
      const res = await request(app)
        .post(`/api/v1/quotations/public/${quoteToken}/accept`)
        .send({ agreedToTerms: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify quotation status
      const acceptedQuote = await QuotationModel.findById(quotationId);
      expect(acceptedQuote?.status).toBe('ACCEPTED');

      // Verify booking creation in QUOTE_ACCEPTED status (unconfirmed booking request)
      const booking = await BookingModel.findOne({ quotationId });
      expect(booking).not.toBeNull();
      expect(booking?.status).toBe('QUOTE_ACCEPTED');
      expect(booking?.bookingNumber).toMatch(/^NCT-BK-\d{4}-\d{5}$/);
    });

    it('replaying acceptance request is idempotent and does not create duplicate bookings', async () => {
      const bookingCountBefore = await BookingModel.countDocuments({ quotationId });

      const res = await request(app)
        .post(`/api/v1/quotations/public/${quoteToken}/accept`)
        .send({ agreedToTerms: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const bookingCountAfter = await BookingModel.countDocuments({ quotationId });
      expect(bookingCountAfter).toBe(bookingCountBefore); // Exactly 1 booking
    });
  });
});
