import crypto from 'crypto';
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
import { TransportAssignmentModel } from '../src/models/transportAssignment.model';
import { TransportScheduleLockModel } from '../src/models/transportScheduleLock.model';
import { UserModel } from '../src/models/user.model';
import { VehicleModel } from '../src/models/vehicle.model';
import { VehicleVendorModel } from '../src/models/vehicleVendor.model';
import { bookingService } from '../src/services/booking.service';
import { operationsService } from '../src/services/operations.service';
import { transportScheduleLockRepository } from '../src/repositories/transportScheduleLock.repository';
import { AppError } from '../src/utils/appError';

const testDbName = `chirag_test_ops_${Date.now()}`;
const testMongoUri = `mongodb://localhost:27017/${testDbName}`;

describe('Stage 5B Part 1: Operations Engine & Schedule Lock Safety', () => {
  let adminUser: any;
  let agentUser: any;
  let otherAgentUser: any;
  let destination: any;
  let vendor: any;
  let vehicle1: any;
  let vehicle2: any;
  let driver1: any;
  let driver2: any;
  let hotel: any;
  let roomCategory: any;
  let customer: any;

  beforeAll(async () => {
    // Connect to isolated live test database
    await mongoose.connect(testMongoUri);

    // Sync all model indexes
    await Promise.all([
      TransportScheduleLockModel.syncIndexes(),
      HotelReservationModel.syncIndexes(),
      TransportAssignmentModel.syncIndexes(),
      BookingModel.syncIndexes(),
      VehicleModel.syncIndexes(),
      DriverModel.syncIndexes(),
    ]);

    // Create shared master fixtures
    adminUser = await UserModel.create({
      fullName: 'Operations Admin',
      email: `admin_${Date.now()}@chirag.test`,
      mobile: `+9199060${Math.floor(10000 + Math.random() * 90000)}`,
      passwordHash: 'hash',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    agentUser = await UserModel.create({
      fullName: 'Agent Chirag',
      email: `agent_${Date.now()}@chirag.test`,
      mobile: `+9199061${Math.floor(10000 + Math.random() * 90000)}`,
      passwordHash: 'hash',
      role: 'AGENT',
      status: 'ACTIVE',
    });

    otherAgentUser = await UserModel.create({
      fullName: 'Other Agent',
      email: `other_agent_${Date.now()}@chirag.test`,
      mobile: `+9199062${Math.floor(10000 + Math.random() * 90000)}`,
      passwordHash: 'hash',
      role: 'AGENT',
      status: 'ACTIVE',
    });

    destination = await DestinationModel.create({
      name: `Kashmir Valley ${Date.now()}`,
      slug: `kashmir-valley-${Date.now()}`,
      region: 'NORTH',
      state: 'Jammu & Kashmir',
      country: 'India',
      isActive: true,
    });

    vendor = await VehicleVendorModel.create({
      businessName: 'Royal Kashmir Cabs',
      contactPerson: 'Farooq Ahmad',
      phone: '+919419011111',
      isActive: true,
    });

    vehicle1 = await VehicleModel.create({
      vendorId: vendor._id,
      model: 'Toyota Innova Crysta',
      category: 'SUV',
      registrationNumber: `JK01AB${Math.floor(1000 + Math.random() * 9000)}`,
      seatingCapacity: 6,
      hasAC: true,
      insuranceExpiry: new Date(Date.now() + 86400000 * 365),
      status: 'AVAILABLE',
    });

    vehicle2 = await VehicleModel.create({
      vendorId: vendor._id,
      model: 'Mahindra Scorpio',
      category: 'SUV',
      registrationNumber: `JK01CD${Math.floor(1000 + Math.random() * 9000)}`,
      seatingCapacity: 6,
      hasAC: true,
      insuranceExpiry: new Date(Date.now() + 86400000 * 365),
      status: 'AVAILABLE',
    });

    driver1 = await DriverModel.create({
      vendorId: vendor._id,
      fullName: 'Bashir Dar',
      mobile: `+9194190${Math.floor(10000 + Math.random() * 90000)}`,
      licenseNumber: `DL-JK01-${Math.floor(100000 + Math.random() * 900000)}`,
      licenseExpiry: new Date(Date.now() + 86400000 * 365),
      status: 'ACTIVE',
    });

    driver2 = await DriverModel.create({
      vendorId: vendor._id,
      fullName: 'Ghulam Nabi',
      mobile: `+9194190${Math.floor(10000 + Math.random() * 90000)}`,
      licenseNumber: `DL-JK01-${Math.floor(100000 + Math.random() * 900000)}`,
      licenseExpiry: new Date(Date.now() + 86400000 * 365),
      status: 'ACTIVE',
    });

    hotel = await HotelModel.create({
      name: 'Pahalgam Pine Resort',
      destinationId: destination._id,
      starRating: 4,
      propertyType: 'RESORT',
      address: 'Near Lidder River, Pahalgam',
      city: 'Pahalgam',
      contactPhone: '+911936243200',
      isActive: true,
    });

    roomCategory = await RoomCategoryModel.create({
      hotelId: hotel._id,
      name: 'Deluxe Pine View',
      baseOccupancy: 2,
      maxAdults: 3,
      maxChildren: 1,
      extraBedSupported: true,
      maxExtraBeds: 1,
      allowedMealPlans: ['CP', 'MAP'],
      isActive: true,
    });

    customer = await CustomerModel.create({
      fullName: 'Rajesh Sharma',
      mobile: `+9198110${Math.floor(10000 + Math.random() * 90000)}`,
      email: 'rajesh@example.com',
      source: 'ADMIN_DIRECT',
      createdBy: adminUser._id,
    });
  });

  beforeEach(async () => {
    await Promise.all([
      TransportScheduleLockModel.deleteMany({}),
      TransportAssignmentModel.deleteMany({}),
      HotelReservationModel.deleteMany({}),
      BookingModel.deleteMany({}),
      LeadModel.deleteMany({}),
      QuotationModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    // Drop test database and disconnect
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
  });

  async function createTestBooking(overrides: Record<string, any> = {}) {
    const bookingNumber = `NCT-BK-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const travelStart = new Date('2026-11-01T00:00:00.000Z');
    const travelEnd = new Date('2026-11-03T00:00:00.000Z');

    const lead = await LeadModel.create({
      leadNumber: `NCT-LD-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      customerId: customer._id,
      destinationId: destination._id,
      source: 'ADMIN_DIRECT',
      status: 'CONVERTED',
      numberOfAdults: 2,
      numberOfChildren: 0,
      createdBy: adminUser._id,
      assignedAgentId: overrides.assignedAgentId || agentUser._id,
    });

    const quotation = await QuotationModel.create({
      quoteNumber: `NCT-QT-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      leadId: lead._id,
      customerId: customer._id,
      assignedAgentId: overrides.assignedAgentId || agentUser._id,
      destinationId: destination._id,
      currentVersion: 1,
      status: 'ACCEPTED',
      travelStartDate: travelStart,
      travelEndDate: travelEnd,
      validUntil: new Date(Date.now() + 86400000 * 30),
      createdBy: adminUser._id,
      durationNights: 2,
      durationDays: 3,
      numberOfAdults: 2,
      numberOfChildren: 0,
      numberOfInfants: 0,
      pricingSummary: {
        totalBaseSupplierCost: 20000,
        totalMarkupAmount: 4000,
        markupPercent: 20,
        discountAmount: 0,
        discountPercent: 0,
        taxableAmount: 24000,
        taxRatePercent: 5,
        taxAmount: 1200,
        isTaxApplicable: true,
        finalSellingPrice: 25200,
        projectedGrossProfit: 4000,
      },
    });

    const booking = await BookingModel.create({
      bookingNumber,
      quotationId: quotation._id,
      quotationVersionUsed: 1,
      leadId: lead._id,
      customerId: customer._id,
      assignedAgentId: overrides.assignedAgentId || agentUser._id,
      destinationId: destination._id,
      travelStartDate: travelStart,
      travelEndDate: travelEnd,
      durationNights: 2,
      durationDays: 3,
      numberOfAdults: 2,
      numberOfChildren: 0,
      numberOfInfants: 0,
      status: overrides.status || 'CONFIRMED',
      financials: {
        totalAmount: 25200,
        totalAmountInPaise: 2520000,
        currency: 'INR',
        advanceRequired: 10000,
        advanceRequiredInPaise: 1000000,
        totalPaid: 25200,
        totalPaidInPaise: 2520000,
        balancePending: 0,
        balancePendingInPaise: 0,
        supplierCostTotal: 20000,
        supplierCostTotalInPaise: 2000000,
      },
      itinerarySnapshot: {
        hotels: [
          {
            hotelId: hotel._id,
            roomCategoryId: roomCategory._id,
            numberOfRooms: 1,
            mealPlan: 'MAP',
            checkInDate: travelStart,
            checkOutDate: travelEnd,
            numberOfNights: 2,
            adultsCount: 2,
            supplierCost: 12000,
          },
        ],
        transports: [
          {
            vehicleId: vehicle1._id,
            vehicleCategory: 'SUV',
            startDate: travelStart,
            endDate: travelEnd,
            supplierCost: 8000,
          },
        ],
        inclusions: ['Breakfast & Dinner', 'Private Cab for Sightseeing'],
        terms: ['Non-refundable 7 days prior to travel'],
      },
      ...overrides,
    });

    return booking;
  }

  // =========================================================================
  // 1. LIVE MONGODB: ATOMIC LOCK ACQUISITION & CONCURRENT COMPETING ASSIGNMENTS
  // =========================================================================
  describe('Live MongoDB: Atomic Resource Locking & Concurrency', () => {
    it('prevents two assignments from reserving the same vehicle on the same dates (competing assignments)', async () => {
      const bookingA = await createTestBooking();
      const bookingB = await createTestBooking();

      const summaryA = await operationsService.initializeBookingOperations(bookingA._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const summaryB = await operationsService.initializeBookingOperations(bookingB._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });

      const assignAId = summaryA.transportAssignments[0].id;
      const assignBId = summaryB.transportAssignments[0].id;

      // Both attempt to reserve vehicle1 and driver1 concurrently
      const results = await Promise.allSettled([
        operationsService.assignVehicleAndDriver(
          assignAId,
          { vehicleId: vehicle1._id.toString(), driverId: driver1._id.toString() },
          { userId: adminUser._id.toString(), role: 'ADMIN' }
        ),
        operationsService.assignVehicleAndDriver(
          assignBId,
          { vehicleId: vehicle1._id.toString(), driverId: driver1._id.toString() },
          { userId: adminUser._id.toString(), role: 'ADMIN' }
        ),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // The rejected one must be a 409 conflict
      const rejectedError = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejectedError).toBeInstanceOf(AppError);
      expect(rejectedError.statusCode).toBe(409);
      expect(rejectedError.message).toMatch(/Resource conflict/);

      // Verify MongoDB contains exactly 1 set of locks for vehicle1 and driver1
      const vLocks = await TransportScheduleLockModel.find({
        resourceType: 'VEHICLE',
        resourceId: vehicle1._id,
      });
      expect(vLocks.length).toBe(3); // 2026-11-01, 2026-11-02, 2026-11-03

      // Verify all locks belong to the winning assignment
      const winningAssignmentId = (fulfilled[0] as PromiseFulfilledResult<any>).value.id;
      for (const l of vLocks) {
        expect(l.assignmentId.toString()).toBe(winningAssignmentId);
      }
    });

    it('recovers cleanly from an in-flight process crash leaving orphan tentative locks', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const assignId = summary.transportAssignments[0].id;

      // Simulate a process crash: an orphan tentative lock was created with intent 'crashed-intent-1'
      const orphanLock = await TransportScheduleLockModel.create({
        resourceType: 'VEHICLE',
        resourceId: vehicle2._id,
        dateStr: '2026-11-01',
        slotType: 'FULL_DAY',
        assignmentId: new mongoose.Types.ObjectId(assignId),
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        reservationIntentId: 'crashed-intent-1',
      });

      // Verify the orphan exists in DB
      expect(await TransportScheduleLockModel.findById(orphanLock._id)).not.toBeNull();

      // Now run assignment: it should purge the uncommitted orphan and acquire the fresh reservation
      const updated = await operationsService.assignVehicleAndDriver(
        assignId,
        { vehicleId: vehicle2._id.toString(), driverId: driver2._id.toString() },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      expect(updated.status).toBe('ASSIGNED');
      expect(updated.assignedVehicleId).toBe(vehicle2._id.toString());
      expect(updated.assignedDriverId).toBe(driver2._id.toString());

      // The old orphan lock with crashed intent must have been pruned
      const oldOrphan = await TransportScheduleLockModel.findOne({
        reservationIntentId: 'crashed-intent-1',
      });
      expect(oldOrphan).toBeNull();
    });
  });

  // =========================================================================
  // 2. LIVE MONGODB: SAFE REASSIGNMENT & PARTIAL ACQUISITION FAILURE ROLLBACK
  // =========================================================================
  describe('Live MongoDB: Safe Reassignment & Partial Failure Rollback', () => {
    it('preserves existing assignment and locks when reassignment fails midway due to a resource conflict', async () => {
      // 1. Booking 1 holds vehicle1 and driver1
      const booking1 = await createTestBooking();
      const summary1 = await operationsService.initializeBookingOperations(booking1._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const assign1Id = summary1.transportAssignments[0].id;

      await operationsService.assignVehicleAndDriver(
        assign1Id,
        { vehicleId: vehicle1._id.toString(), driverId: driver1._id.toString() },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      // Verify initial locks
      const initialLocks = await TransportScheduleLockModel.find({ assignmentId: assign1Id });
      expect(initialLocks.length).toBe(6); // 3 days x 2 resources

      // 2. Booking 2 holds driver2
      const booking2 = await createTestBooking();
      const summary2 = await operationsService.initializeBookingOperations(booking2._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const assign2Id = summary2.transportAssignments[0].id;

      await operationsService.assignVehicleAndDriver(
        assign2Id,
        { vehicleId: vehicle2._id.toString(), driverId: driver2._id.toString() },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      // 3. Now attempt to reassign Booking 1 to (vehicle2, driver1).
      // But vehicle2 is already held by Booking 2 on these dates!
      await expect(
        operationsService.assignVehicleAndDriver(
          assign1Id,
          { vehicleId: vehicle2._id.toString(), driverId: driver1._id.toString() },
          { userId: adminUser._id.toString(), role: 'ADMIN' }
        )
      ).rejects.toThrow(/Resource conflict/);

      // 4. CRITICAL VERIFICATION:
      // Booking 1's previous assignment (vehicle1 and driver1) MUST BE 100% PRESERVED!
      const postFailLocks = await TransportScheduleLockModel.find({ assignmentId: assign1Id });
      expect(postFailLocks.length).toBe(6);

      const postVehicleLocks = postFailLocks.filter((l) => l.resourceType === 'VEHICLE');
      for (const l of postVehicleLocks) {
        expect(l.resourceId.toString()).toBe(vehicle1._id.toString());
      }

      const postDriverLocks = postFailLocks.filter((l) => l.resourceType === 'DRIVER');
      for (const l of postDriverLocks) {
        expect(l.resourceId.toString()).toBe(driver1._id.toString());
      }

      // Verify assignment document itself was NOT modified
      const currentAssign = await TransportAssignmentModel.findById(assign1Id);
      expect(currentAssign?.assignedVehicleId?.toString()).toBe(vehicle1._id.toString());
      expect(currentAssign?.assignedDriverId?.toString()).toBe(driver1._id.toString());
    });

    it('supports same-resource retries and vehicle-only replacement without duplicate key errors', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const assignId = summary.transportAssignments[0].id;

      // 1. Initial assignment
      await operationsService.assignVehicleAndDriver(
        assignId,
        { vehicleId: vehicle1._id.toString(), driverId: driver1._id.toString() },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      // 2. Same-resource retry: Re-submitting the exact same vehicle and driver
      const retryResult = await operationsService.assignVehicleAndDriver(
        assignId,
        { vehicleId: vehicle1._id.toString(), driverId: driver1._id.toString() },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );
      expect(retryResult.status).toBe('ASSIGNED');
      expect(retryResult.assignedVehicleId).toBe(vehicle1._id.toString());
      expect(retryResult.assignedDriverId).toBe(driver1._id.toString());

      // Locks must remain 6
      const locksAfterRetry = await TransportScheduleLockModel.find({ assignmentId: assignId });
      expect(locksAfterRetry.length).toBe(6);

      // 3. Driver-only replacement (keeping vehicle1, changing to driver2)
      // First release driver2 if held
      await TransportScheduleLockModel.deleteMany({ resourceId: driver2._id });

      const reassignResult = await operationsService.assignVehicleAndDriver(
        assignId,
        { vehicleId: vehicle1._id.toString(), driverId: driver2._id.toString(), reason: 'Driver sick' },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      expect(reassignResult.assignedVehicleId).toBe(vehicle1._id.toString());
      expect(reassignResult.assignedDriverId).toBe(driver2._id.toString());

      // Verify history was preserved
      const updatedAssign = await TransportAssignmentModel.findById(assignId);
      expect(updatedAssign?.assignmentHistory.length).toBe(2);
      const lastHistory = updatedAssign?.assignmentHistory[1];
      expect(lastHistory?.reason).toBe('Driver sick');
      expect(lastHistory?.previousDriverId?.toString()).toBe(driver1._id.toString());

      // Old driver1 locks must have been deleted, new driver2 locks present
      const currentLocks = await TransportScheduleLockModel.find({ assignmentId: assignId });
      expect(currentLocks.length).toBe(6);
      const driverLocks = currentLocks.filter((l) => l.resourceType === 'DRIVER');
      for (const dl of driverLocks) {
        expect(dl.resourceId.toString()).toBe(driver2._id.toString());
      }
    });
  });

  // =========================================================================
  // 3. LIVE MONGODB: CONCURRENT CANCELLATION VS DISPATCH RACE
  // =========================================================================
  describe('Live MongoDB: Concurrency-Safe Cancellation vs Dispatch', () => {
    it('ensures cancellation and dispatch cannot result in an inconsistent state when triggered concurrently', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const assignId = summary.transportAssignments[0].id;

      // Assign vehicle & driver first so it is in ASSIGNED state
      await TransportScheduleLockModel.deleteMany({ resourceId: { $in: [vehicle1._id, driver1._id] } });
      await operationsService.assignVehicleAndDriver(
        assignId,
        { vehicleId: vehicle1._id.toString(), driverId: driver1._id.toString() },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      // Concurrent race: Cancel booking vs Dispatch transport
      const results = await Promise.allSettled([
        bookingService.updateBookingStatus(
          booking._id.toString(),
          { status: 'CANCELLED', cancellationReason: 'Customer family emergency' },
          { userId: adminUser._id.toString(), role: 'ADMIN' }
        ),
        operationsService.dispatchTransport(
          assignId,
          { dispatchNotes: 'Driver briefed and sent to airport' },
          { userId: adminUser._id.toString(), role: 'ADMIN' }
        ),
      ]);

      // Final state inspection:
      const finalBooking = await BookingModel.findById(booking._id);
      const finalAssignment = await TransportAssignmentModel.findById(assignId);
      const activeLocks = await TransportScheduleLockModel.find({ assignmentId: assignId });

      // Parent booking MUST be CANCELLED
      expect(finalBooking?.status).toBe('CANCELLED');

      // Transport assignment MUST be CANCELLED (never left dangling in DISPATCHED with active locks)
      expect(finalAssignment?.status).toBe('CANCELLED');
      expect(finalAssignment?.supplierCancellation?.status).toBe('PENDING_SUPPLIER_ACKNOWLEDGEMENT');

      // Schedule locks MUST be completely released (0 active locks)
      expect(activeLocks.length).toBe(0);
    });

    it('regression: ensures cleanup only removes locks owned by current intent and cannot delete valid locks from a replacement', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const assignId = summary.transportAssignments[0].id;

      // Manually create two sets of locks representing an old committed intent and a new concurrent replacement intent
      const intentOld = 'intent-old-111';
      const intentNew = 'intent-new-222';

      await TransportScheduleLockModel.create([
        {
          resourceType: 'VEHICLE',
          resourceId: vehicle1._id,
          dateStr: '2026-11-01',
          slotType: 'FULL_DAY',
          assignmentId: new mongoose.Types.ObjectId(assignId),
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          reservationIntentId: intentOld,
        },
        {
          resourceType: 'VEHICLE',
          resourceId: vehicle2._id,
          dateStr: '2026-11-02',
          slotType: 'FULL_DAY',
          assignmentId: new mongoose.Types.ObjectId(assignId),
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          reservationIntentId: intentNew,
        },
      ]);

      // Release locks targeting ONLY intentOld
      const deletedCount = await transportScheduleLockRepository.releaseLocksForAssignment(assignId, intentOld);
      expect(deletedCount).toBe(1);

      // Verify that intentNew lock was NOT deleted and remains valid in DB
      const survivingLocks = await TransportScheduleLockModel.find({ assignmentId: assignId });
      expect(survivingLocks.length).toBe(1);
      expect(survivingLocks[0].reservationIntentId).toBe(intentNew);
      expect(survivingLocks[0].resourceId.toString()).toBe(vehicle2._id.toString());
    });

    it('regression: ensures trip completion releases schedule locks only after COMPLETED transition succeeds', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const assignId = summary.transportAssignments[0].id;

      // 1. Trying to complete an UNASSIGNED assignment fails and does NOT touch any locks
      await expect(
        operationsService.completeTransportAssignment(assignId, { userId: adminUser._id.toString(), role: 'ADMIN' })
      ).rejects.toThrow(/Assignment is not in an active operational state/);

      // 2. Assign and dispatch
      await operationsService.assignVehicleAndDriver(
        assignId,
        { vehicleId: vehicle1._id.toString(), driverId: driver1._id.toString() },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );
      await operationsService.dispatchTransport(
        assignId,
        { dispatchNotes: 'En route' },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      // Verify active locks exist
      const activeLocksBefore = await TransportScheduleLockModel.find({ assignmentId: assignId });
      expect(activeLocksBefore.length).toBe(6);

      // 3. Complete the assignment
      const completedDto = await operationsService.completeTransportAssignment(assignId, {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      expect(completedDto.status).toBe('COMPLETED');

      // 4. Verify schedule locks were released ONLY after COMPLETED transition
      const activeLocksAfter = await TransportScheduleLockModel.find({ assignmentId: assignId });
      expect(activeLocksAfter.length).toBe(0);

      const finalAssignment = await TransportAssignmentModel.findById(assignId);
      expect(finalAssignment?.status).toBe('COMPLETED');
    });
  });

  // =========================================================================
  // 3B. LIVE MONGODB: DETERMINISTIC CONCURRENCY INVARIANTS (SCENARIOS A - H)
  // =========================================================================
  describe('Live MongoDB: Deterministic Concurrency Invariants & Competing Operations (Scenarios A through H)', () => {
    it('Scenario A: Completion races with reassignment', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const assignId = summary.transportAssignments[0].id;

      await TransportScheduleLockModel.deleteMany({ resourceId: { $in: [vehicle1._id, driver1._id, vehicle2._id, driver2._id] } });
      await operationsService.assignVehicleAndDriver(
        assignId,
        { vehicleId: vehicle1._id.toString(), driverId: driver1._id.toString() },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );
      await operationsService.dispatchTransport(
        assignId,
        { dispatchNotes: 'Departed' },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      // Concurrent race: completeTransportAssignment vs assignVehicleAndDriver
      const results = await Promise.allSettled([
        operationsService.completeTransportAssignment(assignId, { userId: adminUser._id.toString(), role: 'ADMIN' }),
        operationsService.assignVehicleAndDriver(
          assignId,
          { vehicleId: vehicle2._id.toString(), driverId: driver2._id.toString(), reason: 'Mid-trip vehicle swap' },
          { userId: adminUser._id.toString(), role: 'ADMIN' }
        ),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      const finalAssign = await TransportAssignmentModel.findById(assignId);
      if (finalAssign?.status === 'COMPLETED') {
        // Completion won: all locks must be released, vehicle2/driver2 locks must NOT exist
        const locks = await TransportScheduleLockModel.find({ assignmentId: assignId });
        expect(locks.length).toBe(0);
      } else {
        // Reassignment won: assignment must be ASSIGNED with vehicle2 and driver2
        expect(finalAssign?.status).toBe('ASSIGNED');
        expect(finalAssign?.assignedVehicleId?.toString()).toBe(vehicle2._id.toString());
        const locks = await TransportScheduleLockModel.find({ assignmentId: assignId });
        expect(locks.length).toBe(6);
      }
    });

    it('Scenario B: Completion races with cancellation', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const assignId = summary.transportAssignments[0].id;

      await TransportScheduleLockModel.deleteMany({ resourceId: { $in: [vehicle1._id, driver1._id] } });
      await operationsService.assignVehicleAndDriver(
        assignId,
        { vehicleId: vehicle1._id.toString(), driverId: driver1._id.toString() },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );
      await operationsService.dispatchTransport(
        assignId,
        { dispatchNotes: 'On trip' },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      // Concurrent race: complete transport vs cancel booking
      await Promise.allSettled([
        operationsService.completeTransportAssignment(assignId, { userId: adminUser._id.toString(), role: 'ADMIN' }),
        bookingService.updateBookingStatus(
          booking._id.toString(),
          { status: 'CANCELLED', cancellationReason: 'Client emergency' },
          { userId: adminUser._id.toString(), role: 'ADMIN' }
        ),
      ]);

      const finalBooking = await BookingModel.findById(booking._id);
      expect(finalBooking?.status).toBe('CANCELLED');

      // Crucial invariant: 0 schedule locks remain in either outcome
      const remainingLocks = await TransportScheduleLockModel.find({ assignmentId: assignId });
      expect(remainingLocks.length).toBe(0);
    });

    it('Scenario D: Reassignment reserves replacement resources while cancellation runs', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const assignId = summary.transportAssignments[0].id;

      await TransportScheduleLockModel.deleteMany({ resourceId: { $in: [vehicle1._id, driver1._id, vehicle2._id, driver2._id] } });
      await operationsService.assignVehicleAndDriver(
        assignId,
        { vehicleId: vehicle1._id.toString(), driverId: driver1._id.toString() },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      // Cancel the booking
      await bookingService.updateBookingStatus(
        booking._id.toString(),
        { status: 'CANCELLED', cancellationReason: 'Cancelled before reassign' },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      // Reassignment attempt must fail and NOT leak vehicle2/driver2 locks
      await expect(
        operationsService.assignVehicleAndDriver(
          assignId,
          { vehicleId: vehicle2._id.toString(), driverId: driver2._id.toString() },
          { userId: adminUser._id.toString(), role: 'ADMIN' }
        )
      ).rejects.toThrow(/Cannot assign resources to a cancelled transport assignment|Parent booking is cancelled/);

      const locks = await TransportScheduleLockModel.find({ assignmentId: assignId });
      expect(locks.length).toBe(0);
    });

    it('Scenario F: Recovery runs while a valid reservation intent is still being processed', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const assignId = summary.transportAssignments[0].id;

      const committedIntent = 'intent-committed-100';
      const inFlightIntent = 'intent-inflight-200';
      const crashedIntent = 'intent-crashed-300';

      // Insert locks for committed and crashed intents (non-conflicting with new reservation slots)
      await TransportScheduleLockModel.create([
        {
          resourceType: 'VEHICLE',
          resourceId: vehicle1._id,
          dateStr: '2026-11-01',
          slotType: 'FULL_DAY',
          assignmentId: new mongoose.Types.ObjectId(assignId),
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          reservationIntentId: committedIntent,
        },
        {
          resourceType: 'DRIVER',
          resourceId: driver1._id,
          dateStr: '2026-11-03',
          slotType: 'FULL_DAY',
          assignmentId: new mongoose.Types.ObjectId(assignId),
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          reservationIntentId: crashedIntent,
        },
      ]);

      // Acquire schedule locks with reservationIntentId = inFlightIntent, currentLockIntentId = committedIntent
      // Step 0 should prune ONLY crashedIntent (neither committed nor inflight)
      const res = await transportScheduleLockRepository.acquireScheduleLocks({
        assignmentId: assignId,
        bookingId: booking._id.toString(),
        bookingNumber: booking.bookingNumber,
        vehicleId: vehicle2._id.toString(),
        driverId: driver2._id.toString(),
        dates: ['2026-11-02'],
        reservationIntentId: inFlightIntent,
        currentLockIntentId: committedIntent,
      });

      expect(res.success).toBe(true);

      // The crashed intent lock MUST be deleted
      const crashedCheck = await TransportScheduleLockModel.findOne({ reservationIntentId: crashedIntent });
      expect(crashedCheck).toBeNull();

      // Clean up test locks
      await TransportScheduleLockModel.deleteMany({ assignmentId: assignId });
    });

    it('Scenario G: A stale completion request retries after a newer operation has committed', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const assignId = summary.transportAssignments[0].id;

      await TransportScheduleLockModel.deleteMany({ resourceId: { $in: [vehicle1._id, driver1._id, vehicle2._id, driver2._id] } });
      await operationsService.assignVehicleAndDriver(
        assignId,
        { vehicleId: vehicle1._id.toString(), driverId: driver1._id.toString() },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );
      const initialDoc = await TransportAssignmentModel.findById(assignId);
      const staleIntentId = initialDoc?.activeLockIntentId;
      expect(staleIntentId).toBeDefined();

      // Newer reassignment happens and commits
      const reassigned = await operationsService.assignVehicleAndDriver(
        assignId,
        { vehicleId: vehicle2._id.toString(), driverId: driver2._id.toString(), reason: 'Upgrade to vehicle2' },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );
      const reassignedDoc = await TransportAssignmentModel.findById(assignId);
      expect(reassignedDoc?.activeLockIntentId).not.toBe(staleIntentId);

      await operationsService.dispatchTransport(
        assignId,
        { dispatchNotes: 'Dispatched vehicle2' },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      // Stale completion request arrives expecting staleIntentId
      await expect(
        operationsService.completeTransportAssignment(
          assignId,
          { userId: adminUser._id.toString(), role: 'ADMIN' },
          staleIntentId
        )
      ).rejects.toThrow(/lock intent has changed/);

      // The active locks for the newer assignment (vehicle2 and driver2) MUST REMAIN INTACT!
      const activeLocks = await TransportScheduleLockModel.find({ assignmentId: assignId });
      expect(activeLocks.length).toBe(6);
      expect(activeLocks[0].reservationIntentId).toBe(reassignedDoc?.activeLockIntentId);
    });

    it('Scenario H: Two simultaneous operations attempt to complete the same assignment', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const assignId = summary.transportAssignments[0].id;

      await TransportScheduleLockModel.deleteMany({ resourceId: { $in: [vehicle1._id, driver1._id] } });
      await operationsService.assignVehicleAndDriver(
        assignId,
        { vehicleId: vehicle1._id.toString(), driverId: driver1._id.toString() },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );
      await operationsService.dispatchTransport(
        assignId,
        { dispatchNotes: 'En route' },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      // Two simultaneous complete operations
      const results = await Promise.allSettled([
        operationsService.completeTransportAssignment(assignId, { userId: adminUser._id.toString(), role: 'ADMIN' }),
        operationsService.completeTransportAssignment(assignId, { userId: adminUser._id.toString(), role: 'ADMIN' }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly 1 must succeed, exactly 1 must fail
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      const finalAssign = await TransportAssignmentModel.findById(assignId);
      expect(finalAssign?.status).toBe('COMPLETED');

      // Locks released cleanly exactly once
      const locks = await TransportScheduleLockModel.find({ assignmentId: assignId });
      expect(locks.length).toBe(0);
    });

    it('recovers from process crash during voucher issuance without indefinite spinlock', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const resId = summary.hotelReservations[0].id;

      await operationsService.updateHotelReservation(
        resId,
        { status: 'CONFIRMED', supplierConfirmationNumber: 'CONF-SPIN-01' },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      // Simulate a crashed server process that set voucherAllocationInProgress = true and voucherAllocationClaimedAt = 45 seconds ago
      const staleTimestamp = new Date(Date.now() - 45 * 1000);
      await HotelReservationModel.findByIdAndUpdate(resId, {
        $set: {
          voucherAllocationInProgress: true,
          voucherAllocationClaimedAt: staleTimestamp,
        },
      });

      // Now request voucher generation: should recover from stale claim and issue voucher
      const result = await operationsService.generateHotelVoucher(resId, {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });

      expect(result.voucherIssued).toBe(true);
      expect(result.currentVoucher?.documentNumber).toMatch(/^NCT-VCH-/);
      expect(result.currentVoucher?.version).toBe(1);
    });
  });

  // =========================================================================
  // 4. LIVE MONGODB: IDEMPOTENT DOCUMENT ISSUANCE & IMMUTABLE VERSIONING
  // =========================================================================
  describe('Live MongoDB: Idempotent Document Issuance & Reissuance History', () => {
    it('allocates exactly 1 voucher sequence number under concurrent generation requests', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const resId = summary.hotelReservations[0].id;

      // Confirm reservation first
      await operationsService.updateHotelReservation(
        resId,
        { status: 'CONFIRMED', supplierConfirmationNumber: 'HOTEL-CONF-8899' },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      // Concurrent voucher requests
      const [v1, v2] = await Promise.all([
        operationsService.generateHotelVoucher(resId, { userId: adminUser._id.toString(), role: 'ADMIN' }),
        operationsService.generateHotelVoucher(resId, { userId: adminUser._id.toString(), role: 'ADMIN' }),
      ]);

      expect(v1.voucherIssued).toBe(true);
      expect(v2.voucherIssued).toBe(true);
      expect(v1.currentVoucher?.documentNumber).toBe(v2.currentVoucher?.documentNumber);
      expect(v1.currentVoucher?.version).toBe(1);
    });

    it('reissues a voucher with incremented version and preserves immutable history', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const resId = summary.hotelReservations[0].id;

      await operationsService.updateHotelReservation(
        resId,
        { status: 'CONFIRMED', supplierConfirmationNumber: 'HOTEL-CONF-9900' },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      const initialVoucher = await operationsService.generateHotelVoucher(resId, {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const originalDocNumber = initialVoucher.currentVoucher!.documentNumber;

      // Reissue voucher
      const reissued = await operationsService.reissueHotelVoucher(
        resId,
        { reason: 'Guest upgraded meal plan to MAP' },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      expect(reissued.currentVoucher?.documentNumber).toBe(originalDocNumber);
      expect(reissued.currentVoucher?.version).toBe(2);
      expect(reissued.currentVoucher?.reissueReason).toBe('Guest upgraded meal plan to MAP');

      // Verify history array
      const doc = await HotelReservationModel.findById(resId);
      expect(doc?.voucherHistory.length).toBe(1);
      expect(doc?.voucherHistory[0].version).toBe(1);
      expect(doc?.voucherHistory[0].reissueReason).toBe('Guest upgraded meal plan to MAP');
    });

    it('allocates exactly 1 duty slip under concurrent requests and reissues with version history', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const assignId = summary.transportAssignments[0].id;

      await TransportScheduleLockModel.deleteMany({ resourceId: { $in: [vehicle1._id, driver1._id] } });
      await operationsService.assignVehicleAndDriver(
        assignId,
        { vehicleId: vehicle1._id.toString(), driverId: driver1._id.toString() },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      // Concurrent duty slip generation
      const [d1, d2] = await Promise.all([
        operationsService.generateTransportDutySlip(assignId, { userId: adminUser._id.toString(), role: 'ADMIN' }),
        operationsService.generateTransportDutySlip(assignId, { userId: adminUser._id.toString(), role: 'ADMIN' }),
      ]);

      expect(d1.dutySlipIssued).toBe(true);
      expect(d2.dutySlipIssued).toBe(true);
      expect(d1.currentDutySlip?.documentNumber).toBe(d2.currentDutySlip?.documentNumber);
      expect(d1.currentDutySlip?.version).toBe(1);

      // Reissue duty slip
      const reissued = await operationsService.reissueTransportDutySlip(
        assignId,
        { reason: 'Updated pickup time from 09:00 to 10:30 AM' },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      expect(reissued.currentDutySlip?.version).toBe(2);
      expect(reissued.currentDutySlip?.reissueReason).toBe('Updated pickup time from 09:00 to 10:30 AM');

      const doc = await TransportAssignmentModel.findById(assignId);
      expect(doc?.dutySlipHistory.length).toBe(1);
      expect(doc?.dutySlipHistory[0].version).toBe(1);
    });
  });

  // =========================================================================
  // 5. ROLE AUTHORIZATION & SUPPLIER COST MASKING
  // =========================================================================
  describe('Role Authorization & Supplier Cost Masking', () => {
    it('masks supplierCost for AGENT role but exposes it for ADMIN role', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const resId = summary.hotelReservations[0].id;

      const resDoc = await HotelReservationModel.findById(resId);
      expect(resDoc).not.toBeNull();

      const adminDto = resDoc!.toDto('ADMIN');
      const agentDto = resDoc!.toDto('AGENT');

      expect(adminDto.supplierCost).toBe(12000);
      expect(agentDto.supplierCost).toBeUndefined();
    });

    it('prevents AGENT from confirming reservations, assigning vehicles, or dispatching drivers', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const resId = summary.hotelReservations[0].id;
      const assignId = summary.transportAssignments[0].id;

      const agentActor = { userId: agentUser._id.toString(), role: 'AGENT' as const };

      // AGENT cannot update reservation
      await expect(
        operationsService.updateHotelReservation(
          resId,
          { status: 'CONFIRMED', supplierConfirmationNumber: 'XYZ' },
          agentActor
        )
      ).rejects.toThrow(/Only administrators/);

      // AGENT cannot generate voucher
      await expect(operationsService.generateHotelVoucher(resId, agentActor)).rejects.toThrow(
        /Only administrators/
      );

      // AGENT cannot assign transport
      await expect(
        operationsService.assignVehicleAndDriver(
          assignId,
          { vehicleId: vehicle1._id.toString(), driverId: driver1._id.toString() },
          agentActor
        )
      ).rejects.toThrow(/Only administrators/);

      // AGENT cannot dispatch transport
      await expect(
        operationsService.dispatchTransport(assignId, { dispatchNotes: 'Go' }, agentActor)
      ).rejects.toThrow(/Only administrators/);
    });

    it('prevents AGENT from accessing operations of a booking assigned to another agent', async () => {
      const booking = await createTestBooking({ assignedAgentId: agentUser._id });

      // otherAgent attempts to access
      await expect(
        operationsService.getOperationalSummary(booking._id.toString(), {
          userId: otherAgentUser._id.toString(),
          role: 'AGENT',
        })
      ).rejects.toThrow(/not authorized/);
    });

    it('rejects operational initialization on a cancelled booking', async () => {
      const booking = await createTestBooking({ status: 'CANCELLED' });

      await expect(
        operationsService.initializeBookingOperations(booking._id.toString(), {
          userId: adminUser._id.toString(),
          role: 'ADMIN',
        })
      ).rejects.toThrow(/Cannot initialize operational records for a cancelled booking/);
    });
  });

  // =========================================================================
  // 6. BUSINESS VALIDATIONS & RECONCILIATION INTEGRITY
  // =========================================================================
  describe('Business Validations & Booking Status Reconciliation', () => {
    it('validates vehicle seating capacity and driver licensing prerequisites before assignment', async () => {
      const booking = await createTestBooking({ numberOfAdults: 4, numberOfChildren: 4 }); // 8 pax
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const assignId = summary.transportAssignments[0].id;

      // vehicle1 has capacity 6, but total pax is 8
      await expect(
        operationsService.assignVehicleAndDriver(
          assignId,
          { vehicleId: vehicle1._id.toString(), driverId: driver1._id.toString() },
          { userId: adminUser._id.toString(), role: 'ADMIN' }
        )
      ).rejects.toThrow(/seating capacity \(6\) is less than total passengers \(8\)/);

      // Create vehicle with expired insurance
      const expiredVehicle = await VehicleModel.create({
        vendorId: vendor._id,
        model: 'Old Van',
        category: 'TEMPO_TRAVELLER',
        registrationNumber: `JK01EX${Math.floor(1000 + Math.random() * 9000)}`,
        seatingCapacity: 12,
        insuranceExpiry: new Date('2020-01-01'),
        status: 'AVAILABLE',
      });

      await expect(
        operationsService.assignVehicleAndDriver(
          assignId,
          { vehicleId: expiredVehicle._id.toString(), driverId: driver1._id.toString() },
          { userId: adminUser._id.toString(), role: 'ADMIN' }
        )
      ).rejects.toThrow(/insurance expires before the scheduled tour end date/);

      // Create driver with expired license
      const expiredDriver = await DriverModel.create({
        vendorId: vendor._id,
        fullName: 'Expired Driver',
        mobile: `+9194190${Math.floor(10000 + Math.random() * 90000)}`,
        licenseNumber: `DL-EXP-${Math.floor(100000 + Math.random() * 900000)}`,
        licenseExpiry: new Date('2020-01-01'),
        status: 'ACTIVE',
      });

      const normalBooking = await createTestBooking({ numberOfAdults: 2, numberOfChildren: 0 });
      const normalSummary = await operationsService.initializeBookingOperations(normalBooking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const normalAssignId = normalSummary.transportAssignments[0].id;

      await expect(
        operationsService.assignVehicleAndDriver(
          normalAssignId,
          { vehicleId: vehicle1._id.toString(), driverId: expiredDriver._id.toString() },
          { userId: adminUser._id.toString(), role: 'ADMIN' }
        )
      ).rejects.toThrow(/Driver license expires before the scheduled tour end date/);
    });

    it('enforces hotel confirmation before voucher generation and validates required confirmation number', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const resId = summary.hotelReservations[0].id;

      // 1. Attempting voucher generation when reservation is still PENDING
      await expect(
        operationsService.generateHotelVoucher(resId, { userId: adminUser._id.toString(), role: 'ADMIN' })
      ).rejects.toThrow(/Reservation status is 'PENDING'/);

      // 2. Attempting to confirm without confirmation number
      await expect(
        operationsService.updateHotelReservation(
          resId,
          { status: 'CONFIRMED', supplierConfirmationNumber: '   ' },
          { userId: adminUser._id.toString(), role: 'ADMIN' }
        )
      ).rejects.toThrow(/Supplier confirmation number is required/);
    });

    it('reconciles Booking.hotelVoucherGenerated and driverDutySlipGenerated aggregate flags', async () => {
      const booking = await createTestBooking();
      const summary = await operationsService.initializeBookingOperations(booking._id.toString(), {
        userId: adminUser._id.toString(),
        role: 'ADMIN',
      });
      const resId = summary.hotelReservations[0].id;
      const assignId = summary.transportAssignments[0].id;

      // Initial state: both false
      let freshBooking = await BookingModel.findById(booking._id);
      expect(freshBooking?.hotelVoucherGenerated).toBe(false);
      expect(freshBooking?.driverDutySlipGenerated).toBe(false);

      // Confirm and generate voucher
      await operationsService.updateHotelReservation(
        resId,
        { status: 'CONFIRMED', supplierConfirmationNumber: 'HOTEL-CONF-REC' },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );
      await operationsService.generateHotelVoucher(resId, { userId: adminUser._id.toString(), role: 'ADMIN' });

      freshBooking = await BookingModel.findById(booking._id);
      expect(freshBooking?.hotelVoucherGenerated).toBe(true);
      expect(freshBooking?.driverDutySlipGenerated).toBe(false);

      // Assign and generate duty slip
      await operationsService.assignVehicleAndDriver(
        assignId,
        { vehicleId: vehicle1._id.toString(), driverId: driver1._id.toString() },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );
      await operationsService.generateTransportDutySlip(assignId, { userId: adminUser._id.toString(), role: 'ADMIN' });

      freshBooking = await BookingModel.findById(booking._id);
      expect(freshBooking?.hotelVoucherGenerated).toBe(true);
      expect(freshBooking?.driverDutySlipGenerated).toBe(true);

      // Cancelling booking resets both flags to false
      await bookingService.updateBookingStatus(
        booking._id.toString(),
        { status: 'CANCELLED', cancellationReason: 'Client changed destination' },
        { userId: adminUser._id.toString(), role: 'ADMIN' }
      );

      freshBooking = await BookingModel.findById(booking._id);
      expect(freshBooking?.hotelVoucherGenerated).toBe(false);
      expect(freshBooking?.driverDutySlipGenerated).toBe(false);
    });
  });
});
