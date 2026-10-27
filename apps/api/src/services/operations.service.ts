import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  AssignTransportInput,
  DispatchTransportInput,
  HotelReservationDto,
  OperationalSummaryDto,
  ReissueDocumentInput,
  TransportAssignmentDto,
  UpdateHotelReservationInput,
  UserRole,
} from '@chirag/types';
import { BookingModel } from '../models/booking.model';
import { DriverModel } from '../models/driver.model';
import {
  HotelReservationModel,
  IDocumentSnapshotDoc,
  IHotelReservationDocument,
} from '../models/hotelReservation.model';
import { getNextSequenceValue } from '../models/sequence.model';
import {
  ITransportAssignmentDocument,
  TransportAssignmentModel,
} from '../models/transportAssignment.model';
import { VehicleModel } from '../models/vehicle.model';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { hotelReservationRepository } from '../repositories/hotelReservation.repository';
import { transportAssignmentRepository } from '../repositories/transportAssignment.repository';
import { transportScheduleLockRepository } from '../repositories/transportScheduleLock.repository';
import { AppError } from '../utils/appError';
import { ErrorCodes } from '../constants/errorCodes';


export interface OperationsActorContext {
  userId: string;
  role: UserRole;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Normalizes a Date into an array of 'YYYY-MM-DD' strings in Asia/Kolkata (IST).
 */
export function getDatesBetweenInIST(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  // Normalize to IST day boundaries
  while (current <= end) {
    const istString = current.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // 'YYYY-MM-DD'
    if (!dates.includes(istString)) {
      dates.push(istString);
    }
    current.setDate(current.getDate() + 1);
  }

  // Ensure start date is present even if duration is 0
  if (dates.length === 0) {
    dates.push(startDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  }

  return dates;
}

export class OperationsService {
  /**
   * Idempotent initialization of operational records from Booking.itinerarySnapshot.
   */
  async initializeBookingOperations(
    bookingId: string,
    actor: OperationsActorContext
  ): Promise<OperationalSummaryDto> {
    const booking = await BookingModel.findById(bookingId).populate('customerId');
    if (!booking) {
      throw AppError.notFound(`Booking with ID '${bookingId}' was not found`);
    }

    if (booking.status === 'CANCELLED') {
      throw AppError.badRequest(
        'Cannot initialize operational records for a cancelled booking',
        ErrorCodes.BAD_REQUEST
      );
    }

    // Role scoping
    if (actor.role === 'AGENT') {
      const assignedId =
        (booking.assignedAgentId as any)?._id?.toString() ||
        booking.assignedAgentId?.toString();
      if (assignedId !== actor.userId) {
        throw AppError.forbidden('You are not authorized to access this booking', ErrorCodes.FORBIDDEN);
      }
    } else if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Insufficient permissions to initialize operations', ErrorCodes.FORBIDDEN);
    }

    const hotelItems = booking.itinerarySnapshot?.hotels || [];
    const transportItems = booking.itinerarySnapshot?.transports || [];

    // 1. Initialize Hotel Reservations
    for (let i = 0; i < hotelItems.length; i++) {
      const h = hotelItems[i];
      if (!h.hotelId || !h.roomCategoryId) continue;

      const checkIn = new Date(h.checkInDate || booking.travelStartDate);
      const checkOut = new Date(h.checkOutDate || booking.travelEndDate);
      const nights =
        h.numberOfNights ||
        Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

      await hotelReservationRepository.upsertInitial({
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        hotelId: h.hotelId,
        roomCategoryId: h.roomCategoryId,
        hotelItemIndex: i,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfNights: nights,
        numberOfRooms: h.numberOfRooms || 1,
        mealPlan: h.mealPlan || 'CP',
        adultsCount: h.adultsCount || booking.numberOfAdults || 2,
        childrenCount: h.childrenWithBedCount || 0,
        status: 'PENDING',
        supplierCost: h.supplierCost,
        voucherIssued: false,
      });
    }

    // 2. Initialize Transport Assignments
    for (let i = 0; i < transportItems.length; i++) {
      const t = transportItems[i];
      const start = new Date(booking.travelStartDate);
      const end = new Date(booking.travelEndDate);

      await transportAssignmentRepository.upsertInitial({
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        transportItemIndex: i,
        assignedVehicleId: t.vehicleId,
        status: t.vehicleId ? 'ASSIGNED' : 'UNASSIGNED',
        startDate: start,
        endDate: end,
        pickupLocation: 'Airport / Station Pickup',
        dropLocation: 'Tour Circuit Sightseeing',
        dutySlipIssued: false,
      });
    }

    // Reconcile status flags
    await this.reconcileBookingOperationalStatus(bookingId);

    // Audit log
    await auditLogRepository.record({
      actorType: 'USER',
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'OPERATIONS_INITIALIZED' as any,
      entityType: 'BOOKING' as any,
      entityId: bookingId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      notes: `Operational records initialized for ${booking.bookingNumber}`,
    });

    return this.getOperationalSummary(bookingId, actor);
  }

  /**
   * Retrieves full operational status for a booking.
   */
  async getOperationalSummary(
    bookingId: string,
    actor: OperationsActorContext
  ): Promise<OperationalSummaryDto> {
    const booking = await BookingModel.findById(bookingId).populate('customerId');
    if (!booking) {
      throw AppError.notFound(`Booking with ID '${bookingId}' was not found`);
    }

    // Scoping
    if (actor.role === 'AGENT') {
      const assignedId =
        (booking.assignedAgentId as any)?._id?.toString() ||
        booking.assignedAgentId?.toString();
      if (assignedId !== actor.userId) {
        throw AppError.forbidden('You are not authorized to view operations for this booking', ErrorCodes.FORBIDDEN);
      }
    } else if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Insufficient permissions', ErrorCodes.FORBIDDEN);
    }

    const [reservations, assignments] = await Promise.all([
      hotelReservationRepository.findByBookingId(bookingId),
      transportAssignmentRepository.findByBookingId(bookingId),
    ]);

    const resDtos = reservations.map((r) => r.toDto(actor.role));
    const transDtos = assignments.map((t) => {
      const dto = t.toDto();
      if (actor.role === 'AGENT') {
        dto.driverLicenseNumber = undefined;
      }
      return dto;
    });

    const totalRes = reservations.length;
    const totalTrans = assignments.length;

    const confirmedResCount = reservations.filter((r) => r.status === 'CONFIRMED').length;
    const assignedTransCount = assignments.filter((t) =>
      ['ASSIGNED', 'DISPATCHED', 'IN_TRANSIT', 'COMPLETED'].includes(t.status)
    ).length;
    const vouchersIssuedCount = reservations.filter((r) => r.voucherIssued).length;
    const dutySlipsIssuedCount = assignments.filter((t) => t.dutySlipIssued).length;

    const allHotelVouchersIssued = totalRes > 0 && vouchersIssuedCount === totalRes;
    const allDriverDutySlipsIssued = totalTrans > 0 && dutySlipsIssuedCount === totalTrans;

    // Calculate readiness percentage (based on supplier confirmation, vehicle assignment, and documents)
    let readinessScore = 0;
    const totalMilestones = totalRes * 2 + totalTrans * 2; // (confirm + voucher) + (assign + duty-slip)
    if (totalMilestones > 0) {
      const achieved =
        confirmedResCount + vouchersIssuedCount + assignedTransCount + dutySlipsIssuedCount;
      readinessScore = Math.round((achieved / totalMilestones) * 100);
    } else {
      readinessScore = 100;
    }

    const customer = booking.customerId as any;

    return {
      bookingId: booking._id.toString(),
      bookingNumber: booking.bookingNumber,
      bookingStatus: booking.status,
      travelStartDate: booking.travelStartDate.toISOString(),
      travelEndDate: booking.travelEndDate.toISOString(),
      customerName: customer?.fullName,
      customerPhone: customer?.mobile,
      hotelReservations: resDtos,
      transportAssignments: transDtos,
      allHotelVouchersIssued,
      allDriverDutySlipsIssued,
      operationalReadinessPercent: readinessScore,
    };
  }

  /**
   * Updates hotel reservation supplier confirmation status and contact details (ADMIN only).
   */
  async updateHotelReservation(
    id: string,
    input: UpdateHotelReservationInput,
    actor: OperationsActorContext
  ): Promise<HotelReservationDto> {
    if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can update hotel reservation status', ErrorCodes.FORBIDDEN);
    }

    const reservation = await hotelReservationRepository.findById(id);
    if (!reservation) {
      throw AppError.notFound(`Hotel reservation '${id}' was not found`);
    }

    if (reservation.status === 'CANCELLED') {
      throw AppError.badRequest('Cannot update a cancelled hotel reservation');
    }

    const previousStatus = reservation.status;
    const updateData: Partial<IHotelReservationDocument> = {};

    if (input.status) {
      // Validate transition
      if (input.status === 'CONFIRMED') {
        const confNum = input.supplierConfirmationNumber || reservation.supplierConfirmationNumber;
        if (!confNum || !confNum.trim()) {
          throw AppError.badRequest(
            'Supplier confirmation number is required to confirm a hotel reservation',
            ErrorCodes.VALIDATION_ERROR
          );
        }
        updateData.supplierConfirmationNumber = confNum.trim();
      }
      updateData.status = input.status;
    }

    if (input.supplierConfirmationNumber !== undefined) {
      updateData.supplierConfirmationNumber = input.supplierConfirmationNumber.trim();
    }
    if (input.supplierContactPerson !== undefined) {
      updateData.supplierContactPerson = input.supplierContactPerson.trim();
    }
    if (input.supplierContactPhone !== undefined) {
      updateData.supplierContactPhone = input.supplierContactPhone.trim();
    }
    if (input.specialRequests !== undefined) {
      updateData.specialRequests = input.specialRequests.trim();
    }
    if (input.internalNotes !== undefined) {
      updateData.internalNotes = input.internalNotes.trim();
    }

    const updated = await hotelReservationRepository.update(id, updateData);

    await auditLogRepository.record({
      actorType: 'USER',
      actorId: actor.userId,
      actorRole: actor.role,
      action:
        input.status === 'CONFIRMED'
          ? ('HOTEL_RESERVATION_CONFIRMED' as any)
          : ('HOTEL_RESERVATION_UPDATED' as any),
      entityType: 'HOTEL_RESERVATION' as any,
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: { status: previousStatus },
      newState: { status: updated?.status, confirmationNumber: updated?.supplierConfirmationNumber },
    });

    return updated!.toDto(actor.role);
  }

  /**
   * Issues an idempotent hotel voucher.
   */
  async generateHotelVoucher(
    id: string,
    actor: OperationsActorContext
  ): Promise<HotelReservationDto> {
    if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can generate hotel vouchers', ErrorCodes.FORBIDDEN);
    }

    const reservation = await hotelReservationRepository.findById(id);
    if (!reservation) {
      throw AppError.notFound(`Hotel reservation '${id}' was not found`);
    }

    // Idempotent return if already issued
    if (reservation.voucherIssued && reservation.currentVoucher) {
      return reservation.toDto(actor.role);
    }

    const booking = await BookingModel.findById(reservation.bookingId).populate('customerId');
    if (!booking) {
      throw AppError.notFound('Parent booking not found');
    }

    if (!['CONFIRMED', 'OPERATIONAL_PREPARATION', 'IN_TRIP'].includes(booking.status)) {
      throw AppError.badRequest(
        `Cannot generate hotel voucher: Booking is in '${booking.status}' state (must be CONFIRMED or later)`,
        ErrorCodes.BAD_REQUEST
      );
    }

    if (reservation.status !== 'CONFIRMED') {
      throw AppError.badRequest(
        `Cannot generate voucher: Reservation status is '${reservation.status}' (must be CONFIRMED by hotel)`,
        ErrorCodes.BAD_REQUEST
      );
    }

    if (!reservation.supplierConfirmationNumber) {
      throw AppError.badRequest(
        'Cannot generate voucher: Supplier confirmation number is missing',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Atomic claim of unissued reservation
    const claimed = await hotelReservationRepository.claimVoucherAllocation(id);
    if (!claimed) {
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const fresh = await hotelReservationRepository.findById(id);
        if (fresh && fresh.voucherIssued && fresh.currentVoucher) {
          return fresh.toDto(actor.role);
        }
        if (!fresh || !fresh.voucherAllocationInProgress) {
          break;
        }
      }
      const fresh = await hotelReservationRepository.findById(id);
      return fresh!.toDto(actor.role);
    }

    try {
      const year = new Date().getFullYear();
      const seq = await getNextSequenceValue(`voucher_${year}`);
      const voucherNumber = `NCT-VCH-${year}-${seq.toString().padStart(5, '0')}`;

      const hotel = reservation.hotelId as any;
      const roomCategory = reservation.roomCategoryId as any;
      const customer = booking.customerId as any;

      const snapshotData: Record<string, unknown> = {
        voucherNumber,
        version: 1,
        bookingNumber: booking.bookingNumber,
        customerName: customer?.fullName,
        customerPhone: customer?.mobile,
        customerEmail: customer?.email,
        hotelName: hotel?.name,
        hotelAddress: hotel?.address,
        hotelCity: hotel?.city,
        hotelPhone: hotel?.contactPhone,
        hotelCheckInTime: hotel?.checkInTime,
        hotelCheckOutTime: hotel?.checkOutTime,
        roomCategoryName: roomCategory?.name,
        numberOfRooms: reservation.numberOfRooms,
        mealPlan: reservation.mealPlan,
        checkInDate: reservation.checkInDate.toISOString(),
        checkOutDate: reservation.checkOutDate.toISOString(),
        numberOfNights: reservation.numberOfNights,
        adultsCount: reservation.adultsCount,
        childrenCount: reservation.childrenCount,
        supplierConfirmationNumber: reservation.supplierConfirmationNumber,
        specialRequests: reservation.specialRequests,
        issuedAt: new Date().toISOString(),
        inclusions: booking.itinerarySnapshot?.inclusions || [],
        terms: booking.itinerarySnapshot?.terms || [],
      };

      const voucherDoc: IDocumentSnapshotDoc = {
        documentNumber: voucherNumber,
        version: 1,
        issuedAt: new Date(),
        issuedBy: new mongoose.Types.ObjectId(actor.userId),
        documentSnapshot: snapshotData,
      };

      const updated = await hotelReservationRepository.update(id, {
        voucherIssued: true,
        currentVoucher: voucherDoc,
        voucherAllocationInProgress: false,
      });

      await this.reconcileBookingOperationalStatus(booking._id.toString());

      await auditLogRepository.record({
        actorType: 'USER',
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'HOTEL_VOUCHER_GENERATED' as any,
        entityType: 'HOTEL_RESERVATION' as any,
        entityId: id,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        notes: `Generated voucher ${voucherNumber} (v1) for ${booking.bookingNumber}`,
      });

      return updated!.toDto(actor.role);
    } catch (err) {
      await hotelReservationRepository.update(id, { voucherAllocationInProgress: false });
      throw err;
    }
  }

  /**
   * Reissues a hotel voucher with version tracking and reason preservation.
   */
  async reissueHotelVoucher(
    id: string,
    input: ReissueDocumentInput,
    actor: OperationsActorContext
  ): Promise<HotelReservationDto> {
    if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can reissue vouchers', ErrorCodes.FORBIDDEN);
    }

    const reservation = await hotelReservationRepository.findById(id);
    if (!reservation) {
      throw AppError.notFound(`Hotel reservation '${id}' was not found`);
    }

    if (!reservation.voucherIssued || !reservation.currentVoucher) {
      throw AppError.badRequest('Cannot reissue: No initial voucher has been generated yet');
    }

    const previousVoucher = reservation.currentVoucher;
    const newVersion = previousVoucher.version + 1;

    const voucherHistory = [...(reservation.voucherHistory || [])];
    voucherHistory.push({
      documentNumber: previousVoucher.documentNumber,
      version: previousVoucher.version,
      issuedAt: previousVoucher.issuedAt,
      issuedBy: previousVoucher.issuedBy,
      reissueReason: input.reason.trim(),
      documentSnapshot: previousVoucher.documentSnapshot,
    });

    const booking = await BookingModel.findById(reservation.bookingId).populate('customerId');
    const hotel = reservation.hotelId as any;
    const roomCategory = reservation.roomCategoryId as any;
    const customer = booking?.customerId as any;

    const newSnapshot: Record<string, unknown> = {
      ...previousVoucher.documentSnapshot,
      version: newVersion,
      reissuedAt: new Date().toISOString(),
      reissueReason: input.reason.trim(),
      hotelName: hotel?.name,
      customerName: customer?.fullName,
      roomCategoryName: roomCategory?.name,
      supplierConfirmationNumber: reservation.supplierConfirmationNumber,
      specialRequests: reservation.specialRequests,
    };

    const newCurrentVoucher: IDocumentSnapshotDoc = {
      documentNumber: previousVoucher.documentNumber,
      version: newVersion,
      issuedAt: new Date(),
      issuedBy: new mongoose.Types.ObjectId(actor.userId),
      reissueReason: input.reason.trim(),
      documentSnapshot: newSnapshot,
    };

    const updated = await hotelReservationRepository.update(id, {
      currentVoucher: newCurrentVoucher,
      voucherHistory,
    });

    await auditLogRepository.record({
      actorType: 'USER',
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'HOTEL_VOUCHER_REISSUED' as any,
      entityType: 'HOTEL_RESERVATION' as any,
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      notes: `Reissued voucher ${previousVoucher.documentNumber} to v${newVersion}: ${input.reason}`,
    });

    return updated!.toDto(actor.role);
  }

  /**
   * Assigns vehicle and driver to transport assignment with conflict protection and schedule locking.
   */
  async assignVehicleAndDriver(
    id: string,
    input: AssignTransportInput,
    actor: OperationsActorContext
  ): Promise<TransportAssignmentDto> {
    if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can assign transport', ErrorCodes.FORBIDDEN);
    }

    const assignment = await transportAssignmentRepository.findById(id);
    if (!assignment) {
      throw AppError.notFound(`Transport assignment '${id}' was not found`);
    }

    if (assignment.status === 'CANCELLED' || assignment.status === 'COMPLETED') {
      throw AppError.badRequest(`Cannot assign resources to a ${assignment.status.toLowerCase()} transport assignment`);
    }

    const booking = await BookingModel.findById(assignment.bookingId);
    if (!booking) {
      throw AppError.notFound('Parent booking was not found');
    }

    if (booking.status === 'CANCELLED') {
      throw AppError.badRequest('Cannot assign transport: Parent booking is cancelled', ErrorCodes.BAD_REQUEST);
    }

    // 1. Validate Vehicle
    const vehicle = await VehicleModel.findById(input.vehicleId);
    if (!vehicle) {
      throw AppError.notFound(`Vehicle with ID '${input.vehicleId}' was not found`);
    }

    const currentVehicleId = (assignment.assignedVehicleId as any)?._id?.toString() || assignment.assignedVehicleId?.toString();
    if (vehicle.status !== 'AVAILABLE' && currentVehicleId !== input.vehicleId) {
      throw AppError.badRequest(`Vehicle is currently in '${vehicle.status}' state and not available`);
    }

    const totalPassengers = (booking.numberOfAdults || 2) + (booking.numberOfChildren || 0);
    if (vehicle.seatingCapacity < totalPassengers) {
      throw AppError.badRequest(
        `Vehicle seating capacity (${vehicle.seatingCapacity}) is less than total passengers (${totalPassengers})`
      );
    }

    if (vehicle.insuranceExpiry && new Date(vehicle.insuranceExpiry) < assignment.endDate) {
      throw AppError.badRequest('Vehicle insurance expires before the scheduled tour end date');
    }

    // 2. Validate Driver
    const driver = await DriverModel.findById(input.driverId);
    if (!driver) {
      throw AppError.notFound(`Driver with ID '${input.driverId}' was not found`);
    }

    const currentDriverId = (assignment.assignedDriverId as any)?._id?.toString() || assignment.assignedDriverId?.toString();
    if (driver.status !== 'ACTIVE' && currentDriverId !== input.driverId) {
      throw AppError.badRequest(`Driver status is '${driver.status}' (must be ACTIVE)`);
    }

    if (driver.licenseExpiry && new Date(driver.licenseExpiry) < assignment.endDate) {
      throw AppError.badRequest('Driver license expires before the scheduled tour end date');
    }

    // 3. Acquire atomic schedule locks
    const dates = getDatesBetweenInIST(assignment.startDate, assignment.endDate);
    const intentId = crypto.randomUUID();

    const lockResult = await transportScheduleLockRepository.acquireScheduleLocks({
      assignmentId: assignment._id.toString(),
      bookingId: booking._id.toString(),
      bookingNumber: booking.bookingNumber,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      dates,
      reservationIntentId: intentId,
      currentLockIntentId: assignment.activeLockIntentId,
    });

    if (!lockResult.success) {
      throw AppError.conflict(
        `Resource conflict: ${lockResult.conflictResource || 'Vehicle/Driver'} is already committed on ${lockResult.conflictDate || 'one or more dates'} by another assignment`
      );
    }

    // 4. Preserve assignment history if reassigning
    const history = [...(assignment.assignmentHistory || [])];
    if (currentVehicleId && (currentVehicleId !== input.vehicleId || currentDriverId !== input.driverId)) {
      history.push({
        previousVehicleId: assignment.assignedVehicleId as any,
        previousDriverId: assignment.assignedDriverId as any,
        previousVendorId: assignment.assignedVendorId as any,
        reassignedAt: new Date(),
        reassignedBy: new mongoose.Types.ObjectId(actor.userId),
        reason: input.reason?.trim() || 'Vehicle or driver reassignment',
        previousStatus: assignment.status,
      });
    }

    const updateData: Partial<ITransportAssignmentDocument> = {
      assignedVehicleId: new mongoose.Types.ObjectId(input.vehicleId),
      assignedDriverId: new mongoose.Types.ObjectId(input.driverId),
      assignedVendorId: vehicle.vendorId,
      status: 'ASSIGNED',
      activeLockIntentId: intentId,
      assignmentHistory: history,
    };

    if (input.pickupLocation) updateData.pickupLocation = input.pickupLocation.trim();
    if (input.dropLocation) updateData.dropLocation = input.dropLocation.trim();
    // Concurrency CAS filter: status must be UNASSIGNED/ASSIGNED/DISPATCHED,
    // activeLockIntentId must match what was read, and parent booking must not be cancelled
    const casCondition: Record<string, any> = {
      status: { $in: ['UNASSIGNED', 'ASSIGNED', 'DISPATCHED'] },
    };
    if (assignment.activeLockIntentId) {
      casCondition.activeLockIntentId = assignment.activeLockIntentId;
    }

    const activeBookingCheck = await BookingModel.findOne({
      _id: assignment.bookingId,
      status: { $in: ['CONFIRMED', 'OPERATIONAL_PREPARATION', 'IN_TRIP'] },
    });
    if (!activeBookingCheck) {
      await transportScheduleLockRepository.releaseLocksForAssignment(id, intentId);
      throw AppError.conflict('Cannot reassign: Parent booking was cancelled concurrently');
    }

    const updated = await transportAssignmentRepository.update(id, updateData, casCondition);

    if (!updated) {
      await transportScheduleLockRepository.releaseLocksForAssignment(id, intentId);
      throw AppError.conflict(
        'Cannot reassign: Transport assignment was concurrently modified, completed, or cancelled'
      );
    }

    // Sync primary vehicle/driver on root booking for fast list display
    await BookingModel.findByIdAndUpdate(booking._id, {
      $set: {
        assignedVehicleId: new mongoose.Types.ObjectId(input.vehicleId),
        assignedDriverId: new mongoose.Types.ObjectId(input.driverId),
      },
    });

    await this.reconcileBookingOperationalStatus(booking._id.toString());

    await auditLogRepository.record({
      actorType: 'USER',
      actorId: actor.userId,
      actorRole: actor.role,
      action: (currentVehicleId ? 'TRANSPORT_REASSIGNED' : 'TRANSPORT_ASSIGNED') as any,
      entityType: 'TRANSPORT_ASSIGNMENT' as any,
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      notes: `Assigned vehicle ${vehicle.registrationNumber} and driver ${driver.fullName} to ${booking.bookingNumber}`,
    });

    return updated!.toDto();
  }

  /**
   * Dispatches transport with concurrency-safe parent booking re-validation.
   */
  async dispatchTransport(
    id: string,
    input: DispatchTransportInput,
    actor: OperationsActorContext
  ): Promise<TransportAssignmentDto> {
    if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can dispatch transport', ErrorCodes.FORBIDDEN);
    }

    // Step 1: Atomic state transition from ASSIGNED to DISPATCHED
    const updated = await TransportAssignmentModel.findOneAndUpdate(
      {
        _id: id,
        status: 'ASSIGNED',
      },
      {
        $set: {
          status: 'DISPATCHED',
          dispatchedAt: new Date(),
          dispatchedBy: new mongoose.Types.ObjectId(actor.userId),
          dispatchNotes: input.dispatchNotes?.trim(),
        },
      },
      { new: true }
    )
      .populate('assignedVehicleId')
      .populate('assignedDriverId')
      .populate('assignedVendorId');

    if (!updated) {
      throw AppError.badRequest(
        'Cannot dispatch: Assignment is not in ASSIGNED state (may be cancelled or already dispatched)'
      );
    }

    // Step 2: Atomic write boundary re-validation of parent booking
    const activeBooking = await BookingModel.findOne({
      _id: updated.bookingId,
      status: { $in: ['CONFIRMED', 'OPERATIONAL_PREPARATION', 'IN_TRIP'] },
    });

    if (!activeBooking) {
      // Race detected: Booking was cancelled concurrently during dispatch
      // Rollback assignment to CANCELLED and release schedule locks
      await TransportAssignmentModel.findByIdAndUpdate(id, {
        $set: {
          status: 'CANCELLED',
          supplierCancellation: {
            status: 'PENDING_SUPPLIER_ACKNOWLEDGEMENT',
            requestedAt: new Date(),
            requestedBy: new mongoose.Types.ObjectId(actor.userId),
            reason: 'Parent booking was cancelled concurrently during dispatch',
          },
        },
      });

      await transportScheduleLockRepository.releaseLocksForAssignment(id);

      throw AppError.conflict(
        'Dispatch aborted: Parent booking was cancelled concurrently. Assignment has been rolled back to CANCELLED.'
      );
    }

    // If travel start date has arrived, transition booking to IN_TRIP
    const now = new Date();
    if (activeBooking.travelStartDate <= now && activeBooking.status !== 'IN_TRIP') {
      await BookingModel.findByIdAndUpdate(activeBooking._id, {
        $set: { status: 'IN_TRIP' },
      });
    }

    await auditLogRepository.record({
      actorType: 'USER',
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'DRIVER_DISPATCHED' as any,
      entityType: 'TRANSPORT_ASSIGNMENT' as any,
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      notes: `Dispatched driver for ${activeBooking.bookingNumber}`,
    });

    return updated.toDto();
  }

  /**
   * Issues an idempotent transport duty slip.
   */
  async generateTransportDutySlip(
    id: string,
    actor: OperationsActorContext
  ): Promise<TransportAssignmentDto> {
    if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can generate duty slips', ErrorCodes.FORBIDDEN);
    }

    const assignment = await transportAssignmentRepository.findById(id);
    if (!assignment) {
      throw AppError.notFound(`Transport assignment '${id}' was not found`);
    }

    // Idempotent return
    if (assignment.dutySlipIssued && assignment.currentDutySlip) {
      return assignment.toDto();
    }

    const booking = await BookingModel.findById(assignment.bookingId).populate('customerId');
    if (!booking) {
      throw AppError.notFound('Parent booking not found');
    }

    if (!['CONFIRMED', 'OPERATIONAL_PREPARATION', 'IN_TRIP'].includes(booking.status)) {
      throw AppError.badRequest(
        `Cannot generate duty slip: Booking is in '${booking.status}' state (must be CONFIRMED or later)`,
        ErrorCodes.BAD_REQUEST
      );
    }

    if (!assignment.assignedVehicleId || !assignment.assignedDriverId) {
      throw AppError.badRequest(
        'Cannot generate duty slip: Vehicle and driver must both be assigned first',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    if (!['ASSIGNED', 'DISPATCHED', 'IN_TRANSIT'].includes(assignment.status)) {
      throw AppError.badRequest(
        `Cannot generate duty slip: Assignment status is '${assignment.status}'`,
        ErrorCodes.BAD_REQUEST
      );
    }

    // Atomic claim
    const claimed = await transportAssignmentRepository.claimDutySlipAllocation(id);
    if (!claimed) {
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const fresh = await transportAssignmentRepository.findById(id);
        if (fresh && fresh.dutySlipIssued && fresh.currentDutySlip) {
          return fresh.toDto();
        }
        if (!fresh || !fresh.dutySlipAllocationInProgress) {
          break;
        }
      }
      const fresh = await transportAssignmentRepository.findById(id);
      return fresh!.toDto();
    }

    try {
      const year = new Date().getFullYear();
      const seq = await getNextSequenceValue(`dutyslip_${year}`);
      const dutySlipNumber = `NCT-DS-${year}-${seq.toString().padStart(5, '0')}`;

      const vehicle = assignment.assignedVehicleId as any;
      const driver = assignment.assignedDriverId as any;
      const customer = booking.customerId as any;

      const snapshotData: Record<string, unknown> = {
        dutySlipNumber,
        version: 1,
        bookingNumber: booking.bookingNumber,
        customerName: customer?.fullName,
        customerPhone: customer?.mobile,
        driverName: driver?.fullName,
        driverMobile: driver?.mobile,
        driverLicenseNumber: driver?.licenseNumber,
        vehicleRegistration: vehicle?.registrationNumber,
        vehicleModel: vehicle?.model,
        vehicleCategory: vehicle?.category,
        startDate: assignment.startDate.toISOString(),
        endDate: assignment.endDate.toISOString(),
        pickupLocation: assignment.pickupLocation,
        dropLocation: assignment.dropLocation,
        pickupTime: assignment.pickupTime,
        reportingAddress: assignment.reportingAddress,
        issuedAt: new Date().toISOString(),
      };

      const dutySlipDoc: IDocumentSnapshotDoc = {
        documentNumber: dutySlipNumber,
        version: 1,
        issuedAt: new Date(),
        issuedBy: new mongoose.Types.ObjectId(actor.userId),
        documentSnapshot: snapshotData,
      };

      const updated = await transportAssignmentRepository.update(id, {
        dutySlipIssued: true,
        currentDutySlip: dutySlipDoc,
        dutySlipAllocationInProgress: false,
      });

      await this.reconcileBookingOperationalStatus(booking._id.toString());

      await auditLogRepository.record({
        actorType: 'USER',
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'DUTY_SLIP_GENERATED' as any,
        entityType: 'TRANSPORT_ASSIGNMENT' as any,
        entityId: id,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        notes: `Generated duty slip ${dutySlipNumber} (v1) for ${booking.bookingNumber}`,
      });

      return updated!.toDto();
    } catch (err) {
      await transportAssignmentRepository.update(id, { dutySlipAllocationInProgress: false });
      throw err;
    }
  }

  /**
   * Reissues a transport duty slip with version history.
   */
  async reissueTransportDutySlip(
    id: string,
    input: ReissueDocumentInput,
    actor: OperationsActorContext
  ): Promise<TransportAssignmentDto> {
    if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can reissue duty slips', ErrorCodes.FORBIDDEN);
    }

    const assignment = await transportAssignmentRepository.findById(id);
    if (!assignment) {
      throw AppError.notFound(`Transport assignment '${id}' was not found`);
    }

    if (!assignment.dutySlipIssued || !assignment.currentDutySlip) {
      throw AppError.badRequest('Cannot reissue: No initial duty slip has been generated yet');
    }

    const previousDutySlip = assignment.currentDutySlip;
    const newVersion = previousDutySlip.version + 1;

    const dutySlipHistory = [...(assignment.dutySlipHistory || [])];
    dutySlipHistory.push({
      documentNumber: previousDutySlip.documentNumber,
      version: previousDutySlip.version,
      issuedAt: previousDutySlip.issuedAt,
      issuedBy: previousDutySlip.issuedBy,
      reissueReason: input.reason.trim(),
      documentSnapshot: previousDutySlip.documentSnapshot,
    });

    const vehicle = assignment.assignedVehicleId as any;
    const driver = assignment.assignedDriverId as any;

    const newSnapshot: Record<string, unknown> = {
      ...previousDutySlip.documentSnapshot,
      version: newVersion,
      reissuedAt: new Date().toISOString(),
      reissueReason: input.reason.trim(),
      driverName: driver?.fullName,
      driverMobile: driver?.mobile,
      vehicleRegistration: vehicle?.registrationNumber,
      pickupTime: assignment.pickupTime,
      reportingAddress: assignment.reportingAddress,
    };

    const newCurrentDutySlip: IDocumentSnapshotDoc = {
      documentNumber: previousDutySlip.documentNumber,
      version: newVersion,
      issuedAt: new Date(),
      issuedBy: new mongoose.Types.ObjectId(actor.userId),
      reissueReason: input.reason.trim(),
      documentSnapshot: newSnapshot,
    };

    const updated = await transportAssignmentRepository.update(id, {
      currentDutySlip: newCurrentDutySlip,
      dutySlipHistory,
    });

    await auditLogRepository.record({
      actorType: 'USER',
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'DUTY_SLIP_REISSUED' as any,
      entityType: 'TRANSPORT_ASSIGNMENT' as any,
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      notes: `Reissued duty slip ${previousDutySlip.documentNumber} to v${newVersion}: ${input.reason}`,
    });

    return updated!.toDto();
  }

  /**
   * Reconciles derived aggregate status flags on parent Booking document.
   */
  async reconcileBookingOperationalStatus(bookingId: string): Promise<void> {
    const [totalRes, voucherCount, totalTrans, dutySlipCount] = await Promise.all([
      hotelReservationRepository.countByBookingId(bookingId),
      hotelReservationRepository.countVoucherIssuedByBookingId(bookingId),
      transportAssignmentRepository.countByBookingId(bookingId),
      transportAssignmentRepository.countDutySlipIssuedByBookingId(bookingId),
    ]);

    const allHotelVouchersIssued = totalRes > 0 && voucherCount === totalRes;
    const allDriverDutySlipsIssued = totalTrans > 0 && dutySlipCount === totalTrans;

    await BookingModel.findByIdAndUpdate(bookingId, {
      $set: {
        hotelVoucherGenerated: allHotelVouchersIssued,
        driverDutySlipGenerated: allDriverDutySlipsIssued,
      },
    });
  }

  /**
   * Cascade cancellation of operational records when a booking is cancelled.
   */
  async cancelOperationalRecordsForBooking(
    bookingId: string,
    actor: OperationsActorContext,
    reason?: string
  ): Promise<void> {
    // 1. Cancel Hotel Reservations (only non-cancelled ones)
    const activeReservations = await HotelReservationModel.find({
      bookingId,
      status: { $ne: 'CANCELLED' },
    });

    for (const res of activeReservations) {
      await HotelReservationModel.findByIdAndUpdate(res._id, {
        $set: {
          status: 'CANCELLED',
          supplierCancellation: {
            status: 'PENDING_SUPPLIER_ACKNOWLEDGEMENT',
            requestedAt: new Date(),
            requestedBy: new mongoose.Types.ObjectId(actor.userId),
            reason: reason || 'Booking cancelled',
          },
        },
      });

      await auditLogRepository.record({
        actorType: 'USER',
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'HOTEL_RESERVATION_CANCELLED' as any,
        entityType: 'HOTEL_RESERVATION' as any,
        entityId: res._id.toString(),
        notes: `Reservation cancelled due to booking cancellation: ${reason || 'N/A'}`,
      });
    }

    // 2. Cancel Transport Assignments & release schedule locks (only active non-completed, non-cancelled)
    const activeAssignments = await TransportAssignmentModel.find({
      bookingId,
      status: { $in: ['UNASSIGNED', 'ASSIGNED', 'DISPATCHED', 'IN_TRANSIT'] },
    });

    for (const assign of activeAssignments) {
      const updated = await TransportAssignmentModel.findOneAndUpdate(
        {
          _id: assign._id,
          status: { $in: ['UNASSIGNED', 'ASSIGNED', 'DISPATCHED', 'IN_TRANSIT'] },
        },
        {
          $set: {
            status: 'CANCELLED',
            supplierCancellation: {
              status: 'PENDING_SUPPLIER_ACKNOWLEDGEMENT',
              requestedAt: new Date(),
              requestedBy: new mongoose.Types.ObjectId(actor.userId),
              reason: reason || 'Booking cancelled',
            },
          },
        },
        { new: true }
      );

      if (updated) {
        // Release schedule locks owned by the assignment's committed activeLockIntentId
        await transportScheduleLockRepository.releaseLocksForAssignment(
          assign._id.toString(),
          updated.activeLockIntentId
        );

        await auditLogRepository.record({
          actorType: 'USER',
          actorId: actor.userId,
          actorRole: actor.role,
          action: 'TRANSPORT_ASSIGNMENT_CANCELLED' as any,
          entityType: 'TRANSPORT_ASSIGNMENT' as any,
          entityId: assign._id.toString(),
          notes: `Transport assignment cancelled due to booking cancellation: ${reason || 'N/A'}`,
        });
      }
    }

    // 3. Reset aggregate booking flags
    await BookingModel.findByIdAndUpdate(bookingId, {
      $set: {
        hotelVoucherGenerated: false,
        driverDutySlipGenerated: false,
      },
    });
  }

  /**
   * Completes transport assignment and releases schedule locks only after successful transition.
   */
  async completeTransportAssignment(
    id: string,
    actor: OperationsActorContext,
    expectedLockIntentId?: string
  ): Promise<TransportAssignmentDto> {
    if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can complete transport assignments', ErrorCodes.FORBIDDEN);
    }

    const queryFilter: Record<string, any> = {
      _id: id,
      status: { $in: ['DISPATCHED', 'IN_TRANSIT'] },
    };
    if (expectedLockIntentId) {
      queryFilter.activeLockIntentId = expectedLockIntentId;
    }

    // Atomic CAS transition: only dispatched or in-transit assignments matching expected intent can transition to COMPLETED
    const updated = await TransportAssignmentModel.findOneAndUpdate(
      queryFilter,
      {
        $set: {
          status: 'COMPLETED',
        },
      },
      { new: true }
    )
      .populate('assignedVehicleId')
      .populate('assignedDriverId')
      .populate('assignedVendorId');

    if (!updated) {
      throw AppError.badRequest(
        'Cannot complete transport assignment: Assignment is not in an active operational state or lock intent has changed'
      );
    }

    // Atomic write boundary: verify parent booking is not cancelled
    const activeBooking = await BookingModel.findOne({
      _id: updated.bookingId,
      status: { $in: ['CONFIRMED', 'OPERATIONAL_PREPARATION', 'IN_TRIP', 'COMPLETED'] },
    });

    if (!activeBooking) {
      // Race: Parent booking was cancelled concurrently during completion
      await TransportAssignmentModel.findByIdAndUpdate(id, {
        $set: {
          status: 'CANCELLED',
          supplierCancellation: {
            status: 'PENDING_SUPPLIER_ACKNOWLEDGEMENT',
            requestedAt: new Date(),
            requestedBy: new mongoose.Types.ObjectId(actor.userId),
            reason: 'Parent booking was cancelled concurrently during completion',
          },
        },
      });
      await transportScheduleLockRepository.releaseLocksForAssignment(id, updated.activeLockIntentId);
      throw AppError.conflict('Cannot complete transport assignment: Parent booking was cancelled concurrently');
    }

    // Only AFTER the COMPLETED transition succeeds, release the schedule locks
    await transportScheduleLockRepository.releaseLocksForAssignment(id, updated.activeLockIntentId);

    await auditLogRepository.record({
      actorType: 'USER',
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'TRANSPORT_ASSIGNMENT_COMPLETED' as any,
      entityType: 'TRANSPORT_ASSIGNMENT' as any,
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      notes: `Transport assignment completed for booking ${updated.bookingNumber}`,
    });

    return updated.toDto();
  }
}

export const operationsService = new OperationsService();
