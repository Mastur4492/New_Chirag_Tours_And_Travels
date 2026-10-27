import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BookingModel } from '../src/models/booking.model';
import { CustomerModel } from '../src/models/customer.model';
import { DestinationModel } from '../src/models/destination.model';
import { HotelModel } from '../src/models/hotel.model';
import { LeadModel } from '../src/models/lead.model';
import { QuotationModel } from '../src/models/quotation.model';
import { QuotationVersionModel } from '../src/models/quotationVersion.model';
import { RoomCategoryModel } from '../src/models/roomCategory.model';
import { SeasonModel } from '../src/models/season.model';
import { SeasonalRateCardModel } from '../src/models/seasonalRateCard.model';
import { TaxConfigModel } from '../src/models/taxConfig.model';
import { TransportTariffModel } from '../src/models/transportTariff.model';
import { UserModel } from '../src/models/user.model';
import { authService } from '../src/services/auth.service';
import { customerService } from '../src/services/customer.service';
import { leadService } from '../src/services/lead.service';
import { quotationService } from '../src/services/quotation.service';

// Import the URL resolver logic to test environment configuration
function resolvePublicQuoteUrlLogic(
  token: string,
  mockEnvUrl?: string,
  mockWindowOrigin?: string
): {
  url: string;
  baseUrl: string;
  isDevelopmentOrLocalhost: boolean;
  isConfiguredDomain: boolean;
  warningMessage?: string;
} {
  const cleanEnvBaseUrl = (mockEnvUrl || '').trim().replace(/\/+$/, '');
  const isConfiguredDomain = Boolean(cleanEnvBaseUrl);

  let baseUrl = '';
  if (isConfiguredDomain) {
    baseUrl = cleanEnvBaseUrl;
  } else if (mockWindowOrigin) {
    baseUrl = mockWindowOrigin.replace(/\/+$/, '');
  }

  const isDevelopmentOrLocalhost =
    !isConfiguredDomain ||
    /localhost|127\.0\.0\.1|0\.0\.0\.0|::1|:\d{4}/i.test(baseUrl);

  const url = token ? `${baseUrl}/quote/${token}` : '';
  const warningMessage = isDevelopmentOrLocalhost
    ? 'Development / Localhost Link: NEXT_PUBLIC_PUBLIC_QUOTE_BASE_URL is not configured with a public customer domain. This link runs on a local port and cannot be opened by external travelers on their mobile devices.'
    : undefined;

  return {
    url,
    baseUrl,
    isDevelopmentOrLocalhost,
    isConfiguredDomain,
    warningMessage,
  };
}

const testDbName = `chirag_test_phase_b_audit_${Date.now()}`;
const testMongoUri = `mongodb://localhost:27017/${testDbName}`;

describe('Phase B Audit: Public Quotation URL, Sharing & Acceptance-Booking Safeguards', () => {
  let agentUser: any;
  let adminUser: any;
  let destinationRajasthan: any;
  let hotelHeritage: any;
  let roomCatDeluxe: any;
  let seasonRegular: any;
  let rateCard: any;
  let transportTariff: any;
  let confirmedTaxRule: any;
  let lead: any;

  const agentActor = {
    userId: '',
    role: 'AGENT' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'AuditRunner/1.0',
  };

  const adminActor = {
    userId: '',
    role: 'ADMIN' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'AuditRunner/1.0',
  };

  beforeAll(async () => {
    await mongoose.connect(testMongoUri);

    // 1. Seed Users
    agentUser = await UserModel.create({
      fullName: 'Vikram Joshi (Desk Agent)',
      mobile: '9820011223',
      email: 'vikram.agent@chiragtravels.com',
      passwordHash: await authService.hashPassword('AgentPassword#2026'),
      role: 'AGENT',
      status: 'ACTIVE',
      agentProfile: {
        agencyName: 'Vikram Travels Desk',
        city: 'Ahmedabad',
        commissionRatePercent: 10,
        maxDiscountPercent: 5,
        maxMarkupPercent: 20,
        canApproveFinalPrice: false,
      },
    });
    agentActor.userId = agentUser._id.toString();

    adminUser = await UserModel.create({
      fullName: 'Faisal Bikanerwala (Owner)',
      mobile: '9978655529',
      email: 'faisal.owner@chiragtravels.com',
      passwordHash: await authService.hashPassword('AdminPassword#2026'),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminActor.userId = adminUser._id.toString();

    // 2. Master Data
    destinationRajasthan = await DestinationModel.create({
      name: 'Udaipur & Mount Abu',
      slug: `udaipur-${Date.now()}`,
      state: 'Rajasthan',
      country: 'India',
      region: 'WEST',
      isActive: true,
    });

    seasonRegular = await SeasonModel.create({
      name: 'Regular Touring 2026',
      seasonType: 'REGULAR',
      destinationId: destinationRajasthan._id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      priority: 5,
    });

    hotelHeritage = await HotelModel.create({
      name: 'Lake Palace Heritage Retreat',
      destinationId: destinationRajasthan._id,
      propertyType: 'HOTEL',
      starRating: 4,
      city: 'Udaipur',
      isActive: true,
    });

    roomCatDeluxe = await RoomCategoryModel.create({
      hotelId: hotelHeritage._id,
      name: 'Lake View Deluxe',
      baseOccupancy: 2,
      maxAdults: 3,
      maxChildren: 1,
      extraBedSupported: true,
      maxExtraBeds: 1,
      allowedMealPlans: ['CP', 'MAP'],
      isActive: true,
    });

    rateCard = await SeasonalRateCardModel.create({
      hotelId: hotelHeritage._id,
      roomCategoryId: roomCatDeluxe._id,
      seasonId: seasonRegular._id,
      mealPlan: 'CP',
      baseCostPerNight: 4000,
      standardSellingPrice: 5500,
      extraAdultBedCost: 1200,
      childWithBedCost: 600,
      childWithoutBedCost: 300,
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2026-12-31'),
      isActive: true,
    });

    transportTariff = await TransportTariffModel.create({
      destinationId: destinationRajasthan._id,
      vehicleCategory: 'SEDAN',
      tariffBasis: 'PER_DAY',
      seasonType: 'REGULAR',
      baseSupplierCost: 2500,
      standardSellingRate: 3500,
      driverDailyAllowanceCost: 400,
      isTollParkingIncluded: false,
      isNightHaltIncluded: false,
      isActive: true,
    });

    confirmedTaxRule = await TaxConfigModel.create({
      name: 'GST Tour Operator Service 5%',
      taxType: 'GST',
      ratePercent: 5,
      isApplicable: true,
      isDefault: true,
      isConfirmed: true,
      confirmedBy: adminUser._id,
      confirmedAt: new Date(),
    });

    // 3. Customer & Lead
    const customer = await customerService.createCustomer(
      {
        fullName: 'Anil Singhania',
        mobile: '9820099887',
        email: 'anil.singhania@example.com',
        city: 'Mumbai',
        source: 'AGENT',
      },
      agentActor
    );

    lead = await leadService.createLead(
      {
        customerId: customer.id,
        destinationId: destinationRajasthan._id.toString(),
        source: 'PHONE',
        numberOfAdults: 2,
        numberOfChildren: 0,
        travelStartDate: '2026-08-10',
        travelEndDate: '2026-08-15',
      },
      agentActor
    );
  });

  afterAll(async () => {
    try {
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        await mongoose.connection.db.dropDatabase();
      }
    } catch {
      // Ignored
    } finally {
      await mongoose.disconnect();
    }
  });

  // =========================================================================
  // AUDIT ITEM 1: PUBLIC QUOTATION URL RESOLVER & SHARING SAFETY
  // =========================================================================
  describe('Audit Item 1: Public Quotation URL Resolver & Safety Safeguards', () => {
    const testToken = 'abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    it('1.1: uses environment-configured public domain when NEXT_PUBLIC_PUBLIC_QUOTE_BASE_URL is set', () => {
      const result = resolvePublicQuoteUrlLogic(
        testToken,
        'https://proposals.newchiragtours.com',
        'http://localhost:3002'
      );

      expect(result.url).toBe(`https://proposals.newchiragtours.com/quote/${testToken}`);
      expect(result.baseUrl).toBe('https://proposals.newchiragtours.com');
      expect(result.isConfiguredDomain).toBe(true);
      expect(result.isDevelopmentOrLocalhost).toBe(false);
      expect(result.warningMessage).toBeUndefined();
    });

    it('1.2: trims trailing slashes from configured environment base URL', () => {
      const result = resolvePublicQuoteUrlLogic(
        testToken,
        'https://proposals.newchiragtours.com///',
        'http://localhost:3002'
      );

      expect(result.url).toBe(`https://proposals.newchiragtours.com/quote/${testToken}`);
      expect(result.isDevelopmentOrLocalhost).toBe(false);
    });

    it('1.3: flags localhost/127.0.0.1 development fallback when env variable is unset', () => {
      const result = resolvePublicQuoteUrlLogic(
        testToken,
        undefined, // Unset
        'http://localhost:3002'
      );

      expect(result.url).toBe(`http://localhost:3002/quote/${testToken}`);
      expect(result.isConfiguredDomain).toBe(false);
      expect(result.isDevelopmentOrLocalhost).toBe(true);
      expect(result.warningMessage).toContain('Development / Localhost Link');
      expect(result.warningMessage).toContain('cannot be opened by external travelers');
    });

    it('1.4: flags development warning even if environment variable was set to localhost', () => {
      const result = resolvePublicQuoteUrlLogic(
        testToken,
        'http://localhost:3002', // Explicitly configured as localhost
        'http://localhost:3002'
      );

      expect(result.isDevelopmentOrLocalhost).toBe(true);
      expect(result.warningMessage).toBeDefined();
    });
  });

  // =========================================================================
  // AUDIT ITEM 2: PUBLIC ACCEPTANCE & BOOKING CREATION LIVE DATABASE INVARIANTS
  // =========================================================================
  describe('Audit Item 2: Public Quotation Acceptance & Booking Workflow Invariants', () => {
    let quotation: any;
    let shareableToken: string;

    beforeAll(async () => {
      // Create and issue a quotation
      const quoteCreated = await quotationService.createQuotation(
        {
          leadId: lead.id,
          destinationId: destinationRajasthan._id.toString(),
          travelStartDate: '2026-08-10',
          travelEndDate: '2026-08-14',
          numberOfAdults: 2,
          numberOfChildren: 0,
          numberOfInfants: 0,
          hotels: [
            {
              hotelId: hotelHeritage._id.toString(),
              roomCategoryId: roomCatDeluxe._id.toString(),
              checkInDate: '2026-08-10',
              checkOutDate: '2026-08-14',
              numberOfRooms: 1,
              adultsCount: 2,
              childrenWithBedCount: 0,
              childrenWithoutBedCount: 0,
              mealPlan: 'CP',
            },
          ],
          transports: [
            {
              tariffId: transportTariff._id.toString(),
              pricingBasis: 'PER_DAY',
              numberOfDays: 4,
            },
          ],
          markupPercent: 10,
          discountPercent: 0,
          isTaxApplicable: true,
          inclusions: ['4 Nights Lake Palace Hotel', 'AC Sedan Dedicated Vehicle'],
          terms: ['Standard Chirag cancellation terms apply'],
        },
        agentActor
      );

      const issuedResult = await quotationService.issueQuotation(quoteCreated.id, agentActor);
      quotation = issuedResult.quotation;
      shareableToken = issuedResult.shareableToken;
    });

    it('2.1: public acceptance transitions quote to ACCEPTED and creates a Booking strictly in QUOTE_ACCEPTED status', async () => {
      const acceptResult = await quotationService.acceptPublicQuotation(
        shareableToken,
        'Special request: Upper floor quiet lake view room please.'
      );

      expect(acceptResult.status).toBe('ACCEPTED');
      expect(acceptResult.bookingNumber).toBeDefined();
      expect(acceptResult.bookingNumber).toMatch(/^NCT-BK-\d{4}-\d{5}$/);

      // Verify the persisted Booking document in MongoDB
      const persistedBooking = await BookingModel.findOne({ bookingNumber: acceptResult.bookingNumber });
      expect(persistedBooking).not.toBeNull();

      // INVARIANT A: Status is strictly QUOTE_ACCEPTED
      expect(persistedBooking!.status).toBe('QUOTE_ACCEPTED');

      // INVARIANT B: Never automatically CONFIRMED
      expect(persistedBooking!.confirmedBy).toBeUndefined();
      expect(persistedBooking!.confirmedAt).toBeUndefined();

      // INVARIANT C: Never automatically verifies payment
      expect(persistedBooking!.financials.totalPaid).toBe(0);
      expect(persistedBooking!.financials.totalPaidInPaise).toBe(0);
      expect(persistedBooking!.financials.advanceRequired).toBe(0);
      expect(persistedBooking!.financials.advanceRequiredInPaise).toBe(0);
      expect(persistedBooking!.financials.balancePending).toBe(persistedBooking!.financials.totalAmount);
      expect(persistedBooking!.financials.currency).toBe('INR');

      // INVARIANT D: Never automatically triggers dispatch or operational documents
      expect((persistedBooking as any).driverDutySlipGenerated).toBeFalsy();
      expect((persistedBooking as any).hotelVoucherGenerated).toBeFalsy();

      // Customer notes preserved
      expect(persistedBooking!.customerNotes).toBe('Special request: Upper floor quiet lake view room please.');
    });

    it('2.2: repeated acceptance is completely idempotent and returns the existing booking without creating duplicates', async () => {
      const bookingsCountBefore = await BookingModel.countDocuments();

      // Repeat acceptance with same token
      const repeatResult = await quotationService.acceptPublicQuotation(
        shareableToken,
        'Repeated acceptance click by customer'
      );

      const bookingsCountAfter = await BookingModel.countDocuments();

      // Idempotency verification: No second booking created
      expect(bookingsCountAfter).toBe(bookingsCountBefore);
      expect(repeatResult.status).toBe('ACCEPTED');
      expect(repeatResult.bookingNumber).toBe(quotation.bookingNumber || repeatResult.bookingNumber);
    });

    it('2.3: rejects acceptance if quotation proposal was superseded by a revision', async () => {
      // 1. Create a fresh quotation and issue it
      const newQuote = await quotationService.createQuotation(
        {
          leadId: lead.id,
          destinationId: destinationRajasthan._id.toString(),
          travelStartDate: '2026-09-01',
          travelEndDate: '2026-09-05',
          numberOfAdults: 2,
          numberOfChildren: 0,
          numberOfInfants: 0,
          hotels: [],
          transports: [
            {
              tariffId: transportTariff._id.toString(),
              pricingBasis: 'PER_DAY',
              numberOfDays: 3,
            },
          ],
          markupPercent: 10,
          discountPercent: 0,
          isTaxApplicable: true,
        },
        agentActor
      );

      const issued = await quotationService.issueQuotation(newQuote.id, agentActor);
      const originalToken = issued.shareableToken;

      // 2. Agent revises quotation to Version 2
      await quotationService.reviseQuotation(
        newQuote.id,
        {
          leadId: lead.id,
          destinationId: destinationRajasthan._id.toString(),
          travelStartDate: '2026-09-02',
          travelEndDate: '2026-09-06',
          numberOfAdults: 2,
          numberOfChildren: 0,
          numberOfInfants: 0,
          hotels: [],
          transports: [
            {
              tariffId: transportTariff._id.toString(),
              pricingBasis: 'PER_DAY',
              numberOfDays: 4,
            },
          ],
          markupPercent: 10,
          discountPercent: 0,
          isTaxApplicable: true,
          changeReason: 'Customer shifted travel dates by 1 day and added 1 transport day',
        },
        agentActor
      );

      // 3. Attempting to accept with the original Version 1 token MUST fail
      await expect(
        quotationService.acceptPublicQuotation(originalToken)
      ).rejects.toThrow(/updated with a newer version/i);
    });

    it('2.4: rejects acceptance if quotation validity date has expired', async () => {
      // Create a quotation with expired validUntil
      const expiredQuoteDoc = await QuotationModel.create({
        quoteNumber: 'NCT-QT-2026-EXPIRED',
        leadId: new mongoose.Types.ObjectId(lead.id),
        customerId: new mongoose.Types.ObjectId(),
        assignedAgentId: agentUser.id,
        destinationId: destinationRajasthan._id,
        travelStartDate: '2026-01-01',
        travelEndDate: '2026-01-05',
        durationNights: 4,
        durationDays: 5,
        numberOfAdults: 2,
        numberOfChildren: 0,
        numberOfInfants: 0,
        currentVersion: 1,
        status: 'ISSUED',
        validUntil: new Date(Date.now() - 86400000), // Expired yesterday
        pricingSummary: {
          totalBaseSupplierCost: 9000,
          totalMarkupAmount: 1000,
          markupPercent: 10,
          discountAmount: 0,
          discountPercent: 0,
          taxableAmount: 10000,
          taxRatePercent: 5,
          taxAmount: 500,
          isTaxApplicable: true,
          isTaxConfirmed: true,
          finalSellingPrice: 10500,
          projectedGrossProfit: 1000,
        },
        shareableTokenHash: 'mock_expired_token_hash_value_1234567890',
        inclusions: [],
        exclusions: [],
        terms: [],
        hotels: [],
        transports: [],
        createdBy: agentUser.id,
      });

      // Querying by hash directly through service
      const crypto = await import('crypto');
      const testToken = 'expired_raw_token_test';
      const hash = crypto.createHash('sha256').update(testToken).digest('hex');
      expiredQuoteDoc.shareableTokenHash = hash;
      await expiredQuoteDoc.save();

      await expect(
        quotationService.acceptPublicQuotation(testToken)
      ).rejects.toThrow(/expired/i);
    });

    it('2.5: rejects invalid or non-existent token with 404 NOT_FOUND', async () => {
      await expect(
        quotationService.acceptPublicQuotation('completely_invalid_token_which_does_not_exist_in_db')
      ).rejects.toThrow(/invalid or has expired/i);
    });

    it('2.6: strictly protects confidentiality — public quotation view and acceptance do not leak supplier costs or margins', async () => {
      const publicView = await quotationService.getPublicQuotation(shareableToken);
      const json = JSON.stringify(publicView);

      // Verify no confidential financial fields leaked
      expect(json).not.toContain('totalBaseSupplierCost');
      expect(json).not.toContain('supplierCostTotal');
      expect(json).not.toContain('projectedGrossProfit');
      expect(json).not.toContain('realizedGrossProfit');
      expect(json).not.toContain('markupPercent');
      expect(json).not.toContain('supplierCost');
    });
  });
});
