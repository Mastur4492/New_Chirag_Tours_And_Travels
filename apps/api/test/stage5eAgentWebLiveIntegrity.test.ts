import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
import { userService } from '../src/services/user.service';

const testDbName = `chirag_test_agent_web_live_${Date.now()}`;
const testMongoUri = `mongodb://localhost:27017/${testDbName}`;

describe('Phase 7: Agent Web Portal Live MongoDB Scoping & Security Integrity', () => {
  let agentAUser: any;
  let agentBUser: any;
  let adminUser: any;
  let destinationKashmir: any;
  let hotelGrand: any;
  let roomCatDeluxe: any;
  let seasonPeak: any;
  let rateCard: any;
  let transportTariff: any;
  let confirmedTaxRule: any;
  let leadA: any;

  const agentAActor = {
    userId: '',
    role: 'AGENT' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'AgentWebTestRunner/1.0',
  };

  const agentBActor = {
    userId: '',
    role: 'AGENT' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'AgentWebTestRunner/1.0',
  };

  const adminActor = {
    userId: '',
    role: 'ADMIN' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'AgentWebTestRunner/1.0',
  };

  beforeAll(async () => {
    await mongoose.connect(testMongoUri);

    await Promise.all([
      UserModel.syncIndexes(),
      CustomerModel.syncIndexes(),
      LeadModel.syncIndexes(),
      DestinationModel.syncIndexes(),
    ]);

    // Create Admin User
    adminUser = await UserModel.create({
      fullName: 'Head Administrator',
      mobile: '9800011111',
      passwordHash: await authService.hashPassword('AdminPass@2026!'),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminActor.userId = adminUser._id.toString();

    // Create Agent A
    agentAUser = await UserModel.create({
      fullName: 'Agent Rahul Sharma',
      mobile: '9800022222',
      passwordHash: await authService.hashPassword('DemoAgent@2026!'),
      role: 'AGENT',
      status: 'ACTIVE',
      agentProfile: {
        agencyName: 'Rahul Travels Srinagar Desk',
        city: 'Srinagar',
        commissionRatePercent: 10,
        maxDiscountPercent: 5,
        maxMarkupPercent: 20,
        canApproveFinalPrice: false,
      },
    });
    agentAActor.userId = agentAUser._id.toString();

    // Create Agent B
    agentBUser = await UserModel.create({
      fullName: 'Agent Priya Verma',
      mobile: '9800033333',
      passwordHash: await authService.hashPassword('DemoAgent@2026!'),
      role: 'AGENT',
      status: 'ACTIVE',
      agentProfile: {
        agencyName: 'Priya Tours Jammu Desk',
        city: 'Jammu',
        commissionRatePercent: 8,
        maxDiscountPercent: 7,
        maxMarkupPercent: 25,
        canApproveFinalPrice: false,
      },
    });
    agentBActor.userId = agentBUser._id.toString();

    // Create Test Destination
    destinationKashmir = await DestinationModel.create({
      name: 'Kashmir Valley',
      slug: `kashmir-${Date.now()}`,
      country: 'India',
      state: 'Jammu & Kashmir',
      region: 'NORTH',
      isActive: true,
    });

    // Create Confirmed Tax Rule (5% GST)
    confirmedTaxRule = await TaxConfigModel.create({
      name: 'Standard GST (5%)',
      taxType: 'GST',
      ratePercent: 5,
      isApplicable: true,
      isDefault: true,
      isConfirmed: true,
      confirmedBy: adminUser._id,
      confirmedAt: new Date(),
    });

    // Create Hotel, Room Category, Season, Rate Card
    hotelGrand = await HotelModel.create({
      destinationId: destinationKashmir._id,
      name: 'The Grand Palace Srinagar',
      city: 'Srinagar',
      starRating: 4,
      propertyType: 'HOTEL',
      isActive: true,
    });

    roomCatDeluxe = await RoomCategoryModel.create({
      hotelId: hotelGrand._id,
      name: 'Deluxe Heritage Room',
      baseOccupancy: 2,
      maxAdults: 3,
      maxChildren: 1,
      extraBedSupported: true,
      maxExtraBeds: 1,
      allowedMealPlans: ['CP', 'MAP'],
      isActive: true,
    });

    seasonPeak = await SeasonModel.create({
      name: 'Summer Valley Season',
      seasonType: 'PEAK',
      destinationId: destinationKashmir._id,
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-09-30'),
      priority: 10,
    });

    rateCard = await SeasonalRateCardModel.create({
      hotelId: hotelGrand._id,
      roomCategoryId: roomCatDeluxe._id,
      seasonId: seasonPeak._id,
      mealPlan: 'CP',
      baseCostPerNight: 5000,
      standardSellingPrice: 6500,
      extraAdultBedCost: 1500,
      childWithBedCost: 800,
      childWithoutBedCost: 400,
      validFrom: new Date('2026-04-01'),
      validTo: new Date('2026-09-30'),
      isActive: true,
    });

    await SeasonalRateCardModel.create({
      hotelId: hotelGrand._id,
      roomCategoryId: roomCatDeluxe._id,
      seasonId: seasonPeak._id,
      mealPlan: 'MAP',
      baseCostPerNight: 6500,
      standardSellingPrice: 8000,
      extraAdultBedCost: 2000,
      childWithBedCost: 1000,
      childWithoutBedCost: 500,
      validFrom: new Date('2026-04-01'),
      validTo: new Date('2026-09-30'),
      isActive: true,
    });

    transportTariff = await TransportTariffModel.create({
      destinationId: destinationKashmir._id,
      vehicleCategory: 'SUV',
      seasonType: 'REGULAR',
      tariffBasis: 'PER_DAY',
      baseSupplierCost: 3500,
      driverDailyAllowanceCost: 500,
      standardSellingRate: 4500,
      isTollParkingIncluded: false,
      isNightHaltIncluded: false,
      nightHaltCharge: 600,
      isActive: true,
    });
  });

  describe('Pillar 1: Agent Authentication & Authoritative Policy Exposure', () => {
    it('authenticates Agent A with mobile/password and returns JWT with role AGENT', async () => {
      const loginRes = await authService.login({
        mobile: '9800022222',
        password: 'DemoAgent@2026!',
      });

      expect(loginRes.user.id).toBe(agentAActor.userId);
      expect(loginRes.user.role).toBe('AGENT');
      expect(loginRes.tokens.accessToken).toBeDefined();
    });

    it('retrieves authoritative agent profile containing contract commission tier and discount caps without invented numbers', async () => {
      const userProfile = await userService.getUserById(agentAActor.userId);

      expect(userProfile.fullName).toBe('Agent Rahul Sharma');
      expect(userProfile.role).toBe('AGENT');
      expect(userProfile.agentProfile?.agencyName).toBe('Rahul Travels Srinagar Desk');
      expect(userProfile.agentProfile?.commissionRatePercent).toBe(10);
      expect(userProfile.agentProfile?.maxDiscountPercent).toBe(5);
      expect(userProfile.agentProfile?.canApproveFinalPrice).toBe(false);
    });
  });

  describe('Pillar 2: Agent Row-Level Customer Scoping & Protection', () => {
    let customerA: any;

    it('agent A creates a walk-in customer: auto-assigns ownership to Agent A', async () => {
      customerA = await customerService.createCustomer(
        {
          fullName: 'Vikram Malhotra',
          mobile: '9811199991',
          email: 'vikram.malhotra@test.com',
          city: 'Delhi',
          source: 'AGENT',
        },
        agentAActor
      );

      expect(customerA.id).toBeDefined();
      expect(customerA.fullName).toBe('Vikram Malhotra');
      expect(customerA.assignedAgentId?.toString()).toBe(agentAActor.userId);
    });

    it('agent A lists customers: includes Customer A in results', async () => {
      const listA = await customerService.listCustomers({}, agentAActor);
      expect(listA.customers.length).toBe(1);
      expect(listA.customers[0].id).toBe(customerA.id);
    });

    it('agent B lists customers: does not see Customer A (complete data isolation)', async () => {
      const listB = await customerService.listCustomers({}, agentBActor);
      expect(listB.customers.length).toBe(0);
    });

    it('agent B attempts to access Customer A by ID: rejects with 403 Forbidden', async () => {
      await expect(
        customerService.getCustomerById(customerA.id, agentBActor)
      ).rejects.toThrow(/do not have permission/i);
    });

    it('agent B attempts to update Customer A: rejects with 403 Forbidden', async () => {
      await expect(
        customerService.updateCustomer(customerA.id, { notes: 'Malicious update' }, agentBActor)
      ).rejects.toThrow(/do not have permission to update/i);
    });

    it('agent A attempts to reassign Customer A ownership: rejects with 403 Forbidden', async () => {
      await expect(
        customerService.updateCustomer(
          customerA.id,
          { assignedAgentId: agentBActor.userId },
          agentAActor
        )
      ).rejects.toThrow(/cannot reassign customer ownership/i);
    });
  });

  describe('Pillar 3: Agent Row-Level Lead Scoping & CRM Lifecycle', () => {
    let customerForLead: any;

    beforeAll(async () => {
      customerForLead = await customerService.createCustomer(
        {
          fullName: 'Ananya Roy',
          mobile: '9811199992',
          city: 'Kolkata',
          source: 'WALK_IN',
        },
        agentAActor
      );
    });

    it('agent A intakes a walk-in lead: auto-assigns to Agent A with timeline note', async () => {
      leadA = await leadService.createLead(
        {
          customerId: customerForLead.id,
          destinationId: destinationKashmir._id.toString(),
          source: 'WALK_IN',
          durationNights: 5,
          numberOfAdults: 2,
          numberOfChildren: 1,
          specialRequirements: 'Prefers lake view houseboat and private vehicle',
          nextFollowUpDate: new Date(Date.now() + 86400000).toISOString(),
          followUpNotes: 'Call to review hotel preferences',
        },
        agentAActor
      );

      expect(leadA.id).toBeDefined();
      expect(leadA.leadNumber).toMatch(/^NCT-LD-\d{4}-\d{5}$/);
      expect(leadA.assignedAgentId).toBe(agentAActor.userId);
      expect(leadA.status).toBe('ASSIGNED');
      expect(leadA.timeline.length).toBeGreaterThanOrEqual(1);
    });

    it('agent A lists leads: sees own lead; Agent B lists leads: does not see Agent A lead', async () => {
      const listA = await leadService.listLeads({}, agentAActor);
      expect(listA.leads.some((l) => l.id === leadA.id)).toBe(true);

      const listB = await leadService.listLeads({}, agentBActor);
      expect(listB.leads.some((l) => l.id === leadA.id)).toBe(false);
    });

    it('agent B attempts to access Agent A lead details: rejects with 403 Forbidden', async () => {
      await expect(
        leadService.getLeadById(leadA.id, agentBActor)
      ).rejects.toThrow(/do not have permission to access this lead/i);
    });

    it('agent B attempts to post activity notes to Agent A lead: rejects with 403 Forbidden', async () => {
      await expect(
        leadService.addActivity(
          leadA.id,
          { type: 'NOTE', title: 'Unauthorized note', content: 'Intrusion' },
          agentBActor
        )
      ).rejects.toThrow(/do not have permission/i);
    });

    it('agent A logs interaction and updates follow-up: records in timeline', async () => {
      const updated = await leadService.addActivity(
        leadA.id,
        {
          type: 'CALL',
          title: 'Walk-in discussion completed',
          content: 'Discussed 5N Kashmir plan. Client interested in Gulmarg gondola.',
        },
        agentAActor
      );

      expect(updated.timeline.some((t: any) => t.title === 'Walk-in discussion completed')).toBe(true);

      const nextDate = new Date(Date.now() + 2 * 86400000).toISOString();
      const followUpUpdated = await leadService.updateFollowUp(
        leadA.id,
        { nextFollowUpDate: nextDate, followUpNotes: 'Discuss quote v1' },
        agentAActor
      );

      expect(followUpUpdated.nextFollowUpDate).toBeDefined();
      expect(followUpUpdated.followUpNotes).toBe('Discuss quote v1');
    });

    it('fetches live aggregated agent metrics for Agent A', async () => {
      const metrics = await leadService.getMetrics(agentAActor);

      expect(metrics.agentId).toBe(agentAActor.userId);
      expect(metrics.assignedLeadsCount).toBeGreaterThanOrEqual(1);
      expect(metrics.statusBreakdown.ASSIGNED).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Pillar 4: Agent Quotation Builder, Server Calculation, Discount Guardrails & Public Proposal Sharing', () => {
    let quoteStandard: any;
    let quoteOverDiscount: any;
    let issuedQuoteToken: string;

    it('calculates quotation preview for Agent: strictly shields supplier costs and internal margins', async () => {
      const calcResult = await quotationService.calculateQuoteDetails(
        {
          leadId: leadA.id,
          destinationId: destinationKashmir._id.toString(),
          travelStartDate: '2026-05-10',
          travelEndDate: '2026-05-15',
          numberOfAdults: 2,
          numberOfChildren: 1,
          hotels: [
            {
              hotelId: hotelGrand._id.toString(),
              roomCategoryId: roomCatDeluxe._id.toString(),
              checkInDate: '2026-05-10',
              checkOutDate: '2026-05-15',
              numberOfRooms: 1,
              adultsCount: 2,
              childrenWithBedCount: 1,
              mealPlan: 'CP',
            },
          ],
          transports: [
            {
              tariffId: transportTariff._id.toString(),
              pricingBasis: 'PER_DAY',
              numberOfDays: 5,
              driverAllowanceDays: 5,
              tollsAndParking: 1000,
            },
          ],
          markupPercent: 10,
          discountPercent: 3,
          isTaxApplicable: true,
        },
        agentAActor
      );

      // Verify calculation succeeded and produced valid final selling price
      expect(calcResult.pricingSummary.finalSellingPrice).toBeGreaterThan(0);
      expect(calcResult.pricingSummary.taxAmount).toBeGreaterThan(0);

      // SECURITY CRITICAL: Agent MUST NOT receive supplier costs or gross profit
      expect(calcResult.pricingSummary.totalBaseSupplierCost).toBeUndefined();
      expect(calcResult.pricingSummary.projectedGrossProfit).toBeUndefined();
      expect(calcResult.hotels[0].supplierCost).toBeUndefined();
      expect(calcResult.transports[0].supplierCost).toBeUndefined();
    });

    it('Agent creates quotation within authorized discount limit (3% vs 5% cap): saved as DRAFT', async () => {
      quoteStandard = await quotationService.createQuotation(
        {
          leadId: leadA.id,
          destinationId: destinationKashmir._id.toString(),
          travelStartDate: '2026-05-10',
          travelEndDate: '2026-05-15',
          numberOfAdults: 2,
          numberOfChildren: 1,
          hotels: [
            {
              hotelId: hotelGrand._id.toString(),
              roomCategoryId: roomCatDeluxe._id.toString(),
              checkInDate: '2026-05-10',
              checkOutDate: '2026-05-15',
              numberOfRooms: 1,
              adultsCount: 2,
              childrenWithBedCount: 1,
              mealPlan: 'CP',
            },
          ],
          transports: [
            {
              tariffId: transportTariff._id.toString(),
              pricingBasis: 'PER_DAY',
              numberOfDays: 5,
              driverAllowanceDays: 5,
              tollsAndParking: 1000,
            },
          ],
          markupPercent: 10,
          discountPercent: 3, // <= 5% maxDiscountPercent
          isTaxApplicable: true,
          inclusions: ['4-Star Hotel', 'Breakfast Included', 'Private Cab'],
          exclusions: ['Airfare', 'Pony Rides'],
          terms: ['50% advance to confirm'],
        },
        agentAActor
      );

      expect(quoteStandard.id).toBeDefined();
      expect(quoteStandard.quoteNumber).toMatch(/^NCT-QT-\d{4}-\d{5}$/);
      expect(quoteStandard.status).toBe('DRAFT');
      expect(quoteStandard.currentVersion).toBe(1);
      expect(quoteStandard.approvalReason).toBeUndefined();
      expect(quoteStandard.pricingSummary.totalBaseSupplierCost).toBeUndefined();
      expect(quoteStandard.pricingSummary.projectedGrossProfit).toBeUndefined();
    });

    it('Agent creates quotation exceeding discount limit (8% vs 5% cap): triggers PENDING_ADMIN_APPROVAL state', async () => {
      quoteOverDiscount = await quotationService.createQuotation(
        {
          leadId: leadA.id,
          destinationId: destinationKashmir._id.toString(),
          travelStartDate: '2026-05-10',
          travelEndDate: '2026-05-15',
          numberOfAdults: 2,
          hotels: [
            {
              hotelId: hotelGrand._id.toString(),
              roomCategoryId: roomCatDeluxe._id.toString(),
              checkInDate: '2026-05-10',
              checkOutDate: '2026-05-15',
              numberOfRooms: 1,
              adultsCount: 2,
              mealPlan: 'CP',
            },
          ],
          transports: [
            {
              tariffId: transportTariff._id.toString(),
              pricingBasis: 'PER_DAY',
              numberOfDays: 5,
            },
          ],
          markupPercent: 10,
          discountPercent: 8, // > 5% maxDiscountPercent
          isTaxApplicable: true,
        },
        agentAActor
      );

      expect(quoteOverDiscount.id).toBeDefined();
      expect(quoteOverDiscount.status).toBe('PENDING_ADMIN_APPROVAL');
      expect(quoteOverDiscount.approvalReason).toMatch(/exceeds agent threshold/i);
    });

    it('Agent attempts to issue quotation in PENDING_ADMIN_APPROVAL: rejected with 400 Bad Request', async () => {
      await expect(
        quotationService.issueQuotation(quoteOverDiscount.id, agentAActor)
      ).rejects.toThrow(/pending Admin approval and cannot be issued yet/i);
    });

    it('Admin reviews and approves price override: quotation transitions to APPROVED', async () => {
      const approved = await quotationService.approveQuotation(
        quoteOverDiscount.id,
        {
          decision: 'APPROVE',
          notes: 'Special discount approved by Faisal Bikanerwala for repeat customer',
        },
        adminActor
      );

      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedBy).toBe(adminActor.userId);
    });

    it('Agent issues approved quotation: transitions to ISSUED and generates secure shareable token', async () => {
      const issueRes = await quotationService.issueQuotation(quoteOverDiscount.id, agentAActor);

      expect(issueRes.quotation.status).toBe('ISSUED');
      expect(issueRes.shareableToken).toBeDefined();
      expect(issueRes.shareableToken.length).toBe(64); // 32-byte hex string
      issuedQuoteToken = issueRes.shareableToken;
    });

    it('Public customer accesses quotation via token: retrieves proposal without internal financials', async () => {
      const publicQuote = await quotationService.getPublicQuotation(issuedQuoteToken);

      expect(publicQuote.quoteNumber).toBe(quoteOverDiscount.quoteNumber);
      expect(publicQuote.destinationName).toBe('Kashmir Valley');
      expect(publicQuote.status).toBe('ISSUED');
      expect(publicQuote.pricingSummary.finalSellingPrice).toBeGreaterThan(0);
      expect(publicQuote.companyInfo.name).toBe('New Chirag Tours and Travels');

      // Security: no supplier costs or profit exposed to public traveler
      expect((publicQuote as any).pricingSummary.totalBaseSupplierCost).toBeUndefined();
      expect((publicQuote as any).pricingSummary.projectedGrossProfit).toBeUndefined();
    });

    it('Agent revises quotation with changeReason: bumps version to v2, revokes old token, archives v1 snapshot', async () => {
      const revised = await quotationService.reviseQuotation(
        quoteOverDiscount.id,
        {
          leadId: leadA.id,
          destinationId: destinationKashmir._id.toString(),
          travelStartDate: '2026-05-12',
          travelEndDate: '2026-05-17',
          numberOfAdults: 2,
          hotels: [
            {
              hotelId: hotelGrand._id.toString(),
              roomCategoryId: roomCatDeluxe._id.toString(),
              checkInDate: '2026-05-12',
              checkOutDate: '2026-05-17',
              numberOfRooms: 1,
              adultsCount: 2,
              mealPlan: 'MAP', // upgraded meal plan
            },
          ],
          transports: [
            {
              tariffId: transportTariff._id.toString(),
              pricingBasis: 'PER_DAY',
              numberOfDays: 5,
            },
          ],
          markupPercent: 10,
          discountPercent: 4, // within 5% cap
          isTaxApplicable: true,
          changeReason: 'Client adjusted dates by 2 days and upgraded to MAP dinner plan',
        },
        agentAActor
      );

      expect(revised.currentVersion).toBe(2);
      expect(revised.status).toBe('DRAFT'); // within limits

      // Security: Verify old shareable token was revoked upon revision
      await expect(
        quotationService.getPublicQuotation(issuedQuoteToken)
      ).rejects.toThrow(/updated with a newer version|invalid, expired, or has been superseded/i);

      // Verify immutable version snapshot exists in QuotationVersion collection
      const versions = await quotationService.listQuotationVersions(quoteOverDiscount.id, agentAActor);
      expect(versions.length).toBe(1);
      expect(versions[0].versionNumber).toBe(1);
      expect(versions[0].changeReason).toBe('Client adjusted dates by 2 days and upgraded to MAP dinner plan');
    });

    it('Agent B attempts to access, revise, or issue Agent A quotation: rejected with 403 Forbidden', async () => {
      // Agent B attempts to revise Agent A quotation
      await expect(
        quotationService.reviseQuotation(
          quoteOverDiscount.id,
          {
            leadId: leadA.id,
            destinationId: destinationKashmir._id.toString(),
            travelStartDate: '2026-05-12',
            travelEndDate: '2026-05-17',
            numberOfAdults: 2,
            hotels: [],
            transports: [],
            markupPercent: 10,
            discountPercent: 0,
            isTaxApplicable: true,
            changeReason: 'Unauthorized revision attempt by Agent B',
          },
          agentBActor
        )
      ).rejects.toThrow(/do not have permission to modify this quotation/i);

      // Agent B attempts to issue Agent A quotation
      await expect(
        quotationService.issueQuotation(quoteStandard.id, agentBActor)
      ).rejects.toThrow(/do not have permission to issue this quotation/i);
    });
  });

  afterAll(async () => {
    try {
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        await mongoose.connection.db.dropDatabase();
      }
    } catch {
      // Disposable database drop gracefully handled
    } finally {
      await mongoose.disconnect();
    }
  });
});
