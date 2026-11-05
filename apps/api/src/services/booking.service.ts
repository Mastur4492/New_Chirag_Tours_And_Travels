import { BookingDto, BookingStatus, UserRole } from '@chirag/types';
import mongoose from 'mongoose';
import { bookingRepository, FindBookingsFilter } from '../repositories/booking.repository';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { AppError } from '../utils/appError';
import { ErrorCodes } from '../constants/errorCodes';
import { logger } from '../utils/logger';
import { operationsService } from './operations.service';
import { realtimeService } from './realtime.service';

export interface BookingActorContext {
  userId: string;
  role: UserRole;
  ipAddress?: string;
  userAgent?: string;
}

export interface UpdateBookingStatusInput {
  status: BookingStatus;
  cancellationReason?: string;
  cancellationFee?: number;
  notes?: string;
}

export class BookingService {
  /**
   * Lists bookings with pagination, search, status filtering, and agent scoping.
   */
  async listBookings(
    filter: {
      status?: BookingStatus | string;
      search?: string;
      destinationId?: string;
      page?: number;
      limit?: number;
    },
    actor: BookingActorContext
  ): Promise<{
    bookings: BookingDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const repoFilter: FindBookingsFilter = {
      status: filter.status,
      search: filter.search,
      destinationId: filter.destinationId,
      skip,
      limit,
    };

    // Agent scoping: Agents can only see bookings assigned to them
    if (actor.role === 'AGENT') {
      repoFilter.assignedAgentId = actor.userId;
    } else if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Insufficient permissions to list bookings', ErrorCodes.FORBIDDEN);
    }

    const { bookings, total } = await bookingRepository.findMany(repoFilter);

    return {
      bookings: bookings.map((b) => b.toDto(actor.role)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves full details for a single booking with authorization check.
   */
  async getBookingById(
    bookingId: string,
    actor: BookingActorContext
  ): Promise<BookingDto> {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw AppError.badRequest('Invalid booking ID format', ErrorCodes.VALIDATION_ERROR);
    }

    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw AppError.notFound(`Booking with ID '${bookingId}' was not found`);
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
      throw AppError.forbidden('Insufficient permissions to view booking details', ErrorCodes.FORBIDDEN);
    }

    return booking.toDto(actor.role);
  }

  /**
   * Aggregates booking status metrics.
   */
  async getBookingMetrics(actor: BookingActorContext) {
    if (actor.role !== 'ADMIN' && actor.role !== 'AGENT') {
      throw AppError.forbidden('Insufficient permissions to view booking metrics', ErrorCodes.FORBIDDEN);
    }

    const agentFilter = actor.role === 'AGENT' ? actor.userId : undefined;
    const counts = await bookingRepository.countBookingMetrics(agentFilter);

    return counts;
  }

  /**
   * Updates booking status (ADMIN only).
   * Note: Business confirmation is strictly decoupled from payment verification.
   */
  async updateBookingStatus(
    bookingId: string,
    input: UpdateBookingStatusInput,
    actor: BookingActorContext
  ): Promise<BookingDto> {
    if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can update booking statuses', ErrorCodes.FORBIDDEN);
    }

    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw AppError.notFound(`Booking with ID '${bookingId}' was not found`);
    }

    const previousStatus = booking.status;
    const updateData: Record<string, unknown> = {
      status: input.status,
    };

    if (input.status === 'CONFIRMED') {
      updateData.confirmedBy = new mongoose.Types.ObjectId(actor.userId);
      updateData.confirmedAt = new Date();
    } else if (input.status === 'CANCELLED') {
      if (!input.cancellationReason || !input.cancellationReason.trim()) {
        throw AppError.badRequest('Cancellation reason is required when cancelling a booking', ErrorCodes.VALIDATION_ERROR);
      }
      updateData.cancelledBy = new mongoose.Types.ObjectId(actor.userId);
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = input.cancellationReason.trim();
      if (input.cancellationFee !== undefined) {
        updateData.cancellationFee = input.cancellationFee;
        updateData.cancellationFeeInPaise = Math.round(input.cancellationFee * 100);
      }
    }

    if (input.notes) {
      updateData.internalNotes = input.notes.trim();
    }

    const updated = await bookingRepository.update(bookingId, updateData as any);
    if (!updated) {
      throw AppError.internal('Failed to update booking status');
    }

    // Cascade cancellation to operational records (hotel holds, transport locks)
    if (input.status === 'CANCELLED') {
      try {
        await operationsService.cancelOperationalRecordsForBooking(
          bookingId,
          actor,
          input.cancellationReason
        );
      } catch (err: any) {
        logger.error(`Failed to cascade cancellation to operations for ${bookingId}: ${err.message}`);
      }
    }

    // Audit log
    await auditLogRepository.record({
      actorType: 'USER',
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'BOOKING_STATUS_UPDATED' as any,
      entityType: 'BOOKING' as any,
      entityId: bookingId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: { status: previousStatus },
      newState: { status: input.status, cancellationReason: input.cancellationReason },
      notes: input.notes,
    });

    logger.info(
      `Booking [${booking.bookingNumber}] status updated: ${previousStatus} -> ${input.status} by ${actor.userId}`
    );

    const dto = updated.toDto(actor.role);
    realtimeService.broadcast({
      type: 'BOOKING_UPDATE',
      scopeId: bookingId,
      title: 'Booking Status Updated',
      message: `Booking #${booking.bookingNumber} updated to ${input.status}`,
      data: {
        action: 'STATUS_UPDATED',
        bookingId,
        bookingNumber: booking.bookingNumber,
        status: input.status,
      },
    });
    return dto;
  }
}

export const bookingService = new BookingService();
