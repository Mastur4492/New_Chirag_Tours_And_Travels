import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BookingModel } from '../src/models/booking.model';
import { CustomerModel } from '../src/models/customer.model';
import { DestinationModel } from '../src/models/destination.model';
import { DriverModel } from '../src/models/driver.model';
import { HotelModel } from '../src/models/hotel.model';
import { HotelReservationModel } from '../src/models/hotelReservation.model';
import { LeadModel } from '../src/models/lead.model';
import { QuotationModel } from '../src/models/quotation.model';
import { RoomCategoryModel } from '../src/models/roomCategory.model';
import { SeasonModel } from '../src/models/season.model';
import { SeasonalRateCardModel } from '../src/models/seasonalRateCard.model';
import { TransportAssignmentModel } from '../src/models/transportAssignment.model';
import { TransportScheduleLockModel } from '../src/models/transportScheduleLock.model';
import { UserModel } from '../src/models/user.model';
import { VehicleModel } from '../src/models/vehicle.model';
import { VehicleVendorModel } from '../src/models/vehicleVendor.model';
import { destinationService } from '../src/services/destination.service';
import { hotelService } from '../src/services/hotel.service';
import { operationsService } from '../src/services/operations.service';
import { seasonService } from '../src/services/season.service';
import { transportService } from '../src/services/transport.service';
import { AppError } from '../src/utils/appError';

const testDbName = `chirag_test_m2_live_${Date.now()}`;
const testMongoUri = `mongodb://localhost:27017/${testDbName}`;

describe('Milestone 2: Master Data Concurrency, Referential Integrity & Live MongoDB Safety', () => {
  let adminUser: any;
  let destination: any;
  let vendor: any;
  let vehicle: any;
  let driver: any;
  let hotel: any;
  let roomCategory: any;
  let season: any;
  let customer: any;

  const adminActor = {
    userId: '',
    role: 'ADMIN' as const,
    ipAddress: '127.0.0.1',
    userAgent: 'LiveTestRunner/1.0',
  };

  beforeAll(async () => {
    await mongoose.connect(testMongoUri);

    await Promise.all([
      DestinationModel.syncIndexes(),
      HotelModel.syncIndexes(),
      RoomCategoryModel.syncIndexes(),
      SeasonModel.syncIndexes(),
      SeasonalRateCardModel.syncIndexes(),
      VehicleVendorModel.syncIndexes(),
      VehicleModel.syncIndexes(),
      DriverModel.syncIndexes(),
      TransportScheduleLockModel.syncIndexes(),
      TransportAssignmentModel.syncIndexes(),
      BookingModel.syncIndexes(),
    ]);

    adminUser = await UserModel.create({
      fullName: 'Master Data Admin',
      email: `m2_admin_${Date.now()}@chirag.test`,
      mobile: `+9199080${Math.floor(10000 + Math.random() * 90000)}`,
      passwordHash: 'hash',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminActor.userId = adminUser._id.toString();

    destination = await DestinationModel.create({
      name: `Kashmir Valley ${Date.now()}`,
      slug: `kashmir-valley-${Date.now()}`,
      region: 'NORTH',
      state: 'Jammu & Kashmir',
      country: 'India',
      isActive: true,
    });

    vendor = await VehicleVendorModel.create({
      businessName: 'Himalayan Fleet Services',
      contactPerson: 'Zahoor Lone',
      phone: '+919419088888',
      settlementTerms: 'Net 15 days',
      isActive: true,
    });

    vehicle = await VehicleModel.create({
      vendorId: vendor._id,
      model: 'Toyota Innova Crysta',
      category: 'SUV',
      registrationNumber: `JK01M${Math.floor(1000 + Math.random() * 9000)}`,
      seatingCapacity: 6,
      hasAC: true,
      status: 'AVAILABLE',
    });

    driver = await DriverModel.create({
      vendorId: vendor._id,
      fullName: 'Aijaz Rather',
      mobile: `+9194190${Math.floor(10000 + Math.random() * 90000)}`,
      licenseNumber: `DL-JK01-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'ACTIVE',
    });

    hotel = await HotelModel.create({
      name: 'Gulmarg Heights Resort',
      destinationId: destination._id,
      starRating: 4,
      propertyType: 'RESORT',
      address: 'Main Circular Road, Gulmarg',
      city: 'Gulmarg',
      contactPhone: '+911954254400',
      isActive: true,
    });

    roomCategory = await RoomCategoryModel.create({
      hotelId: hotel._id,
      name: 'Premier Snow View',
      baseOccupancy: 2,
      maxAdults: 3,
      maxChildren: 1,
      extraBedSupported: true,
      maxExtraBeds: 1,
      allowedMealPlans: ['CP', 'MAP'],
      isActive: true,
    });

    season = await SeasonModel.create({
      name: 'Winter Ski Peak 2026',
      seasonType: 'PEAK',
      destinationId: destination._id,
      startDate: new Date('2026-12-01'),
      endDate: new Date('2026-12-31'),
      priority: 20,
    });

    customer = await CustomerModel.create({
      fullName: 'Vipul Joshi',
      mobile: `+9198200${Math.floor(10000 + Math.random() * 90000)}`,
      email: 'vipul@example.com',
      source: 'ADMIN_DIRECT',
      createdBy: adminUser._id,
    });
  });

  afterAll(async () => {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
  });

  describe('1. Transport Schedule Lock Integrity & Master Status Mutations', () => {
    it('blocks vehicle status change to MAINTENANCE or INACTIVE when an active schedule lock exists', async () => {
      // Create an active assignment lock for the vehicle
      const lock = await TransportScheduleLockModel.create({
        resourceType: 'VEHICLE',
        resourceId: vehicle._id,
        assignmentId: new mongoose.Types.ObjectId(),
        bookingId: new mongoose.Types.ObjectId(),
        bookingNumber: 'NCT-BK-2026-88888',
        reservationIntentId: 'intent-veh-lock-1',
        dateStr: '2026-12-10',
        slotType: 'FULL_DAY',
      });

      // Attempt to change vehicle to MAINTENANCE
      await expect(
        transportService.updateVehicle(
          vehicle._id.toString(),
          { status: 'MAINTENANCE' },
          adminActor
        )
      ).rejects.toThrow(/Cannot set vehicle to MAINTENANCE: vehicle has 1 active schedule lock/);

      // Attempt to change vehicle to INACTIVE
      await expect(
        transportService.updateVehicle(
          vehicle._id.toString(),
          { status: 'INACTIVE' },
          adminActor
        )
      ).rejects.toThrow(/Cannot set vehicle to INACTIVE: vehicle has 1 active schedule lock/);

      // Verify the vehicle in DB remained AVAILABLE
      const freshVehicle = await VehicleModel.findById(vehicle._id);
      expect(freshVehicle?.status).toBe('AVAILABLE');

      // Verify the lock was NOT damaged or released by the rejected mutation
      const freshLock = await TransportScheduleLockModel.findById(lock._id);
      expect(freshLock).not.toBeNull();

      // Clean up lock
      await TransportScheduleLockModel.deleteOne({ _id: lock._id });
    });

    it('blocks driver status change to OFF_DUTY or BLACKLISTED when an active schedule lock exists', async () => {
      const lock = await TransportScheduleLockModel.create({
        resourceType: 'DRIVER',
        resourceId: driver._id,
        assignmentId: new mongoose.Types.ObjectId(),
        bookingId: new mongoose.Types.ObjectId(),
        bookingNumber: 'NCT-BK-2026-88888',
        reservationIntentId: 'intent-driver-lock-1',
        dateStr: '2026-12-10',
        slotType: 'FULL_DAY',
      });

      // Attempt to set driver OFF_DUTY
      await expect(
        transportService.updateDriver(
          driver._id.toString(),
          { status: 'OFF_DUTY' },
          adminActor
        )
      ).rejects.toThrow(/Cannot set driver to OFF_DUTY: driver has 1 active schedule lock/);

      // Attempt to set driver BLACKLISTED
      await expect(
        transportService.updateDriver(
          driver._id.toString(),
          { status: 'BLACKLISTED' },
          adminActor
        )
      ).rejects.toThrow(/Cannot set driver to BLACKLISTED: driver has 1 active schedule lock/);

      // Verify the driver in DB remained ACTIVE
      const freshDriver = await DriverModel.findById(driver._id);
      expect(freshDriver?.status).toBe('ACTIVE');

      // Verify lock remains intact
      const freshLock = await TransportScheduleLockModel.findById(lock._id);
      expect(freshLock).not.toBeNull();

      await TransportScheduleLockModel.deleteOne({ _id: lock._id });
    });

    it('blocks vendor deactivation when vehicles or drivers of that vendor hold active schedule locks', async () => {
      const lock = await TransportScheduleLockModel.create({
        resourceType: 'VEHICLE',
        resourceId: vehicle._id,
        assignmentId: new mongoose.Types.ObjectId(),
        bookingId: new mongoose.Types.ObjectId(),
        bookingNumber: 'NCT-BK-2026-88888',
        reservationIntentId: 'intent-vendor-lock-1',
        dateStr: '2026-12-15',
        slotType: 'FULL_DAY',
      });

      // Attempt to deactivate vendor
      await expect(
        transportService.updateVendor(
          vendor._id.toString(),
          { isActive: false },
          adminActor
        )
      ).rejects.toThrow(/Cannot deactivate vendor.*vendor has 1 active vehicle\/driver schedule lock/);

      // Verify vendor remained active
      const freshVendor = await VehicleVendorModel.findById(vendor._id);
      expect(freshVendor?.isActive).toBe(true);

      // Release lock
      await TransportScheduleLockModel.deleteOne({ _id: lock._id });

      // After lock is released, vendor CAN be deactivated safely
      const updatedVendor = await transportService.updateVendor(
        vendor._id.toString(),
        { isActive: false },
        adminActor
      );
      expect(updatedVendor.isActive).toBe(false);

      // Re-activate vendor for subsequent tests
      await transportService.updateVendor(
        vendor._id.toString(),
        { isActive: true },
        adminActor
      );
    });

    it('allows vehicle and driver status changes once all active locks are released', async () => {
      // With 0 active locks, status change succeeds
      const updatedVehicle = await transportService.updateVehicle(
        vehicle._id.toString(),
        { status: 'MAINTENANCE' },
        adminActor
      );
      expect(updatedVehicle.status).toBe('MAINTENANCE');

      // Restore to AVAILABLE
      await transportService.updateVehicle(
        vehicle._id.toString(),
        { status: 'AVAILABLE' },
        adminActor
      );

      const updatedDriver = await transportService.updateDriver(
        driver._id.toString(),
        { status: 'OFF_DUTY' },
        adminActor
      );
      expect(updatedDriver.status).toBe('OFF_DUTY');

      // Restore to ACTIVE
      await transportService.updateDriver(
        driver._id.toString(),
        { status: 'ACTIVE' },
        adminActor
      );
    });
  });

  describe('2. Seasonal Rate Card Referential Integrity', () => {
    it('blocks deletion of a season when seasonal rate cards are linked, and allows deletion after removal', async () => {
      // Create a seasonal rate card linked to the season
      const rateCard = await SeasonalRateCardModel.create({
        hotelId: hotel._id,
        roomCategoryId: roomCategory._id,
        seasonId: season._id,
        mealPlan: 'CP',
        baseCostPerNight: 5500,
        standardSellingPrice: 7500,
        validFrom: new Date('2026-12-01'),
        validTo: new Date('2026-12-31'),
        isActive: true,
      });

      // Attempt to delete season
      await expect(
        seasonService.deleteSeason(season._id.toString(), adminActor)
      ).rejects.toThrow(/Cannot delete season.*1 seasonal rate card\(s\) are linked to this season/);

      // Verify season still exists
      const freshSeason = await SeasonModel.findById(season._id);
      expect(freshSeason).not.toBeNull();

      // Delete the linked rate card
      await SeasonalRateCardModel.deleteOne({ _id: rateCard._id });

      // Now season deletion succeeds
      await seasonService.deleteSeason(season._id.toString(), adminActor);
      const deletedSeason = await SeasonModel.findById(season._id);
      expect(deletedSeason).toBeNull();
    });
  });

  describe('3. Unique Constraint & Conflict Handling', () => {
    it('rejects duplicate room category names within the same hotel with 409 Conflict', async () => {
      await expect(
        hotelService.createRoomCategory(
          {
            hotelId: hotel._id.toString(),
            name: 'Premier Snow View', // already exists in beforeAll
          },
          adminActor
        )
      ).rejects.toThrow(/already exists for hotel/);
    });

    it('rejects duplicate destination names and slugs with 409 Conflict', async () => {
      await expect(
        destinationService.createDestination(
          {
            name: destination.name,
            region: 'NORTH',
            country: 'India',
          },
          adminActor
        )
      ).rejects.toThrow(/already exists/);
    });
  });

  describe('4. Historical Snapshot Preservation', () => {
    it('preserves immutable financial and quotation snapshots when master rate cards are modified', async () => {
      // Create a quote with fixed pricing
      const quotation = await QuotationModel.create({
        quoteNumber: `NCT-QT-TEST-${Date.now()}`,
        leadId: new mongoose.Types.ObjectId(),
        customerId: customer._id,
        assignedAgentId: adminUser._id,
        destinationId: destination._id,
        currentVersion: 1,
        status: 'ACCEPTED',
        travelStartDate: new Date('2026-12-10'),
        travelEndDate: new Date('2026-12-12'),
        durationNights: 2,
        durationDays: 3,
        numberOfAdults: 2,
        numberOfChildren: 0,
        numberOfInfants: 0,
        validUntil: new Date(Date.now() + 86400000 * 30),
        createdBy: adminUser._id,
        hotels: [
          {
            hotelId: hotel._id,
            roomCategoryId: roomCategory._id,
            checkInDate: new Date('2026-12-10'),
            checkOutDate: new Date('2026-12-12'),
            numberOfNights: 2,
            numberOfRooms: 1,
            adultsCount: 2,
            childrenWithBedCount: 0,
            childrenWithoutBedCount: 0,
            mealPlan: 'CP',
            supplierCost: 11000,
            calculatedPrice: 15000,
          },
        ],
        pricingSummary: {
          totalBaseSupplierCost: 11000,
          totalMarkupAmount: 4000,
          markupPercent: 36.36,
          discountAmount: 0,
          discountPercent: 0,
          taxableAmount: 15000,
          taxRatePercent: 5,
          taxAmount: 750,
          isTaxApplicable: true,
          finalSellingPrice: 15750,
          projectedGrossProfit: 4000,
        },
        inclusions: ['Breakfast'],
        exclusions: ['Airfare'],
        terms: ['Standard'],
      });

      // Create a booking with immutable snapshot
      const booking = await BookingModel.create({
        bookingNumber: `NCT-BK-TEST-${Date.now()}`,
        quotationId: quotation._id,
        quotationVersionUsed: 1,
        leadId: quotation.leadId,
        customerId: customer._id,
        assignedAgentId: adminUser._id,
        destinationId: destination._id,
        travelStartDate: quotation.travelStartDate,
        travelEndDate: quotation.travelEndDate,
        durationNights: 2,
        durationDays: 3,
        numberOfAdults: 2,
        numberOfChildren: 0,
        numberOfInfants: 0,
        status: 'CONFIRMED',
        financials: {
          totalAmount: 15750,
          totalAmountInPaise: 1575000,
          currency: 'INR',
          advanceRequired: 5000,
          advanceRequiredInPaise: 500000,
          totalPaid: 5000,
          totalPaidInPaise: 500000,
          balancePending: 10750,
          balancePendingInPaise: 1075000,
          supplierCostTotal: 11000,
          supplierCostTotalInPaise: 1100000,
          realizedGrossProfit: 4000,
        },
        itinerarySnapshot: {
          hotels: [
            {
              hotelId: hotel._id,
              hotelName: hotel.name,
              roomCategoryName: roomCategory.name,
              calculatedPrice: 15000,
            },
          ],
        },
        hotelVoucherGenerated: false,
        driverDutySlipGenerated: false,
      });

      // Create and update a master rate card
      const rc = await SeasonalRateCardModel.create({
        hotelId: hotel._id,
        roomCategoryId: roomCategory._id,
        seasonId: new mongoose.Types.ObjectId(),
        mealPlan: 'CP',
        baseCostPerNight: 9999, // drastically changed
        standardSellingPrice: 19999,
        validFrom: new Date('2026-12-01'),
        validTo: new Date('2026-12-31'),
        isActive: true,
      });

      // Update rate card
      await hotelService.updateSeasonalRateCard(
        rc._id.toString(),
        { standardSellingPrice: 25000 },
        adminActor
      );

      // Verify quotation snapshot is 100% unchanged
      const preservedQuote = await QuotationModel.findById(quotation._id);
      expect(preservedQuote?.hotels[0].calculatedPrice).toBe(15000);
      expect(preservedQuote?.hotels[0].supplierCost).toBe(11000);
      expect(preservedQuote?.pricingSummary.finalSellingPrice).toBe(15750);

      // Verify booking financials and itinerarySnapshot are 100% unchanged
      const preservedBooking = await BookingModel.findById(booking._id);
      expect(preservedBooking?.financials.totalAmount).toBe(15750);
      expect(preservedBooking?.financials.totalAmountInPaise).toBe(1575000);
      expect(preservedBooking?.financials.supplierCostTotal).toBe(11000);
      expect(preservedBooking?.itinerarySnapshot?.hotels?.[0].calculatedPrice).toBe(15000);

      await SeasonalRateCardModel.deleteOne({ _id: rc._id });
      await QuotationModel.deleteOne({ _id: quotation._id });
      await BookingModel.deleteOne({ _id: booking._id });
    });
  });
});
