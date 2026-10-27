import { AuthenticatedUser, SeasonDto } from '@chirag/types';
import { resolveSeasonForDate } from '@chirag/pricing';
import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DestinationModel } from '../src/models/destination.model';
import { HotelModel } from '../src/models/hotel.model';
import { RoomCategoryModel } from '../src/models/roomCategory.model';
import { SeasonModel } from '../src/models/season.model';
import { SeasonalRateCardModel } from '../src/models/seasonalRateCard.model';
import { TourPackageModel } from '../src/models/tourPackage.model';
import { DriverModel } from '../src/models/driver.model';
import { TransportTariffModel } from '../src/models/transportTariff.model';
import { VehicleModel } from '../src/models/vehicle.model';
import { VehicleVendorModel } from '../src/models/vehicleVendor.model';
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { destinationRepository } from '../src/repositories/destination.repository';
import { hotelRepository } from '../src/repositories/hotel.repository';
import { tourPackageRepository } from '../src/repositories/package.repository';
import { roomCategoryRepository } from '../src/repositories/roomCategory.repository';
import { seasonRepository } from '../src/repositories/season.repository';
import { seasonalRateCardRepository } from '../src/repositories/seasonalRateCard.repository';
import { taxConfigRepository } from '../src/repositories/taxConfig.repository';
import { transportRepository } from '../src/repositories/transport.repository';
import { destinationService } from '../src/services/destination.service';
import { hotelService } from '../src/services/hotel.service';
import { tourPackageService } from '../src/services/package.service';
import { seasonService } from '../src/services/season.service';
import { taxConfigService } from '../src/services/taxConfig.service';
import { transportService } from '../src/services/transport.service';
import { AppError } from '../src/utils/appError';

describe('Phase 2: Master Data & Inventory Engine', () => {
  const adminActor = {
    userId: '66554433221100aabbccddee',
    role: 'ADMIN' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'vitest-agent',
  };

  const agentActor = {
    userId: '66554433221100aabbccdd11',
    role: 'AGENT' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'vitest-agent',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);
  });

  // ==========================================
  // 1. DESTINATIONS
  // ==========================================
  describe('1. Destinations Engine', () => {
    it('creates destination and autogenerates slug with audit log', async () => {
      const mockDest = new DestinationModel({
        _id: new mongoose.Types.ObjectId(),
        name: 'Kashmir Valley',
        slug: 'kashmir-valley',
        country: 'India',
        state: 'Jammu & Kashmir',
        region: 'NORTH',
        highlights: ['Dal Lake', 'Gulmarg Gondola', 'Pahalgam Valley'],
        isActive: true,
      });

      vi.spyOn(destinationRepository, 'findBySlug').mockResolvedValue(null);
      vi.spyOn(destinationRepository, 'findByName').mockResolvedValue(null);
      vi.spyOn(destinationRepository, 'create').mockResolvedValue(mockDest);
      const auditSpy = vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);

      const result = await destinationService.createDestination(
        {
          name: 'Kashmir Valley',
          region: 'NORTH',
          state: 'Jammu & Kashmir',
          highlights: ['Dal Lake', 'Gulmarg Gondola', 'Pahalgam Valley'],
        },
        adminActor
      );

      expect(result.name).toBe('Kashmir Valley');
      expect(result.slug).toBe('kashmir-valley');
      expect(result.region).toBe('NORTH');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MASTER_DATA_CREATED',
          entityType: 'DESTINATION',
        })
      );
    });

    it('rejects duplicate destination name or slug', async () => {
      vi.spyOn(destinationRepository, 'findBySlug').mockResolvedValue({} as any);
      vi.spyOn(destinationRepository, 'findByName').mockResolvedValue(null);

      await expect(
        destinationService.createDestination(
          { name: 'Goa', region: 'WEST' },
          adminActor
        )
      ).rejects.toThrowError(AppError);
    });

    it('toggles destination active status with audit log', async () => {
      const mockDest = new DestinationModel({
        _id: new mongoose.Types.ObjectId(),
        name: 'Goa',
        slug: 'goa',
        region: 'WEST',
        isActive: true,
      });

      vi.spyOn(destinationRepository, 'findById').mockResolvedValue(mockDest);
      vi.spyOn(destinationRepository, 'update').mockResolvedValue(
        new DestinationModel({ ...mockDest.toObject(), isActive: false })
      );
      const auditSpy = vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);

      const result = await destinationService.toggleDestinationStatus(
        mockDest._id.toString(),
        false,
        adminActor
      );

      expect(result.isActive).toBe(false);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MASTER_DATA_DEACTIVATED',
          entityType: 'DESTINATION',
        })
      );
    });
  });

  // ==========================================
  // 2. HOTELS & ROOM CATEGORIES
  // ==========================================
  describe('2. Hotels and Room Categories', () => {
    const destId = new mongoose.Types.ObjectId().toString();

    it('creates hotel linked to validated destination ID', async () => {
      vi.spyOn(destinationRepository, 'findById').mockResolvedValue(
        new DestinationModel({ _id: destId, name: 'Goa', region: 'WEST', isActive: true })
      );

      const mockHotel = new HotelModel({
        _id: new mongoose.Types.ObjectId(),
        name: 'Taj Exotica Resort',
        destinationId: new mongoose.Types.ObjectId(destId),
        starRating: 5,
        propertyType: 'RESORT',
        amenities: ['Pool', 'Spa', 'Beachfront'],
        vendorName: 'Indian Hotels Company',
        contactPhone: '9876543210',
        contactEmail: 'taj@ihcl.com',
        isActive: true,
      });

      vi.spyOn(hotelRepository, 'create').mockResolvedValue(mockHotel);

      const result = await hotelService.createHotel(
        {
          name: 'Taj Exotica Resort',
          destinationId: destId,
          starRating: 5,
          propertyType: 'RESORT',
          amenities: ['Pool', 'Spa', 'Beachfront'],
          vendorName: 'Indian Hotels Company',
          contactPhone: '9876543210',
        },
        adminActor
      );

      expect(result.name).toBe('Taj Exotica Resort');
      expect(result.destinationId).toBe(destId);
      expect(result.starRating).toBe(5);
      expect(result.vendorName).toBe('Indian Hotels Company');
    });

    it('sanitizes vendor confidential details when accessed by non-admin roles', async () => {
      const mockHotel = new HotelModel({
        _id: new mongoose.Types.ObjectId(),
        name: 'Heritage Palace',
        destinationId: new mongoose.Types.ObjectId(destId),
        starRating: 4,
        propertyType: 'HERITAGE_HAVELI',
        vendorName: 'Confidential Royal Supplier',
        contactPhone: '9988776655',
        contactEmail: 'supplier@palace.com',
        isActive: true,
      });

      vi.spyOn(hotelRepository, 'findById').mockResolvedValue(mockHotel);
      vi.spyOn(roomCategoryRepository, 'findByHotelId').mockResolvedValue([]);

      const adminView = await hotelService.getHotelById(mockHotel._id.toString(), 'ADMIN');
      const agentView = await hotelService.getHotelById(mockHotel._id.toString(), 'AGENT');

      expect(adminView.vendorName).toBe('Confidential Royal Supplier');
      expect(adminView.contactPhone).toBe('9988776655');

      // CONFIDENTIALITY ASSERTION: Non-admin roles must not see supplier details
      expect(agentView.vendorName).toBeUndefined();
      expect(agentView.contactPhone).toBeUndefined();
      expect(agentView.contactEmail).toBeUndefined();
    });

    it('rejects duplicate room category name within the same hotel', async () => {
      const hotelId = new mongoose.Types.ObjectId().toString();
      vi.spyOn(hotelRepository, 'findById').mockResolvedValue(
        new HotelModel({ _id: hotelId, name: 'Grand Hotel' })
      );
      vi.spyOn(roomCategoryRepository, 'findByNameAndHotel').mockResolvedValue(
        new RoomCategoryModel({ name: 'Deluxe Room' })
      );

      await expect(
        hotelService.createRoomCategory(
          {
            hotelId,
            name: 'Deluxe Room',
          },
          adminActor
        )
      ).rejects.toThrowError(AppError);
    });
  });

  // ==========================================
  // 3. SEASONS & OVERLAP RESOLUTION
  // ==========================================
  describe('3. Seasons and Overlap Resolution', () => {
    const seasons: SeasonDto[] = [
      {
        id: 's1',
        name: 'Winter Regular 2026',
        seasonType: 'REGULAR',
        destinationId: 'dest1',
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        priority: 10,
      },
      {
        id: 's2',
        name: 'Diwali Festival 2026',
        seasonType: 'FESTIVAL',
        destinationId: 'dest1',
        startDate: '2026-11-05',
        endDate: '2026-11-15',
        priority: 50,
      },
      {
        id: 's3',
        name: 'New Year Super Peak',
        seasonType: 'SUPER_PEAK',
        destinationId: 'dest1',
        startDate: '2026-12-20',
        endDate: '2026-12-31',
        priority: 100,
      },
    ];

    it('resolves date falling in regular season to REGULAR', () => {
      const resolved = resolveSeasonForDate('2026-10-15', seasons);
      expect(resolved).not.toBeNull();
      expect(resolved?.seasonType).toBe('REGULAR');
    });

    it('resolves date during Diwali overlap to FESTIVAL by higher priority', () => {
      const resolved = resolveSeasonForDate('2026-11-10', seasons);
      expect(resolved).not.toBeNull();
      expect(resolved?.seasonType).toBe('FESTIVAL');
      expect(resolved?.priority).toBe(50);
    });

    it('resolves date during New Year overlap to SUPER_PEAK by maximum priority', () => {
      const resolved = resolveSeasonForDate('2026-12-25', seasons);
      expect(resolved).not.toBeNull();
      expect(resolved?.seasonType).toBe('SUPER_PEAK');
      expect(resolved?.priority).toBe(100);
    });

    it('rejects invalid season date ranges where endDate is before startDate', async () => {
      vi.spyOn(destinationRepository, 'findById').mockResolvedValue({} as any);

      await expect(
        seasonService.createSeason(
          {
            name: 'Broken Season',
            seasonType: 'PEAK',
            destinationId: new mongoose.Types.ObjectId().toString(),
            startDate: '2026-12-25',
            endDate: '2026-12-20', // Invalid: end before start
          },
          adminActor
        )
      ).rejects.toThrowError(AppError);
    });
  });

  // ==========================================
  // 4. SEASONAL RATE CARDS & COST CONFIDENTIALITY
  // ==========================================
  describe('4. Seasonal Rate Cards & Confidentiality', () => {
    it('masks baseCostPerNight and extra bed costs for non-admin viewers', async () => {
      const mockRateCard = new SeasonalRateCardModel({
        _id: new mongoose.Types.ObjectId(),
        hotelId: new mongoose.Types.ObjectId(),
        roomCategoryId: new mongoose.Types.ObjectId(),
        seasonId: new mongoose.Types.ObjectId(),
        mealPlan: 'MAP',
        baseCostPerNight: 4000,
        extraAdultBedCost: 1200,
        childWithBedCost: 800,
        childWithoutBedCost: 400,
        standardSellingPrice: 6500,
        validFrom: new Date('2026-10-01'),
        validTo: new Date('2026-12-31'),
        isActive: true,
      });

      vi.spyOn(seasonalRateCardRepository, 'findMany').mockResolvedValue({
        rateCards: [mockRateCard],
        total: 1,
      });

      const adminResult = await hotelService.listRateCards({ role: 'ADMIN' });
      const agentResult = await hotelService.listRateCards({ role: 'AGENT' });

      // Admin sees exact supplier rates
      expect(adminResult.items[0]?.baseCostPerNight).toBe(4000);
      expect(adminResult.items[0]?.standardSellingPrice).toBe(6500);

      // Agent sees selling price, but supplier costs are strictly zeroed/sanitized
      expect(agentResult.items[0]?.standardSellingPrice).toBe(6500);
      expect(agentResult.items[0]?.baseCostPerNight).toBe(0);
      expect(agentResult.items[0]?.extraAdultBedCost).toBe(0);
    });
  });

  // ==========================================
  // 5. TRANSPORT INVENTORY (DECOUPLED ENTITIES)
  // ==========================================
  describe('5. Transport Inventory Separation', () => {
    it('creates VehicleVendor, Vehicle, Driver, and TransportTariff as decoupled entities', async () => {
      const vendorId = new mongoose.Types.ObjectId().toString();
      const destId = new mongoose.Types.ObjectId().toString();

      // Vendor
      const mockVendor = new VehicleVendorModel({
        _id: new mongoose.Types.ObjectId(vendorId),
        businessName: 'Kashmir Transporters Union',
        contactPerson: 'Bashir Ahmed',
        phone: '9419012345',
        settlementTerms: 'Weekly bank transfer, 10% advance',
        isActive: true,
      });
      vi.spyOn(transportRepository, 'createVendor').mockResolvedValue(mockVendor);
      vi.spyOn(transportRepository, 'findVendorById').mockResolvedValue(mockVendor);

      const vendor = await transportService.createVendor(
        {
          businessName: 'Kashmir Transporters Union',
          contactPerson: 'Bashir Ahmed',
          phone: '9419012345',
          settlementTerms: 'Weekly bank transfer, 10% advance',
        },
        adminActor
      );
      expect(vendor.businessName).toBe('Kashmir Transporters Union');
      expect(vendor.settlementTerms).toBe('Weekly bank transfer, 10% advance');

      // Vehicle
      const mockVehicle = new VehicleModel({
        _id: new mongoose.Types.ObjectId(),
        vendorId: new mongoose.Types.ObjectId(vendorId),
        model: 'Innova Crysta',
        category: 'SUV',
        registrationNumber: 'JK01AB1234',
        seatingCapacity: 6,
        hasAC: true,
        status: 'AVAILABLE',
      });
      vi.spyOn(transportRepository, 'findVehicleByRegistration').mockResolvedValue(null);
      vi.spyOn(transportRepository, 'createVehicle').mockResolvedValue(mockVehicle);

      const vehicle = await transportService.createVehicle(
        {
          vendorId,
          model: 'Innova Crysta',
          category: 'SUV',
          registrationNumber: 'JK01AB1234',
          seatingCapacity: 6,
        },
        adminActor
      );
      expect(vehicle.registrationNumber).toBe('JK01AB1234');
      expect(vehicle.category).toBe('SUV');

      // Driver
      const mockDriver = new DriverModel({
        _id: new mongoose.Types.ObjectId(),
        vendorId: new mongoose.Types.ObjectId(vendorId),
        fullName: 'Ghulam Nabi',
        mobile: '9419056789',
        licenseNumber: 'JK0120150009999',
        status: 'ACTIVE',
      });
      vi.spyOn(transportRepository, 'findDriverByLicense').mockResolvedValue(null);
      vi.spyOn(transportRepository, 'createDriver').mockResolvedValue(mockDriver);

      const driver = await transportService.createDriver(
        {
          vendorId,
          fullName: 'Ghulam Nabi',
          mobile: '9419056789',
          licenseNumber: 'JK0120150009999',
        },
        adminActor
      );
      expect(driver.fullName).toBe('Ghulam Nabi');
      expect(driver.licenseNumber).toBe('JK0120150009999');

      // Tariff
      vi.spyOn(destinationRepository, 'findById').mockResolvedValue(
        new DestinationModel({ _id: destId, name: 'Kashmir', region: 'NORTH' })
      );

      const mockTariff = new TransportTariffModel({
        _id: new mongoose.Types.ObjectId(),
        destinationId: new mongoose.Types.ObjectId(destId),
        vehicleCategory: 'SUV',
        seasonType: 'PEAK',
        tariffBasis: 'PER_DAY',
        baseSupplierCost: 3200,
        driverDailyAllowanceCost: 400,
        standardSellingRate: 4500,
        includedKmPerDay: 150,
        extraKmRate: 18,
        isTollParkingIncluded: false,
        isActive: true,
      });
      vi.spyOn(transportRepository, 'createTariff').mockResolvedValue(mockTariff);

      const tariff = await transportService.createTariff(
        {
          destinationId: destId,
          vehicleCategory: 'SUV',
          seasonType: 'PEAK',
          tariffBasis: 'PER_DAY',
          baseSupplierCost: 3200,
          driverDailyAllowanceCost: 400,
          standardSellingRate: 4500,
          includedKmPerDay: 150,
          extraKmRate: 18,
        },
        adminActor
      );

      expect(tariff.tariffBasis).toBe('PER_DAY');
      expect(tariff.standardSellingRate).toBe(4500);
      expect(tariff.baseSupplierCost).toBe(3200);
      expect(tariff.isTollParkingIncluded).toBe(false);
    });

    it('masks transport baseSupplierCost and vendor settlement terms for non-admin callers', async () => {
      const mockVendor = new VehicleVendorModel({
        _id: new mongoose.Types.ObjectId(),
        businessName: 'Secret Transport Co',
        contactPerson: 'Manager',
        phone: '9876543210',
        settlementTerms: 'Confidential 40% margin contract',
        isActive: true,
      });
      vi.spyOn(transportRepository, 'findVendorById').mockResolvedValue(mockVendor);

      const agentVendor = await transportService.getVendorById(mockVendor._id.toString(), 'AGENT');
      expect(agentVendor.settlementTerms).toBeUndefined();

      const mockTariff = new TransportTariffModel({
        _id: new mongoose.Types.ObjectId(),
        destinationId: new mongoose.Types.ObjectId(),
        vehicleCategory: 'SEDAN',
        tariffBasis: 'PER_KM',
        baseSupplierCost: 11,
        driverDailyAllowanceCost: 300,
        standardSellingRate: 16,
        isActive: true,
      });
      vi.spyOn(transportRepository, 'findTariffById').mockResolvedValue(mockTariff);
      vi.spyOn(destinationRepository, 'findById').mockResolvedValue(null);

      const agentTariff = await transportService.getTariffById(mockTariff._id.toString(), 'AGENT');
      expect(agentTariff.standardSellingRate).toBe(16);
      expect(agentTariff.baseSupplierCost).toBe(0);
    });
  });

  // ==========================================
  // 6. TOUR PACKAGES
  // ==========================================
  describe('6. Tour Packages Engine', () => {
    it('creates prebuilt tour package with day-wise itinerary subdocuments', async () => {
      const destId = new mongoose.Types.ObjectId().toString();
      vi.spyOn(destinationRepository, 'findById').mockResolvedValue(
        new DestinationModel({ _id: destId, name: 'Kashmir', region: 'NORTH' })
      );
      vi.spyOn(tourPackageRepository, 'findBySlug').mockResolvedValue(null);

      const mockPackage = new TourPackageModel({
        _id: new mongoose.Types.ObjectId(),
        title: 'Enchanting Kashmir Explorer',
        slug: 'enchanting-kashmir-explorer',
        destinationId: new mongoose.Types.ObjectId(destId),
        durationNights: 4,
        durationDays: 5,
        dayWiseItinerary: [
          {
            dayNumber: 1,
            title: 'Arrival in Srinagar & Shikara Ride',
            description: 'Arrive at Srinagar Airport and check in to houseboat on Dal Lake.',
            nightStayDestination: 'Srinagar Houseboat',
            mealsIncluded: ['Dinner'],
            activities: ['Shikara ride at sunset'],
          },
          {
            dayNumber: 2,
            title: 'Srinagar to Gulmarg Excursion',
            description: 'Full day sightseeing in Gulmarg with Gondola cable car ride.',
            nightStayDestination: 'Gulmarg',
            mealsIncluded: ['Breakfast', 'Dinner'],
            activities: ['Phase 1 & Phase 2 Gondola'],
          },
        ],
        inclusions: ['4 Nights accommodation', 'Daily breakfast & dinner', 'AC Sedan for transfers'],
        exclusions: ['Airfare', 'Personal expenses', 'Gondola tickets'],
        defaultMealPlan: 'MAP',
        defaultVehicleCategory: 'SEDAN',
        startingPrice: 24999,
        isPublished: true,
      });

      vi.spyOn(tourPackageRepository, 'create').mockResolvedValue(mockPackage);

      const result = await tourPackageService.createPackage(
        {
          title: 'Enchanting Kashmir Explorer',
          destinationId: destId,
          durationNights: 4,
          durationDays: 5,
          dayWiseItinerary: mockPackage.dayWiseItinerary,
          inclusions: ['4 Nights accommodation', 'Daily breakfast & dinner', 'AC Sedan for transfers'],
          exclusions: ['Airfare', 'Personal expenses', 'Gondola tickets'],
          defaultMealPlan: 'MAP',
          defaultVehicleCategory: 'SEDAN',
          startingPrice: 24999,
        },
        adminActor
      );

      expect(result.title).toBe('Enchanting Kashmir Explorer');
      expect(result.slug).toBe('enchanting-kashmir-explorer');
      expect(result.durationNights).toBe(4);
      expect(result.durationDays).toBe(5);
      expect(result.dayWiseItinerary).toHaveLength(2);
      expect(result.dayWiseItinerary[0]?.nightStayDestination).toBe('Srinagar Houseboat');
      expect(result.defaultMealPlan).toBe('MAP');
    });
  });

  // ==========================================
  // 7. DYNAMIC TAX CONFIGURATION
  // ==========================================
  describe('7. Dynamic Tax Configuration Engine', () => {
    it('creates admin-managed tax rule and marks default', async () => {
      vi.spyOn(taxConfigRepository, 'findByName').mockResolvedValue(null);

      const mockTax = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Standard Indian Travel GST',
        taxType: 'GST',
        ratePercent: 5,
        isApplicable: true,
        jurisdiction: 'IN',
        isDefault: true,
        toDto: () => ({
          id: 'tax_1',
          name: 'Standard Indian Travel GST',
          taxType: 'GST',
          ratePercent: 5,
          isApplicable: true,
          jurisdiction: 'IN',
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      };

      vi.spyOn(taxConfigRepository, 'create').mockResolvedValue(mockTax as any);

      const result = await taxConfigService.createTaxRule(
        {
          name: 'Standard Indian Travel GST',
          ratePercent: 5,
          isApplicable: true,
          isDefault: true,
        },
        adminActor
      );

      expect(result.name).toBe('Standard Indian Travel GST');
      expect(result.ratePercent).toBe(5);
      expect(result.isDefault).toBe(true);
    });

    it('supports custom dynamic tax rates beyond fixed 5% (e.g. 18% hotel luxury GST, 0% SEZ/exempt)', async () => {
      vi.spyOn(taxConfigRepository, 'findByName').mockResolvedValue(null);

      const mockTax = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Luxury Hotel Room GST (Above 7500 INR)',
        taxType: 'GST',
        ratePercent: 18,
        isApplicable: true,
        jurisdiction: 'IN',
        isDefault: false,
        toDto: () => ({
          id: 'tax_2',
          name: 'Luxury Hotel Room GST (Above 7500 INR)',
          taxType: 'GST',
          ratePercent: 18,
          isApplicable: true,
          jurisdiction: 'IN',
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      };

      vi.spyOn(taxConfigRepository, 'create').mockResolvedValue(mockTax as any);

      const result = await taxConfigService.createTaxRule(
        {
          name: 'Luxury Hotel Room GST (Above 7500 INR)',
          ratePercent: 18,
          isApplicable: true,
          isDefault: false,
        },
        adminActor
      );

      expect(result.ratePercent).toBe(18);
    });
  });
});
