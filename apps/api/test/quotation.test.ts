import crypto from 'crypto';
import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { destinationRepository } from '../src/repositories/destination.repository';
import { hotelRepository } from '../src/repositories/hotel.repository';
import { leadRepository } from '../src/repositories/lead.repository';
import { quotationRepository } from '../src/repositories/quotation.repository';
import { quotationVersionRepository } from '../src/repositories/quotationVersion.repository';
import { roomCategoryRepository } from '../src/repositories/roomCategory.repository';
import { seasonalRateCardRepository } from '../src/repositories/seasonalRateCard.repository';
import { seasonRepository } from '../src/repositories/season.repository';
import { taxConfigRepository } from '../src/repositories/taxConfig.repository';
import { transportRepository } from '../src/repositories/transport.repository';
import { userRepository } from '../src/repositories/user.repository';
import { quotationService } from '../src/services/quotation.service';
import * as sequenceModule from '../src/models/sequence.model';
import { AppError } from '../src/utils/appError';

describe('Phase 3 - Steps C, D & E: Quotations Engine & Lifecycle', () => {
  const adminActor = {
    userId: '66554433221100aabbccdd01',
    role: 'ADMIN' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'vitest-test',
  };

  const agentActor = {
    userId: '66554433221100aabbccdd02',
    role: 'AGENT' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'vitest-test',
  };

  const otherAgentActor = {
    userId: '66554433221100aabbccdd03',
    role: 'AGENT' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'vitest-test',
  };

  const destinationId = new mongoose.Types.ObjectId().toString();
  const hotelId = new mongoose.Types.ObjectId().toString();
  const roomCategoryId = new mongoose.Types.ObjectId().toString();
  const seasonId = new mongoose.Types.ObjectId().toString();
  const tariffId = new mongoose.Types.ObjectId().toString();
  const leadId = new mongoose.Types.ObjectId().toString();
  const customerId = new mongoose.Types.ObjectId().toString();

  const mockDestination = new DestinationModel({
    _id: destinationId,
    name: 'Kashmir',
    isActive: true,
  });

  const mockHotel = new HotelModel({
    _id: hotelId,
    name: 'Grand Srinagar Palace',
    destinationId: new mongoose.Types.ObjectId(destinationId),
    starRating: 5,
    propertyType: 'HOTEL',
    isActive: true,
  });

  const mockRoomCategory = new RoomCategoryModel({
    _id: roomCategoryId,
    hotelId: new mongoose.Types.ObjectId(hotelId),
    name: 'Deluxe Valley View',
    baseOccupancy: 2,
    maxAdults: 3,
    maxChildren: 2,
    extraBedSupported: true,
    maxExtraBeds: 1,
    allowedMealPlans: ['CP', 'MAP', 'AP'],
    isActive: true,
  });

  const mockSeason = new SeasonModel({
    _id: seasonId,
    destinationId: new mongoose.Types.ObjectId(destinationId),
    name: 'Peak Tulip Season',
    seasonType: 'PEAK',
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-06-30'),
    priority: 10,
    isActive: true,
  });

  const mockRateCard = new SeasonalRateCardModel({
    _id: new mongoose.Types.ObjectId(),
    hotelId: new mongoose.Types.ObjectId(hotelId),
    roomCategoryId: new mongoose.Types.ObjectId(roomCategoryId),
    seasonId: new mongoose.Types.ObjectId(seasonId),
    mealPlan: 'CP',
    baseCostPerNight: 5000,
    extraAdultBedCost: 1500,
    childWithBedCost: 1000,
    childWithoutBedCost: 500,
    standardSellingPrice: 6500,
    validFrom: new Date('2026-03-01'),
    validTo: new Date('2026-06-30'),
    isActive: true,
  });

  const mockTariff = new TransportTariffModel({
    _id: tariffId,
    destinationId: new mongoose.Types.ObjectId(destinationId),
    vehicleCategory: 'SEDAN',
    seasonType: 'PEAK',
    tariffBasis: 'PER_DAY',
    baseSupplierCost: 2500,
    driverDailyAllowanceCost: 400,
    standardSellingRate: 3200,
    includedKmPerDay: 100,
    extraKmRate: 15,
    isNightHaltIncluded: false,
    nightHaltCharge: 600,
    isActive: true,
  });

  const mockAgentUser = new UserModel({
    _id: agentActor.userId,
    fullName: 'Mohammad Agent',
    role: 'AGENT',
    status: 'ACTIVE',
    agentProfile: {
      maxDiscountPercent: 5,
      maxMarkupPercent: 20,
      canApproveFinalPrice: false,
    },
  });

  const mockLead = new LeadModel({
    _id: leadId,
    leadNumber: 'NCT-LD-2026-00001',
    customerId: new mongoose.Types.ObjectId(customerId),
    destinationId: new mongoose.Types.ObjectId(destinationId),
    numberOfAdults: 2,
    numberOfChildren: 1,
    assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
    status: 'NEW',
    createdBy: new mongoose.Types.ObjectId(agentActor.userId),
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);
    vi.spyOn(hotelRepository, 'findById').mockResolvedValue(mockHotel);
    vi.spyOn(roomCategoryRepository, 'findById').mockResolvedValue(mockRoomCategory);
    vi.spyOn(seasonalRateCardRepository, 'findMany').mockResolvedValue({ rateCards: [mockRateCard], total: 1 });
    vi.spyOn(seasonRepository, 'findByDestination').mockResolvedValue([mockSeason]);
    vi.spyOn(transportRepository, 'findTariffById').mockResolvedValue(mockTariff);
    vi.spyOn(destinationRepository, 'findById').mockResolvedValue(mockDestination);
    vi.spyOn(leadRepository, 'findById').mockResolvedValue(mockLead);
    vi.spyOn(leadRepository, 'update').mockResolvedValue(mockLead);
    vi.spyOn(userRepository, 'findById').mockResolvedValue(mockAgentUser);
    vi.spyOn(taxConfigRepository, 'findDefault').mockResolvedValue(
      new TaxConfigModel({ name: 'Standard GST', ratePercent: 5, isDefault: true, isApplicable: true })
    );
    vi.spyOn(sequenceModule, 'getNextSequenceValue').mockResolvedValue(1);
    vi.spyOn(quotationRepository, 'findBySupersededTokenHash').mockResolvedValue(null);
  });

  describe('1. Quotation Calculation Details', () => {
    it('calculates hotel, transport, markup, tax and gross profit accurately', async () => {
      const result = await quotationService.calculateQuoteDetails({
        leadId,
        destinationId,
        travelStartDate: '2026-04-10',
        travelEndDate: '2026-04-12', // 2 nights
        numberOfAdults: 2,
        numberOfChildren: 1,
        hotels: [
          {
            hotelId,
            roomCategoryId,
            checkInDate: '2026-04-10',
            checkOutDate: '2026-04-12',
            numberOfRooms: 1,
            adultsCount: 2,
            childrenWithBedCount: 1,
            childrenWithoutBedCount: 0,
            mealPlan: 'CP',
          },
        ],
        transports: [
          {
            tariffId,
            pricingBasis: 'PER_DAY',
            numberOfDays: 2,
            driverAllowanceDays: 2,
            tollsAndParking: 300,
          },
        ],
        markupPercent: 10,
        discountPercent: 0,
        isTaxApplicable: true,
      });

      // Hotel calculation: 2 nights * (5000 base + 1000 childWithBed) = 12000
      // Transport calculation: 2 days * 2500 base + 2 days * 400 driver + 300 tolls = 6100
      // Total Base Cost = 12000 + 6100 = 18100
      // Markup 10% = 1810
      // Taxable = 19910
      // GST 5% = 995.5
      // Final Selling = 20905.5
      // Projected Gross Profit = 19910 - 18100 = 1810
      expect(result.pricingSummary.totalBaseSupplierCost).toBe(18100);
      expect(result.pricingSummary.totalMarkupAmount).toBe(1810);
      expect(result.pricingSummary.taxableAmount).toBe(19910);
      expect(result.pricingSummary.taxAmount).toBe(995.5);
      expect(result.pricingSummary.finalSellingPrice).toBe(20905.5);
      expect(result.pricingSummary.projectedGrossProfit).toBe(1810);
    });
  });

  describe('2. Quotation Creation & Agent Guardrails', () => {
    it('creates quotation with NCT-QT-YYYY-XXXXX format and DRAFT status within agent limits', async () => {
      const mockCreatedQuote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(),
        quoteNumber: `NCT-QT-${new Date().getFullYear()}-00001`,
        leadId: new mongoose.Types.ObjectId(leadId),
        customerId: new mongoose.Types.ObjectId(customerId),
        assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
        destinationId: new mongoose.Types.ObjectId(destinationId),
        travelStartDate: new Date('2026-04-10'),
        travelEndDate: new Date('2026-04-12'),
        durationNights: 2,
        durationDays: 3,
        numberOfAdults: 2,
        numberOfChildren: 1,
        numberOfInfants: 0,
        currentVersion: 1,
        status: 'DRAFT',
        validUntil: new Date('2026-04-17'),
        hotels: [],
        transports: [],
        pricingSummary: {
          totalBaseSupplierCost: 18100,
          totalMarkupAmount: 1810,
          markupPercent: 10,
          discountAmount: 0,
          discountPercent: 0,
          taxableAmount: 19910,
          taxRatePercent: 5,
          taxAmount: 995.5,
          isTaxApplicable: true,
          finalSellingPrice: 20905.5,
          projectedGrossProfit: 1810,
        },
        createdBy: new mongoose.Types.ObjectId(agentActor.userId),
      });

      vi.spyOn(quotationRepository, 'create').mockResolvedValue(mockCreatedQuote);
      const auditSpy = vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);

      const result = await quotationService.createQuotation(
        {
          leadId,
          destinationId,
          travelStartDate: '2026-04-10',
          travelEndDate: '2026-04-12',
          numberOfAdults: 2,
          numberOfChildren: 1,
          hotels: [
            {
              hotelId,
              roomCategoryId,
              checkInDate: '2026-04-10',
              checkOutDate: '2026-04-12',
              numberOfRooms: 1,
              adultsCount: 2,
              mealPlan: 'CP',
            },
          ],
          transports: [],
          markupPercent: 10,
          discountPercent: 3, // <= agent limit 5%
        },
        agentActor
      );

      expect(result.quoteNumber).toMatch(/^NCT-QT-\d{4}-\d{5}$/);
      expect(result.status).toBe('DRAFT');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUOTATION_CREATED',
          entityType: 'QUOTATION',
        })
      );
    });

    it('forces status to PENDING_ADMIN_APPROVAL when agent discount exceeds agent profile limit', async () => {
      let createdStatus = '';
      vi.spyOn(quotationRepository, 'create').mockImplementation(async (data: any) => {
        createdStatus = data.status;
        return new QuotationModel({ ...data, _id: new mongoose.Types.ObjectId() });
      });

      await quotationService.createQuotation(
        {
          leadId,
          destinationId,
          travelStartDate: '2026-04-10',
          travelEndDate: '2026-04-12',
          numberOfAdults: 2,
          hotels: [],
          transports: [],
          markupPercent: 10,
          discountPercent: 8, // Exceeds agent max discount of 5%!
        },
        agentActor
      );

      expect(createdStatus).toBe('PENDING_ADMIN_APPROVAL');
    });

    it('masks confidential supplier cost and profit for agent but preserves it for admin', async () => {
      const quote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(),
        quoteNumber: 'NCT-QT-2026-00001',
        leadId: new mongoose.Types.ObjectId(leadId),
        customerId: new mongoose.Types.ObjectId(customerId),
        assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
        destinationId: new mongoose.Types.ObjectId(destinationId),
        travelStartDate: new Date('2026-04-10'),
        travelEndDate: new Date('2026-04-12'),
        durationNights: 2,
        durationDays: 3,
        numberOfAdults: 2,
        numberOfChildren: 0,
        numberOfInfants: 0,
        currentVersion: 1,
        status: 'DRAFT',
        validUntil: new Date('2026-04-17'),
        hotels: [
          {
            hotelId: new mongoose.Types.ObjectId(hotelId),
            roomCategoryId: new mongoose.Types.ObjectId(roomCategoryId),
            checkInDate: new Date('2026-04-10'),
            checkOutDate: new Date('2026-04-12'),
            numberOfNights: 2,
            numberOfRooms: 1,
            adultsCount: 2,
            mealPlan: 'CP',
            supplierCost: 10000,
            calculatedPrice: 10000,
          },
        ],
        transports: [],
        pricingSummary: {
          totalBaseSupplierCost: 10000,
          totalMarkupAmount: 1500,
          markupPercent: 15,
          discountAmount: 0,
          discountPercent: 0,
          taxableAmount: 11500,
          taxRatePercent: 5,
          taxAmount: 575,
          isTaxApplicable: true,
          finalSellingPrice: 12075,
          projectedGrossProfit: 1500,
        },
        createdBy: new mongoose.Types.ObjectId(agentActor.userId),
      });

      vi.spyOn(quotationRepository, 'findById').mockResolvedValue(quote);

      const agentView = await quotationService.getQuotationById(quote._id.toString(), agentActor);
      expect(agentView.pricingSummary.totalBaseSupplierCost).toBeUndefined();
      expect(agentView.pricingSummary.projectedGrossProfit).toBeUndefined();
      expect(agentView.hotels[0].supplierCost).toBeUndefined();

      const adminView = await quotationService.getQuotationById(quote._id.toString(), adminActor);
      expect(adminView.pricingSummary.totalBaseSupplierCost).toBe(10000);
      expect(adminView.pricingSummary.projectedGrossProfit).toBe(1500);
      expect(adminView.hotels[0].supplierCost).toBe(10000);
    });
  });

  describe('3. Revision & Version Immutability', () => {
    it('snapshots previous version into QuotationVersion and increments version number', async () => {
      const quoteId = new mongoose.Types.ObjectId().toString();
      const existingQuote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(quoteId),
        quoteNumber: 'NCT-QT-2026-00001',
        leadId: new mongoose.Types.ObjectId(leadId),
        customerId: new mongoose.Types.ObjectId(customerId),
        assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
        destinationId: new mongoose.Types.ObjectId(destinationId),
        travelStartDate: new Date('2026-04-10'),
        travelEndDate: new Date('2026-04-12'),
        durationNights: 2,
        durationDays: 3,
        numberOfAdults: 2,
        numberOfChildren: 0,
        numberOfInfants: 0,
        currentVersion: 1,
        status: 'ISSUED',
        validUntil: new Date('2026-04-17'),
        hotels: [],
        transports: [],
        pricingSummary: {
          totalBaseSupplierCost: 10000,
          totalMarkupAmount: 1000,
          markupPercent: 10,
          discountAmount: 0,
          discountPercent: 0,
          taxableAmount: 11000,
          taxRatePercent: 5,
          taxAmount: 550,
          isTaxApplicable: true,
          finalSellingPrice: 11550,
          projectedGrossProfit: 1000,
        },
        createdBy: new mongoose.Types.ObjectId(agentActor.userId),
      });

      const updatedQuote = new QuotationModel({
        ...existingQuote.toObject(),
        currentVersion: 2,
        status: 'DRAFT',
      });

      vi.spyOn(quotationRepository, 'findById').mockResolvedValue(existingQuote);
      const versionSpy = vi.spyOn(quotationVersionRepository, 'create').mockResolvedValue({} as any);
      vi.spyOn(quotationRepository, 'atomicReviseQuotation').mockResolvedValue(updatedQuote);
      vi.spyOn(quotationRepository, 'update').mockResolvedValue(updatedQuote);
      const auditSpy = vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);

      const result = await quotationService.reviseQuotation(
        quoteId,
        {
          leadId,
          destinationId,
          travelStartDate: '2026-04-10',
          travelEndDate: '2026-04-13', // extended to 3 nights
          numberOfAdults: 2,
          hotels: [],
          transports: [],
          markupPercent: 10,
          changeReason: 'Customer requested 1 additional night',
        },
        agentActor
      );

      expect(versionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          quotationId: existingQuote._id,
          versionNumber: 1,
          changeReason: 'Customer requested 1 additional night',
        })
      );
      expect(result.currentVersion).toBe(2);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUOTATION_VERSION_CREATED',
        })
      );
    });

    it('rejects revision if lead was reassigned away from former agent', async () => {
      const quoteId = new mongoose.Types.ObjectId().toString();
      const existingQuote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(quoteId),
        leadId: new mongoose.Types.ObjectId(leadId),
        assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
      });

      // Lead reassigned to other agent
      const reassignedLead = new LeadModel({
        _id: leadId,
        assignedAgentId: new mongoose.Types.ObjectId(otherAgentActor.userId),
      });

      vi.spyOn(quotationRepository, 'findById').mockResolvedValue(existingQuote);
      vi.spyOn(leadRepository, 'findById').mockResolvedValue(reassignedLead);

      await expect(
        quotationService.reviseQuotation(
          quoteId,
          {
            leadId,
            destinationId,
            travelStartDate: '2026-04-10',
            travelEndDate: '2026-04-12',
            numberOfAdults: 2,
            hotels: [],
            transports: [],
            markupPercent: 10,
            changeReason: 'Unauthorized revision attempt',
          },
          agentActor
        )
      ).rejects.toThrow(/permission|no longer assigned/i);
    });
  });

  describe('4. Admin Approval Workflow', () => {
    it('forbids non-admin agent from approving or rejecting quotations', async () => {
      await expect(
        quotationService.approveQuotation(
          new mongoose.Types.ObjectId().toString(),
          { decision: 'APPROVE' },
          agentActor
        )
      ).rejects.toThrow(/Only administrators/);
    });

    it('allows Admin to approve quotation override and records audit log', async () => {
      const quoteId = new mongoose.Types.ObjectId().toString();
      const pendingQuote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(quoteId),
        status: 'PENDING_ADMIN_APPROVAL',
      });
      const approvedQuote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(quoteId),
        status: 'APPROVED',
      });

      vi.spyOn(quotationRepository, 'findById').mockResolvedValue(pendingQuote);
      vi.spyOn(quotationRepository, 'update').mockResolvedValue(approvedQuote);
      const auditSpy = vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);

      const result = await quotationService.approveQuotation(
        quoteId,
        { decision: 'APPROVE', notes: 'Approved 8% discount for loyalty customer' },
        adminActor
      );

      expect(result.status).toBe('APPROVED');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUOTATION_PRICE_OVERRIDE_APPROVED',
          entityType: 'QUOTATION',
        })
      );
    });
  });

  describe('5. Issuance & Secure Public Access', () => {
    it('refuses to issue quotation if still pending admin approval', async () => {
      const quote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(),
        status: 'PENDING_ADMIN_APPROVAL',
        assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
      });

      vi.spyOn(quotationRepository, 'findById').mockResolvedValue(quote);

      await expect(
        quotationService.issueQuotation(quote._id.toString(), agentActor)
      ).rejects.toThrow(/pending Admin approval/);
    });

    it('generates cryptographic token upon issuance, storing hash in DB and returning raw token', async () => {
      const quoteId = new mongoose.Types.ObjectId().toString();
      const quote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(quoteId),
        status: 'APPROVED',
        assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
        currentVersion: 1,
        quoteNumber: 'NCT-QT-2026-00001',
        travelStartDate: new Date('2026-04-10'),
        travelEndDate: new Date('2026-04-12'),
        durationNights: 2,
        durationDays: 3,
        numberOfAdults: 2,
        validUntil: new Date('2026-04-17'),
        hotels: [],
        transports: [],
        pricingSummary: {
          totalBaseSupplierCost: 10000,
          totalMarkupAmount: 1000,
          markupPercent: 10,
          discountAmount: 0,
          discountPercent: 0,
          taxableAmount: 11000,
          taxRatePercent: 5,
          taxAmount: 550,
          isTaxApplicable: true,
          isTaxConfirmed: true,
          finalSellingPrice: 11550,
          projectedGrossProfit: 1000,
        },
      });

      let storedHash = '';
      vi.spyOn(quotationRepository, 'findById').mockResolvedValue(quote);
      vi.spyOn(quotationRepository, 'update').mockImplementation(async (_id: any, updateData: any) => {
        storedHash = updateData.shareableTokenHash;
        return new QuotationModel({ ...quote.toObject(), ...updateData });
      });

      const { quotation, shareableToken } = await quotationService.issueQuotation(quoteId, agentActor);

      expect(quotation.status).toBe('ISSUED');
      expect(shareableToken).toBeDefined();
      expect(shareableToken.length).toBe(64); // 32 bytes hex = 64 chars

      // Verify that the hash stored in DB matches sha256(rawToken)
      const expectedHash = crypto.createHash('sha256').update(shareableToken).digest('hex');
      expect(storedHash).toBe(expectedHash);
    });

    it('rejects quotation issuance if tax configuration is unconfirmed (pending Faisal/CA approval)', async () => {
      const quoteId = new mongoose.Types.ObjectId().toString();
      const quote = new QuotationModel({
        _id: quoteId,
        quoteNumber: 'NCT-QT-2026-00001',
        leadId: new mongoose.Types.ObjectId(),
        customerId: new mongoose.Types.ObjectId(),
        assignedAgentId: agentActor.userId,
        status: 'DRAFT',
        currentVersion: 1,
        travelStartDate: new Date('2026-04-10'),
        travelEndDate: new Date('2026-04-12'),
        durationNights: 2,
        durationDays: 3,
        numberOfAdults: 2,
        validUntil: new Date('2026-04-17'),
        hotels: [],
        transports: [],
        pricingSummary: {
          totalBaseSupplierCost: 10000,
          totalMarkupAmount: 1000,
          markupPercent: 10,
          discountAmount: 0,
          discountPercent: 0,
          taxableAmount: 11000,
          taxRatePercent: 5,
          taxAmount: 550,
          isTaxApplicable: true,
          isTaxConfirmed: false,
          finalSellingPrice: 11550,
          projectedGrossProfit: 1000,
        },
      });

      vi.spyOn(quotationRepository, 'findById').mockResolvedValue(quote);

      await expect(quotationService.issueQuotation(quoteId, agentActor)).rejects.toThrow(
        /Cannot issue quotation: GST\/tax configuration is unconfirmed/
      );
    });

    it('public customer endpoint retrieves quote via raw token with ZERO internal supplier costs leaked', async () => {
      const rawToken = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const quote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(),
        quoteNumber: 'NCT-QT-2026-00001',
        shareableTokenHash: tokenHash,
        status: 'ISSUED',
        validUntil: new Date(Date.now() + 86400000), // tomorrow
        travelStartDate: new Date('2026-04-10'),
        travelEndDate: new Date('2026-04-12'),
        durationNights: 2,
        durationDays: 3,
        numberOfAdults: 2,
        hotels: [
          {
            checkInDate: new Date('2026-04-10'),
            checkOutDate: new Date('2026-04-12'),
            numberOfNights: 2,
            numberOfRooms: 1,
            mealPlan: 'CP',
            supplierCost: 5000,
            calculatedPrice: 5000,
          },
        ],
        transports: [],
        pricingSummary: {
          totalBaseSupplierCost: 5000,
          totalMarkupAmount: 1000,
          markupPercent: 20,
          discountAmount: 0,
          discountPercent: 0,
          taxableAmount: 6000,
          taxRatePercent: 5,
          taxAmount: 300,
          isTaxApplicable: true,
          finalSellingPrice: 6300,
          projectedGrossProfit: 1000,
        },
      });

      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(quote);

      const publicResult = await quotationService.getPublicQuotation(rawToken);

      expect(publicResult.quoteNumber).toBe('NCT-QT-2026-00001');
      expect(publicResult.pricingSummary.finalSellingPrice).toBe(6300);

      // CRITICAL LEAKAGE CHECKS: Confidential supplier cost and profit MUST be absent
      const rawJson = JSON.stringify(publicResult);
      expect(rawJson).not.toContain('totalBaseSupplierCost');
      expect(rawJson).not.toContain('projectedGrossProfit');
      expect(rawJson).not.toContain('supplierCost');
      expect(rawJson).not.toContain('markupPercent');
    });

    it('rejects public quotation request with invalid or nonexistent token', async () => {
      vi.spyOn(quotationRepository, 'findByShareableTokenHash').mockResolvedValue(null);

      await expect(
        quotationService.getPublicQuotation('invalid_token_1234567890abcdef')
      ).rejects.toThrow(/invalid or has expired/);
    });

    it('refuses to issue quotation if final selling price is zero without explicit complimentary policy authorization', async () => {
      const zeroQuote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(),
        status: 'APPROVED',
        assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
        hotels: [],
        transports: [],
        pricingSummary: {
          totalBaseSupplierCost: 0,
          totalMarkupAmount: 0,
          markupPercent: 10,
          discountAmount: 0,
          discountPercent: 0,
          taxableAmount: 0,
          taxRatePercent: 5,
          taxAmount: 0,
          isTaxApplicable: true,
          finalSellingPrice: 0,
          projectedGrossProfit: 0,
        },
      });

      vi.spyOn(quotationRepository, 'findById').mockResolvedValue(zeroQuote);

      await expect(
        quotationService.issueQuotation(zeroQuote._id.toString(), agentActor)
      ).rejects.toThrow(/Cannot issue quotation with ₹0 selling price/);
    });

    it('permits issuing zero-price quotation when explicitly approved with complimentary policy authorization', async () => {
      const compQuote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(),
        status: 'APPROVED',
        assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
        hotels: [],
        transports: [],
        approvalReason: 'Complimentary promotional voucher approved by management',
        pricingSummary: {
          totalBaseSupplierCost: 0,
          totalMarkupAmount: 0,
          markupPercent: 0,
          discountAmount: 0,
          discountPercent: 0,
          taxableAmount: 0,
          taxRatePercent: 0,
          taxAmount: 0,
          isTaxApplicable: false,
          isTaxConfirmed: true,
          finalSellingPrice: 0,
          projectedGrossProfit: 0,
        },
      });

      vi.spyOn(quotationRepository, 'findById').mockResolvedValue(compQuote);
      vi.spyOn(quotationRepository, 'update').mockResolvedValue(compQuote);
      vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);

      const issued = await quotationService.issueQuotation(compQuote._id.toString(), agentActor);
      expect(issued.shareableToken).toBeDefined();
    });

    it('rejects issuing quotation if isTaxApplicable is false but tax exemption is unconfirmed', async () => {
      const unconfirmedExemptQuote = new QuotationModel({
        _id: new mongoose.Types.ObjectId(),
        status: 'APPROVED',
        assignedAgentId: new mongoose.Types.ObjectId(agentActor.userId),
        hotels: [],
        transports: [],
        pricingSummary: {
          totalBaseSupplierCost: 10000,
          totalMarkupAmount: 1000,
          markupPercent: 10,
          discountAmount: 0,
          discountPercent: 0,
          taxableAmount: 11000,
          taxRatePercent: 0,
          taxAmount: 0,
          isTaxApplicable: false,
          isTaxConfirmed: false,
          finalSellingPrice: 11000,
          projectedGrossProfit: 1000,
        },
      });

      vi.spyOn(quotationRepository, 'findById').mockResolvedValue(unconfirmedExemptQuote);

      await expect(
        quotationService.issueQuotation(unconfirmedExemptQuote._id.toString(), agentActor)
      ).rejects.toThrow(/Cannot issue quotation: GST\/tax configuration is unconfirmed/);
    });

    it('rejects quotation calculation when room has no matching seasonal rate card', async () => {
      vi.spyOn(seasonalRateCardRepository, 'findMany').mockResolvedValue({ rateCards: [], total: 0 });

      await expect(
        quotationService.calculateQuoteDetails({
          leadId,
          destinationId,
          travelStartDate: '2026-04-10',
          travelEndDate: '2026-04-12',
          numberOfAdults: 2,
          hotels: [
            {
              hotelId,
              roomCategoryId,
              checkInDate: '2026-04-10',
              checkOutDate: '2026-04-12',
              numberOfRooms: 1,
              adultsCount: 2,
              mealPlan: 'CP',
            },
          ],
          transports: [],
          markupPercent: 10,
        })
      ).rejects.toThrow(/rate card/i);
    });
  });
});
