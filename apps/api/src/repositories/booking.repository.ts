import { BookingStatus } from '@chirag/types';
import {
  BookingModel,
  IBookingDocument,
  ACTIVE_BOOKING_STATUSES,
} from '../models/booking.model';

export interface FindBookingsFilter {
  assignedAgentId?: string;
  customerId?: string;
  leadId?: string;
  destinationId?: string;
  status?: BookingStatus | string | BookingStatus[];
  search?: string;
  startDate?: Date;
  endDate?: Date;
  skip?: number;
  limit?: number;
}

export class BookingRepository {
  async findById(id: string): Promise<IBookingDocument | null> {
    return BookingModel.findById(id)
      .populate('customerId')
      .populate('destinationId')
      .populate('leadId')
      .populate('assignedAgentId', 'fullName email')
      .populate('assignedDriverId', 'fullName phone')
      .populate('assignedVehicleId', 'model registrationNumber')
      .exec();
  }

  async findByBookingNumber(bookingNumber: string): Promise<IBookingDocument | null> {
    return BookingModel.findOne({ bookingNumber })
      .populate('customerId')
      .populate('destinationId')
      .populate('leadId')
      .populate('assignedAgentId', 'fullName email')
      .exec();
  }

  async findActiveByQuotationId(quotationId: string): Promise<IBookingDocument | null> {
    return BookingModel.findOne({
      quotationId,
      status: { $in: ACTIVE_BOOKING_STATUSES },
    })
      .populate('customerId')
      .populate('destinationId')
      .populate('assignedAgentId', 'fullName email')
      .exec();
  }

  async findMany(filter: FindBookingsFilter = {}): Promise<{
    bookings: IBookingDocument[];
    total: number;
  }> {
    const query: Record<string, unknown> = {};

    if (filter.assignedAgentId) {
      query.assignedAgentId = filter.assignedAgentId;
    }

    if (filter.customerId) {
      query.customerId = filter.customerId;
    }

    if (filter.leadId) {
      query.leadId = filter.leadId;
    }

    if (filter.destinationId) {
      query.destinationId = filter.destinationId;
    }

    if (filter.status) {
      if (typeof filter.status === 'string' && filter.status.includes(',')) {
        const statuses = filter.status.split(',').map((s) => s.trim()).filter(Boolean);
        query.status = { $in: statuses };
      } else if (Array.isArray(filter.status)) {
        query.status = { $in: filter.status };
      } else {
        query.status = filter.status;
      }
    }

    if (filter.startDate || filter.endDate) {
      query.travelStartDate = {};
      if (filter.startDate) {
        (query.travelStartDate as Record<string, unknown>).$gte = filter.startDate;
      }
      if (filter.endDate) {
        (query.travelStartDate as Record<string, unknown>).$lte = filter.endDate;
      }
    }

    if (filter.search) {
      query.bookingNumber = { $regex: filter.search.trim(), $options: 'i' };
    }

    const skip = filter.skip || 0;
    const limit = filter.limit || 50;

    const [bookings, total] = await Promise.all([
      BookingModel.find(query)
        .populate('customerId')
        .populate('destinationId')
        .populate('assignedAgentId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      BookingModel.countDocuments(query).exec(),
    ]);

    return { bookings, total };
  }

  async create(data: Partial<IBookingDocument>): Promise<IBookingDocument> {
    const booking = new BookingModel(data);
    await booking.save();
    return this.findById(booking._id.toString()) as Promise<IBookingDocument>;
  }

  async update(id: string, data: Partial<IBookingDocument>): Promise<IBookingDocument | null> {
    await BookingModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).exec();
    return this.findById(id);
  }

  async updateFinancials(
    id: string,
    financials: {
      totalPaid: number;
      totalPaidInPaise: number;
      balancePending: number;
      balancePendingInPaise: number;
      excessPaid?: number;
      excessPaidInPaise?: number;
    }
  ): Promise<IBookingDocument | null> {
    await BookingModel.findByIdAndUpdate(
      id,
      {
        $set: {
          'financials.totalPaid': financials.totalPaid,
          'financials.totalPaidInPaise': financials.totalPaidInPaise,
          'financials.balancePending': financials.balancePending,
          'financials.balancePendingInPaise': financials.balancePendingInPaise,
          'financials.excessPaid': financials.excessPaid ?? 0,
          'financials.excessPaidInPaise': financials.excessPaidInPaise ?? 0,
        },
      },
      { new: true, runValidators: true }
    ).exec();
    return this.findById(id);
  }

  async countBookingMetrics(assignedAgentId?: string): Promise<{
    quoteAccepted: number;
    pendingConfirmation: number;
    confirmed: number;
    operationalPreparation: number;
    inTrip: number;
    completed: number;
    cancelled: number;
    total: number;
  }> {
    const match: Record<string, unknown> = {};
    if (assignedAgentId) {
      match.assignedAgentId = assignedAgentId;
    }

    const [
      quoteAccepted,
      pendingConfirmation,
      confirmed,
      operationalPreparation,
      inTrip,
      completed,
      cancelled,
    ] = await Promise.all([
      BookingModel.countDocuments({ ...match, status: 'QUOTE_ACCEPTED' }),
      BookingModel.countDocuments({ ...match, status: 'PENDING_CONFIRMATION' }),
      BookingModel.countDocuments({ ...match, status: 'CONFIRMED' }),
      BookingModel.countDocuments({ ...match, status: 'OPERATIONAL_PREPARATION' }),
      BookingModel.countDocuments({ ...match, status: 'IN_TRIP' }),
      BookingModel.countDocuments({ ...match, status: 'COMPLETED' }),
      BookingModel.countDocuments({ ...match, status: 'CANCELLED' }),
    ]);

    return {
      quoteAccepted,
      pendingConfirmation,
      confirmed,
      operationalPreparation,
      inTrip,
      completed,
      cancelled,
      total:
        quoteAccepted +
        pendingConfirmation +
        confirmed +
        operationalPreparation +
        inTrip +
        completed +
        cancelled,
    };
  }
}

export const bookingRepository = new BookingRepository();
