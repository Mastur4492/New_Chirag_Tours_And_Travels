import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DestinationModel } from '../src/models/destination.model';
import { TourPackageModel } from '../src/models/tourPackage.model';
import { UserModel } from '../src/models/user.model';
import { TaxConfigModel } from '../src/models/taxConfig.model';
import { AuditLogModel } from '../src/models/auditLog.model';
import { LeadModel } from '../src/models/lead.model';
import { CustomerModel } from '../src/models/customer.model';
import { QuotationModel } from '../src/models/quotation.model';
import { destinationService } from '../src/services/destination.service';
import { tourPackageService } from '../src/services/package.service';
import { userService } from '../src/services/user.service';
import { taxConfigService } from '../src/services/taxConfig.service';
import { authService } from '../src/services/auth.service';
import { quotationService } from '../src/services/quotation.service';
import { calculateTax } from '@chirag/pricing';

const testDbName = `chirag_test_m3_live_${Date.now()}`;
const testMongoUri = `mongodb://localhost:27017/${testDbName}`;

describe('Milestone 3: Packages, Agent Admin & Tax Config Live MongoDB Integration Tests', () => {
  let adminUser: any;
  let destination: any;

  const adminActor = {
    userId: '',
    role: 'ADMIN' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'LiveM3TestRunner/1.0',
  };

  beforeAll(async () => {
    await mongoose.connect(testMongoUri);

    await Promise.all([
      DestinationModel.syncIndexes(),
      TourPackageModel.syncIndexes(),
      UserModel.syncIndexes(),
      TaxConfigModel.syncIndexes(),
      AuditLogModel.syncIndexes(),
      LeadModel.syncIndexes(),
      CustomerModel.syncIndexes(),
      QuotationModel.syncIndexes(),
    ]);

    // Create Admin User
    adminUser = await UserModel.create({
      fullName: 'Milestone 3 Admin',
      mobile: '9999900001',
      passwordHash: await authService.hashPassword('AdminPass@2026!'),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminActor.userId = adminUser._id.toString();

    // Create Base Destination
    destination = await destinationService.createDestination(
      {
        name: 'Kashmir Valley M3 Test',
        region: 'NORTH',
        state: 'Jammu & Kashmir',
        country: 'India',
        description: 'Paradise on Earth',
      },
      adminActor
    );
  });

  afterAll(async () => {
    try {
      await mongoose.connection.dropDatabase();
    } catch {
      // Ignore cleanup error if already dropped
    }
    await mongoose.disconnect();
  });

  describe('1. Tour Packages Management & Audit Logging', () => {
    let createdPkg: any;

    it('creates a tour package with day-wise itinerary, defaults, and inclusions', async () => {
      createdPkg = await tourPackageService.createPackage(
        {
          title: 'Kashmir Classic Explorer 5D/4N',
          destinationId: destination.id,
          durationNights: 4,
          durationDays: 5,
          startingPrice: 22500,
          overview: 'Comprehensive tour of Srinagar, Gulmarg, and Pahalgam.',
          defaultMealPlan: 'MAP',
          defaultVehicleCategory: 'SEDAN',
          inclusions: ['4 Star Hotels', 'Daily Breakfast & Dinner', 'Private Cab'],
          exclusions: ['Flights', 'Pony Rides'],
          dayWiseItinerary: [
            {
              dayNumber: 1,
              title: 'Arrival in Srinagar',
              description: 'Pick up from Srinagar airport, check in to Dal Lake houseboat.',
              nightStayDestination: 'Srinagar',
              mealsIncluded: ['Dinner'],
              activities: ['Shikara ride'],
            },
            {
              dayNumber: 2,
              title: 'Srinagar to Gulmarg Excursion',
              description: 'Full day trip to Gulmarg with Gondola cable car ride.',
              nightStayDestination: 'Srinagar',
              mealsIncluded: ['Breakfast', 'Dinner'],
              activities: ['Gondola ride'],
            },
          ],
          isPublished: true,
        },
        adminActor
      );

      expect(createdPkg.id).toBeDefined();
      expect(createdPkg.title).toBe('Kashmir Classic Explorer 5D/4N');
      expect(createdPkg.destinationName).toBe(destination.name);
      expect(createdPkg.dayWiseItinerary).toHaveLength(2);
      expect(createdPkg.isPublished).toBe(true);

      // Verify Audit Log
      const audit = await AuditLogModel.findOne({
        action: 'MASTER_DATA_CREATED',
        entityId: createdPkg.id,
      });
      expect(audit).not.toBeNull();
      expect(audit?.actorId.toString()).toBe(adminActor.userId);
    });

    it('updates package details, pricing, and day-wise itinerary safely', async () => {
      const updated = await tourPackageService.updatePackage(
        createdPkg.id,
        {
          title: 'Kashmir Luxury Explorer 5D/4N',
          startingPrice: 24999,
          dayWiseItinerary: [
            {
              dayNumber: 1,
              title: 'Arrival in Srinagar Luxury Welcome',
              description: 'Pick up in luxury cab, check in to Premium Dal Lake houseboat.',
              nightStayDestination: 'Srinagar Houseboat',
              mealsIncluded: ['Dinner'],
              activities: ['Sunset Shikara ride'],
            },
            {
              dayNumber: 2,
              title: 'Srinagar to Gulmarg Gondola Phase 2',
              description: 'Full day trip to Gulmarg with Phase 1 & 2 Gondola tickets.',
              nightStayDestination: 'Gulmarg Resort',
              mealsIncluded: ['Breakfast', 'Dinner'],
              activities: ['Skiing & Gondola'],
            },
          ],
        },
        adminActor
      );

      expect(updated.title).toBe('Kashmir Luxury Explorer 5D/4N');
      expect(updated.startingPrice).toBe(24999);
      expect(updated.dayWiseItinerary[0]?.nightStayDestination).toBe('Srinagar Houseboat');

      // Verify update audit log
      const audit = await AuditLogModel.findOne({
        action: 'MASTER_DATA_UPDATED',
        entityId: createdPkg.id,
      });
      expect(audit).not.toBeNull();
    });

    it('toggles package publish status non-destructively', async () => {
      const unpublished = await tourPackageService.togglePublish(createdPkg.id, false, adminActor);
      expect(unpublished.isPublished).toBe(false);

      const published = await tourPackageService.togglePublish(createdPkg.id, true, adminActor);
      expect(published.isPublished).toBe(true);
    });
  });

  describe('2. Agent Administration, RBAC & Credential Management', () => {
    let createdAgent: any;

    it('creates agent with secure credentials and profile permissions', async () => {
      createdAgent = await userService.createAgent(
        {
          fullName: 'Sanjay Travels Partner',
          mobile: '9825098250',
          email: 'sanjay@sanjaytravels.com',
          password: 'PartnerSecure123!',
          agentProfile: {
            agencyName: 'Sanjay Tour & Travels',
            city: 'Ahmedabad',
            commissionRatePercent: 7,
            maxDiscountPercent: 5,
            maxMarkupPercent: 20,
            canApproveFinalPrice: false,
          },
        },
        adminActor.userId,
        adminActor.ipAddress,
        adminActor.userAgent
      );

      expect(createdAgent.id).toBeDefined();
      expect(createdAgent.role).toBe('AGENT');
      expect(createdAgent.status).toBe('ACTIVE');
      expect(createdAgent.agentProfile?.commissionRatePercent).toBe(7);
      expect(createdAgent.agentProfile?.maxDiscountPercent).toBe(5);

      // Verify Audit Log
      const audit = await AuditLogModel.findOne({
        action: 'AGENT_CREATED',
        entityId: createdAgent.id,
      });
      expect(audit).not.toBeNull();
    });

    it('updates agent business details and city profile', async () => {
      const updated = await userService.updateAgentProfile(
        createdAgent.id,
        {
          fullName: 'Sanjay Bhai Shah',
          email: 'sanjaybhai@sanjaytravels.com',
          agentProfile: {
            agencyName: 'Sanjay Royal Holidays',
            city: 'Gandhinagar',
          },
        },
        adminActor.userId,
        adminActor.ipAddress,
        adminActor.userAgent
      );

      expect(updated.fullName).toBe('Sanjay Bhai Shah');
      expect(updated.email).toBe('sanjaybhai@sanjaytravels.com');
      expect(updated.agentProfile?.agencyName).toBe('Sanjay Royal Holidays');
      expect(updated.agentProfile?.city).toBe('Gandhinagar');

      const audit = await AuditLogModel.findOne({
        action: 'AGENT_PROFILE_UPDATED',
        entityId: createdAgent.id,
      });
      expect(audit).not.toBeNull();
    });

    it('updates agent pricing permissions and approval thresholds', async () => {
      const updated = await userService.updateAgentPermissions(
        createdAgent.id,
        {
          maxDiscountPercent: 10,
          maxMarkupPercent: 30,
          canApproveFinalPrice: true,
          commissionRatePercent: 8,
        },
        adminActor.userId,
        adminActor.ipAddress,
        adminActor.userAgent
      );

      expect(updated.agentProfile?.maxDiscountPercent).toBe(10);
      expect(updated.agentProfile?.maxMarkupPercent).toBe(30);
      expect(updated.agentProfile?.canApproveFinalPrice).toBe(true);
      expect(updated.agentProfile?.commissionRatePercent).toBe(8);

      const audit = await AuditLogModel.findOne({
        action: 'AGENT_PERMISSIONS_UPDATED',
        entityId: createdAgent.id,
      });
      expect(audit).not.toBeNull();
    });

    it('updates agent account status safely without data destruction', async () => {
      // Deactivate
      const deactivated = await userService.updateAgentStatus(
        createdAgent.id,
        'INACTIVE',
        adminActor.userId,
        adminActor.ipAddress,
        adminActor.userAgent
      );
      expect(deactivated.status).toBe('INACTIVE');

      // Suspend
      const suspended = await userService.updateAgentStatus(
        createdAgent.id,
        'SUSPENDED',
        adminActor.userId,
        adminActor.ipAddress,
        adminActor.userAgent
      );
      expect(suspended.status).toBe('SUSPENDED');

      // Reactivate
      const reactivated = await userService.updateAgentStatus(
        createdAgent.id,
        'ACTIVE',
        adminActor.userId,
        adminActor.ipAddress,
        adminActor.userAgent
      );
      expect(reactivated.status).toBe('ACTIVE');

      const audit = await AuditLogModel.findOne({
        action: 'AGENT_STATUS_UPDATED',
        entityId: createdAgent.id,
      });
      expect(audit).not.toBeNull();
    });

    it('resets agent login password securely, revokes active refresh tokens, and leaves no secrets in audit logs', async () => {
      // 1. Log in the agent first so they possess a valid refresh token hash
      const initialAuth = await authService.login({
        mobile: createdAgent.mobile,
        password: 'PartnerSecure123!',
      });
      expect(initialAuth.tokens.accessToken).toBeDefined();

      const userBeforeReset = await UserModel.findById(createdAgent.id).select('+refreshTokenHash +passwordHash');
      expect(userBeforeReset?.refreshTokenHash).not.toBeNull();

      // 2. Perform password reset via admin
      const newPassword = 'NewSecretPassword2026!';
      const updated = await userService.resetAgentPassword(
        createdAgent.id,
        newPassword,
        adminActor.userId,
        adminActor.ipAddress,
        adminActor.userAgent
      );

      expect(updated.id).toBe(createdAgent.id);
      // Ensure user DTO does not leak any password or hash
      expect((updated as any).password).toBeUndefined();
      expect((updated as any).passwordHash).toBeUndefined();

      // 3. Verify in live MongoDB that the refresh token was immediately revoked (nullified)
      const userAfterReset = await UserModel.findById(createdAgent.id).select('+refreshTokenHash +passwordHash');
      expect(userAfterReset?.refreshTokenHash).toBeNull();

      // 4. Verify password hash is updated to a valid bcrypt hash (12 rounds)
      expect(userAfterReset?.passwordHash).not.toBe(userBeforeReset?.passwordHash);
      expect(userAfterReset?.passwordHash.startsWith('$2')).toBe(true);

      // 5. Verify audit log contains NO plaintext password or password hash
      const audit = await AuditLogModel.findOne({
        action: 'AGENT_PASSWORD_RESET',
        entityId: createdAgent.id,
      }).sort({ createdAt: -1 });

      expect(audit).not.toBeNull();
      expect(audit?.notes).not.toContain(newPassword);
      expect(audit?.notes).not.toContain(userAfterReset?.passwordHash);

      // 6. Verify that the agent can authenticate with the new password
      const authResult = await authService.login({
        mobile: createdAgent.mobile,
        password: newPassword,
      });
      expect(authResult.tokens.accessToken).toBeDefined();
      expect(authResult.user.id).toBe(createdAgent.id);

      // 7. Verify old password no longer works
      await expect(
        authService.login({
          mobile: createdAgent.mobile,
          password: 'PartnerSecure123!',
        })
      ).rejects.toThrow();
    });
  });

  describe('3. Tax Configuration & Server-Authoritative Pricing Engine', () => {
    let standardGSTRule: any;
    let luxuryGSTRule: any;

    it('creates tax rules with validated percentage rates and jurisdictions', async () => {
      standardGSTRule = await taxConfigService.createTaxRule(
        {
          name: 'GST Tour Packages 5%',
          taxType: 'GST',
          ratePercent: 5,
          jurisdiction: 'IN',
          isApplicable: true,
          isDefault: true,
          description: 'Standard domestic tour package composite GST (Section 10)',
        },
        adminActor
      );

      expect(standardGSTRule.id).toBeDefined();
      expect(standardGSTRule.ratePercent).toBe(5);
      expect(standardGSTRule.isDefault).toBe(true);

      luxuryGSTRule = await taxConfigService.createTaxRule(
        {
          name: 'GST Standalone Hotel/Transport 18%',
          taxType: 'GST',
          ratePercent: 18,
          jurisdiction: 'IN',
          isApplicable: true,
          isDefault: false,
          description: 'Standard 18% slab for standalone bookings',
        },
        adminActor
      );

      expect(luxuryGSTRule.id).toBeDefined();
      expect(luxuryGSTRule.ratePercent).toBe(18);
      expect(luxuryGSTRule.isDefault).toBe(false);
    });

    it('updates tax rule and manages unique default selection cleanly', async () => {
      // Set luxury rule as default
      const updatedLuxury = await taxConfigService.updateTaxRule(
        luxuryGSTRule.id,
        {
          isDefault: true,
        },
        adminActor
      );
      expect(updatedLuxury.isDefault).toBe(true);

      // Verify standard rule is no longer default
      const fetchedStandard = await taxConfigService.getTaxRuleById(standardGSTRule.id);
      expect(fetchedStandard.isDefault).toBe(false);

      // Restore standard rule as default
      await taxConfigService.updateTaxRule(
        standardGSTRule.id,
        {
          isDefault: true,
        },
        adminActor
      );

      const defaultRule = await taxConfigService.getDefaultTaxRule();
      expect(defaultRule?.id).toBe(standardGSTRule.id);
      expect(defaultRule?.ratePercent).toBe(5);
    });

    it('calculates exact tax centrally using authoritative pricing engine', () => {
      // Base package taxable amount: ₹50,000.00
      const baseAmount = 50000;
      const breakdown = calculateTax(baseAmount, {
        name: standardGSTRule.name,
        taxType: standardGSTRule.taxType,
        ratePercent: standardGSTRule.ratePercent,
        isApplicable: standardGSTRule.isApplicable,
      });

      expect(breakdown.taxableAmount).toBe(50000);
      expect(breakdown.ratePercent).toBe(5);
      expect(breakdown.taxAmount).toBe(2500); // 5% of 50,000
      expect(breakdown.totalWithTax).toBe(52500); // 50,000 + 2,500
      expect(breakdown.isApplicable).toBe(true);
    });

    it('requires explicit CA/owner confirmation to issue quotations; blocks issuance with unconfirmed fallback', async () => {
      // 1. Create a customer and lead
      const customer = await CustomerModel.create({
        fullName: 'Milestone 3 Traveler',
        mobile: '9825999888',
        email: 'traveler@chiragtest.com',
        city: 'Ahmedabad',
        createdBy: adminUser._id,
      });

      const lead = await LeadModel.create({
        leadNumber: `NCT-LD-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        customerId: customer._id,
        destinationId: destination.id,
        source: 'ADMIN_DIRECT',
        status: 'NEW',
        numberOfAdults: 2,
        createdBy: adminUser._id,
        assignedAgentId: adminUser._id,
      });

      // 2. Ensure all existing tax rules have isConfirmed: false (or unconfirmed)
      await TaxConfigModel.updateMany({}, { isConfirmed: false });

      // 3. Create a quotation proposal with unconfirmed default tax
      const quoteDraft = await quotationService.createQuotation(
        {
          leadId: lead._id.toString(),
          destinationId: destination.id,
          travelStartDate: '2026-05-01',
          travelEndDate: '2026-05-05',
          numberOfAdults: 2,
          markupPercent: 10,
          hotels: [],
          transports: [
            {
              pricingBasis: 'FIXED_CIRCUIT',
              numberOfDays: 4,
              tollsAndParking: 15000,
            },
          ],
        },
        adminActor
      );

      expect(quoteDraft.id).toBeDefined();
      expect(quoteDraft.pricingSummary.isTaxConfirmed).toBe(false);
      expect(quoteDraft.pricingSummary.finalSellingPrice).toBeGreaterThan(0);

      // 4. Attempting to issue this quotation proposal MUST FAIL with commercial safety 400 error
      await expect(
        quotationService.issueQuotation(quoteDraft.id, adminActor)
      ).rejects.toThrow(
        /Cannot issue quotation: GST\/tax configuration is unconfirmed/
      );

      // 5. Create an explicitly confirmed tax rule
      const confirmedTaxRule = await taxConfigService.createTaxRule(
        {
          name: 'CA Approved 5% Composite GST',
          taxType: 'GST',
          ratePercent: 5,
          jurisdiction: 'IN',
          isApplicable: true,
          isDefault: true,
          isConfirmed: true,
          description: 'Officially signed off by CA & Faisal',
        },
        adminActor
      );

      expect(confirmedTaxRule.isConfirmed).toBe(true);

      // 6. Revise quotation so it picks up the confirmed tax rule
      const revisedQuote = await quotationService.reviseQuotation(
        quoteDraft.id,
        {
          changeReason: 'Apply CA-confirmed GST rule',
          travelStartDate: '2026-05-01',
          travelEndDate: '2026-05-05',
          numberOfAdults: 2,
          markupPercent: 10,
          hotels: [],
          transports: [
            {
              pricingBasis: 'FIXED_CIRCUIT',
              numberOfDays: 4,
              tollsAndParking: 15000,
            },
          ],
        },
        adminActor
      );

      expect(revisedQuote.pricingSummary.isTaxConfirmed).toBe(true);

      // 7. Now issuing the quotation SUCCEEDS
      const { quotation: issuedQuote, shareableToken } = await quotationService.issueQuotation(
        revisedQuote.id,
        adminActor
      );

      expect(issuedQuote.status).toBe('ISSUED');
      expect(shareableToken).toBeDefined();
      expect(shareableToken.length).toBe(64);

      // 8. Immutability verification: Modifying tax configuration later does NOT alter the issued snapshot
      const priceBeforeConfigChange = issuedQuote.pricingSummary.finalSellingPrice;
      await taxConfigService.updateTaxRule(
        confirmedTaxRule.id,
        { ratePercent: 18, name: 'Changed to 18%' },
        adminActor
      );

      const fetchedAfterTaxChange = await quotationService.getQuotationById(issuedQuote.id, adminActor);
      expect(fetchedAfterTaxChange.pricingSummary.finalSellingPrice).toBe(priceBeforeConfigChange);
      expect(fetchedAfterTaxChange.pricingSummary.taxRatePercent).toBe(5);
    });

    it('enforces tax applicability invariants: blocks agent exemption, blocks unconfirmed exemption issuance, allows confirmed exemption', async () => {
      // 1. Setup agent actor context
      const agentUserDoc = await UserModel.create({
        fullName: 'Tax Edge Agent',
        mobile: '9825912345',
        passwordHash: await authService.hashPassword('DemoAgent@2026!'),
        role: 'AGENT',
        status: 'ACTIVE',
        agentProfile: {
          agencyName: 'Edge Travel Services',
          city: 'Ahmedabad',
          maxDiscountPercent: 5,
          maxMarkupPercent: 20,
        },
      });

      const agentActor = {
        userId: agentUserDoc._id.toString(),
        role: 'AGENT' as const,
        ipAddress: '127.0.0.1',
        userAgent: 'LiveAgentTest/1.0',
      };

      const customer = await CustomerModel.create({
        fullName: 'Exemption Test Traveler',
        mobile: '9825955667',
        email: 'exempt@chiragtest.com',
        city: 'Ahmedabad',
        createdBy: adminUser._id,
      });

      const lead = await LeadModel.create({
        leadNumber: `NCT-LD-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        customerId: customer._id,
        destinationId: destination.id,
        source: 'ADMIN_DIRECT',
        status: 'NEW',
        numberOfAdults: 2,
        createdBy: adminUser._id,
        assignedAgentId: agentUserDoc._id,
      });

      // 2. CHECK 1: Agent attempts to create a quotation with isTaxApplicable: false -> FORBIDDEN (403)
      await expect(
        quotationService.createQuotation(
          {
            leadId: lead._id.toString(),
            destinationId: destination.id,
            travelStartDate: '2026-06-01',
            travelEndDate: '2026-06-04',
            numberOfAdults: 2,
            markupPercent: 10,
            isTaxApplicable: false, // Unauthorized Agent bypass attempt
            hotels: [],
            transports: [
              {
                pricingBasis: 'FIXED_CIRCUIT',
                numberOfDays: 3,
                tollsAndParking: 12000,
              },
            ],
          },
          agentActor
        )
      ).rejects.toThrow(/Agents are not authorized to declare quotations tax-exempt/);

      // 3. CHECK 2: Admin creates a quotation with isTaxApplicable: false when NO confirmed exempt rule exists
      // Ensure no confirmed exempt rule exists in DB
      await TaxConfigModel.deleteMany({ isApplicable: false });

      const adminUnconfirmedExempt = await quotationService.createQuotation(
        {
          leadId: lead._id.toString(),
          destinationId: destination.id,
          travelStartDate: '2026-06-01',
          travelEndDate: '2026-06-04',
          numberOfAdults: 2,
          markupPercent: 10,
          isTaxApplicable: false,
          hotels: [],
          transports: [
            {
              pricingBasis: 'FIXED_CIRCUIT',
              numberOfDays: 3,
              tollsAndParking: 12000,
            },
          ],
        },
        adminActor
      );

      expect(adminUnconfirmedExempt.pricingSummary.isTaxApplicable).toBe(false);
      expect(adminUnconfirmedExempt.pricingSummary.isTaxConfirmed).toBe(false);
      expect(adminUnconfirmedExempt.pricingSummary.taxAmount).toBe(0);

      // Attempting to issue this unconfirmed tax-exempt quote MUST BE BLOCKED
      await expect(
        quotationService.issueQuotation(adminUnconfirmedExempt.id, adminActor)
      ).rejects.toThrow(/Cannot issue quotation: GST\/tax configuration is unconfirmed/);

      // 4. CHECK 3: Admin configures an authorized, confirmed exempt tax rule in TaxConfigModel
      const confirmedExemptRule = await taxConfigService.createTaxRule(
        {
          name: 'SEZ / International Tourist Statutory Exemption',
          taxType: 'EXEMPT',
          ratePercent: 0,
          jurisdiction: 'IN',
          isApplicable: false,
          isDefault: false,
          isConfirmed: true,
          description: 'Official CA signed-off statutory exemption under Notification 12/2017',
        },
        adminActor
      );
      expect(confirmedExemptRule.isConfirmed).toBe(true);

      // Admin revises quotation with isTaxApplicable: false; now it matches the confirmed exempt rule
      const adminConfirmedExempt = await quotationService.reviseQuotation(
        adminUnconfirmedExempt.id,
        {
          changeReason: 'Apply authorized confirmed SEZ statutory exemption',
          travelStartDate: '2026-06-01',
          travelEndDate: '2026-06-04',
          numberOfAdults: 2,
          markupPercent: 10,
          isTaxApplicable: false,
          hotels: [],
          transports: [
            {
              pricingBasis: 'FIXED_CIRCUIT',
              numberOfDays: 3,
              tollsAndParking: 12000,
            },
          ],
        },
        adminActor
      );

      expect(adminConfirmedExempt.pricingSummary.isTaxApplicable).toBe(false);
      expect(adminConfirmedExempt.pricingSummary.isTaxConfirmed).toBe(true);
      expect(adminConfirmedExempt.pricingSummary.taxRuleName).toBe(confirmedExemptRule.name);

      // 5. CHECK 4: Issuance of confirmed tax-exempt quotation SUCCEEDS cleanly
      const { quotation: issuedExempt, shareableToken } = await quotationService.issueQuotation(
        adminConfirmedExempt.id,
        adminActor
      );

      expect(issuedExempt.status).toBe('ISSUED');
      expect(shareableToken).toBeDefined();
      expect(issuedExempt.pricingSummary.isTaxApplicable).toBe(false);
      expect(issuedExempt.pricingSummary.taxAmount).toBe(0);
      expect(issuedExempt.pricingSummary.isTaxConfirmed).toBe(true);
    });
  });
});
