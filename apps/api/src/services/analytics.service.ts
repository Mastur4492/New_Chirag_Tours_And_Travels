import mongoose from 'mongoose';
import {
  AnalyticsDateBasis,
  AnalyticsDateRangeOption,
  DashboardSummaryDto,
  FinancialTrendPointDto,
  FinancialTrendsDto,
  TopDestinationAnalyticsDto,
  TopDestinationsResponseDto,
  UserRole,
} from '@chirag/types';
import { BookingModel, ACTIVE_BOOKING_STATUSES } from '../models/booking.model';
import { PaymentRecordModel } from '../models/paymentRecord.model';
import { QuotationModel } from '../models/quotation.model';
import { LeadModel } from '../models/lead.model';
import { bookingRepository } from '../repositories/booking.repository';
import { leadRepository } from '../repositories/lead.repository';
import {
  DashboardSummaryQuery,
  FinancialTrendsQuery,
  TopDestinationsQuery,
} from '@chirag/validation';

export interface AnalyticsActorContext {
  userId: string;
  role: UserRole;
  ipAddress?: string;
  userAgent?: string;
}

export interface ResolvedDateInterval {
  startDate?: Date;
  endDate?: Date;
  option: AnalyticsDateRangeOption;
  dateBasis: AnalyticsDateBasis;
}

export class AnalyticsService {
  /**
   * Resolves date bounds strictly enforcing UTC calendar and Indian Financial Year boundaries.
   */
  resolveDateInterval(
    query: {
      range?: AnalyticsDateRangeOption;
      startDate?: string;
      endDate?: string;
      dateBasis?: AnalyticsDateBasis;
    },
    now: Date = new Date()
  ): ResolvedDateInterval {
    const option: AnalyticsDateRangeOption = query.range || '30d';
    const dateBasis: AnalyticsDateBasis = query.dateBasis || 'bookingDate';

    if (option === 'all') {
      return { option, dateBasis };
    }

    if (option === 'custom' && query.startDate && query.endDate) {
      const [sY, sM, sD] = query.startDate.split('-').map(Number);
      const [eY, eM, eD] = query.endDate.split('-').map(Number);
      const startDate = new Date(Date.UTC(sY!, sM! - 1, sD!, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(eY!, eM! - 1, eD!, 23, 59, 59, 999));
      return { startDate, endDate, option, dateBasis };
    }

    if (option === 'ytd') {
      // Indian Financial Year: April 1st to March 31st
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth(); // 0 = Jan, 3 = April
      const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
      const startDate = new Date(Date.UTC(fyStartYear, 3, 1, 0, 0, 0, 0));
      const endDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
      );
      return { startDate, endDate, option, dateBasis };
    }

    if (option === '90d') {
      const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(now);
      endDate.setUTCHours(23, 59, 59, 999);
      return { startDate, endDate, option, dateBasis };
    }

    // Default '30d'
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setUTCHours(23, 59, 59, 999);
    return { startDate, endDate, option: '30d', dateBasis };
  }

  /**
   * Generates a comprehensive dashboard summary with scalable database aggregations.
   */
  async getDashboardSummary(
    query: DashboardSummaryQuery,
    actor: AnalyticsActorContext
  ): Promise<DashboardSummaryDto> {
    const { startDate, endDate, option, dateBasis } = this.resolveDateInterval(query);
    const dateField = dateBasis === 'travelDate' ? 'travelStartDate' : 'createdAt';

    // Agent scoping filter
    const agentFilter = actor.role === 'AGENT' ? actor.userId : undefined;

    // 1. Build Booking Match Filter
    const bookingMatch: Record<string, unknown> = {};
    if (agentFilter) {
      bookingMatch.assignedAgentId = new mongoose.Types.ObjectId(agentFilter);
    }
    if (startDate || endDate) {
      bookingMatch[dateField] = {
        ...(startDate && { $gte: startDate }),
        ...(endDate && { $lte: endDate }),
      };
    }

    // 2. Fetch and aggregate bookings for the date range
    const bookings = await BookingModel.find(bookingMatch).select(
      'status financials cancellationFee cancellationFeeInPaise createdAt travelStartDate'
    ).lean();

    let contractedBookingValueInPaise = 0;
    let activeBookingsCount = 0;
    let confirmedBookingsCount = 0;
    let cancelledBookingsCount = 0;
    let outstandingReceivablesInPaise = 0;
    let customerCreditsInPaise = 0;

    for (const b of bookings) {
      const isCancelled = b.status === 'CANCELLED';
      const fin = b.financials || { totalAmountInPaise: 0, totalPaidInPaise: 0 };
      const totalAmountPaise = fin.totalAmountInPaise || 0;
      const totalPaidPaise = fin.totalPaidInPaise || 0;

      if (!isCancelled) {
        activeBookingsCount++;
        contractedBookingValueInPaise += totalAmountPaise;

        if (
          b.status === 'CONFIRMED' ||
          b.status === 'OPERATIONAL_PREPARATION' ||
          b.status === 'IN_TRIP' ||
          b.status === 'COMPLETED'
        ) {
          confirmedBookingsCount++;
        }

        // Ledger balance evaluation:
        if (totalPaidPaise < totalAmountPaise) {
          outstandingReceivablesInPaise += totalAmountPaise - totalPaidPaise;
        } else if (totalPaidPaise > totalAmountPaise) {
          // Customer Overpayment / Credit: keep strictly neutral
          customerCreditsInPaise += totalPaidPaise - totalAmountPaise;
        }
      } else {
        cancelledBookingsCount++;
        const feePaise = b.cancellationFeeInPaise || (b.cancellationFee ? Math.round(b.cancellationFee * 100) : 0);
        if (feePaise > 0) {
          contractedBookingValueInPaise += feePaise;
        }

        // For cancelled bookings, receivable is fee minus paid
        if (totalPaidPaise < feePaise) {
          outstandingReceivablesInPaise += feePaise - totalPaidPaise;
        } else if (totalPaidPaise > feePaise) {
          customerCreditsInPaise += totalPaidPaise - feePaise;
        }
      }
    }

    // 3. Verified Cash Collected in date range
    // Match payments verified strictly within the date range
    const paymentMatch: Record<string, unknown> = {
      status: 'VERIFIED',
    };
    if (startDate || endDate) {
      paymentMatch.verifiedAt = {
        ...(startDate && { $gte: startDate }),
        ...(endDate && { $lte: endDate }),
      };
    }

    // If agent role, restrict to payments belonging to agent's bookings
    if (agentFilter) {
      const agentBookingIds = await BookingModel.find({ assignedAgentId: agentFilter }).distinct('_id');
      paymentMatch.bookingId = { $in: agentBookingIds };
    }

    const verifiedPayments = await PaymentRecordModel.find(paymentMatch).select(
      'amountInPaise isRefund status'
    ).lean();

    let verifiedCreditsInPaise = 0;
    let verifiedDebitsInPaise = 0;

    for (const p of verifiedPayments) {
      if (p.isRefund) {
        verifiedDebitsInPaise += p.amountInPaise || 0;
      } else {
        verifiedCreditsInPaise += p.amountInPaise || 0;
      }
    }

    const verifiedCashCollectedInPaise = Math.max(0, verifiedCreditsInPaise - verifiedDebitsInPaise);

    // 4. Quotations Count & Quoted Pipeline Value
    const quoteMatch: Record<string, unknown> = {};
    if (agentFilter) {
      quoteMatch.assignedAgentId = new mongoose.Types.ObjectId(agentFilter);
    }
    if (startDate || endDate) {
      quoteMatch.createdAt = {
        ...(startDate && { $gte: startDate }),
        ...(endDate && { $lte: endDate }),
      };
    }

    const quotes = await QuotationModel.find(quoteMatch).select(
      'status pricingSummary.finalSellingPrice'
    ).lean();

    const totalQuotationsCount = quotes.length;
    let totalQuotedPipelineValue = 0;
    for (const q of quotes) {
      totalQuotedPipelineValue += q.pricingSummary?.finalSellingPrice || 0;
    }

    // 5. Booking Status Metrics (reuse repository count)
    const rawBookingCounts = await bookingRepository.countBookingMetrics(agentFilter);
    const bookingMetrics = {
      quoteAccepted: rawBookingCounts.quoteAccepted,
      pendingConfirmation: rawBookingCounts.pendingConfirmation,
      confirmed: rawBookingCounts.confirmed,
      operationalPreparation: rawBookingCounts.operationalPreparation,
      inTrip: rawBookingCounts.inTrip,
      completed: rawBookingCounts.completed,
      cancelled: rawBookingCounts.cancelled,
      total: rawBookingCounts.total,
    };

    // 6. Lead Status Metrics (reuse repository count)
    const rawLeadCounts = await leadRepository.countByStatus(agentFilter);
    const totalLeadsCount = Object.values(rawLeadCounts).reduce((acc, count) => acc + count, 0);
    const leadMetrics = {
      ...rawLeadCounts,
      total: totalLeadsCount,
    };

    // 7. Lead Funnel Calculations (Safe unique relationships)
    // Stage 1: Unique Inquiries in Date Range (excluding JUNK)
    const leadFunnelMatch: Record<string, unknown> = {
      status: { $ne: 'JUNK' },
    };
    if (agentFilter) {
      leadFunnelMatch.assignedAgentId = new mongoose.Types.ObjectId(agentFilter);
    }
    if (startDate || endDate) {
      leadFunnelMatch.createdAt = {
        ...(startDate && { $gte: startDate }),
        ...(endDate && { $lte: endDate }),
      };
    }

    const eligibleLeads = await LeadModel.find(leadFunnelMatch).select('_id').lean();
    const eligibleLeadIds = eligibleLeads.map((l) => l._id.toString());
    const inquiries = eligibleLeadIds.length;

    // Stage 2: Proposals Issued (Unique leads with a quote in range, or linked to eligible leads)
    const quotedLeadIds = await QuotationModel.find({
      leadId: { $in: eligibleLeadIds },
      status: { $in: ['ISSUED', 'SENT', 'APPROVED', 'ACCEPTED', 'REVISED'] },
    }).distinct('leadId');
    const allBookingLeadIds = await BookingModel.find({
      leadId: { $in: eligibleLeadIds },
    }).distinct('leadId');

    const uniqueProposalsLeadIds = new Set([
      ...quotedLeadIds.map(String),
      ...allBookingLeadIds.map(String),
    ]);
    const proposalsIssued = Math.min(inquiries, uniqueProposalsLeadIds.size);

    // Stage 3: Customer Accepted (Unique leads with accepted quote or booking)
    const acceptedQuoteLeadIds = await QuotationModel.find({
      leadId: { $in: eligibleLeadIds },
      status: 'ACCEPTED',
    }).distinct('leadId');

    const uniqueAcceptedLeadIds = new Set([
      ...acceptedQuoteLeadIds.map(String),
      ...allBookingLeadIds.map(String),
    ]);
    const customerAccepted = Math.min(proposalsIssued, uniqueAcceptedLeadIds.size);

    // Stage 4: Confirmed Bookings (Unique leads that reached CONFIRMED or later stages:
    // CONFIRMED, OPERATIONAL_PREPARATION, IN_TRIP, COMPLETED.
    // Excludes unconfirmed active bookings like QUOTE_ACCEPTED and PENDING_CONFIRMATION, as well as CANCELLED).
    const confirmedLeadIds = await BookingModel.find({
      leadId: { $in: eligibleLeadIds },
      status: { $in: ['CONFIRMED', 'OPERATIONAL_PREPARATION', 'IN_TRIP', 'COMPLETED'] },
    }).distinct('leadId');
    const confirmedBookings = Math.min(customerAccepted, confirmedLeadIds.length);

    const conversionRateLeadToQuote = inquiries > 0 ? Math.round((proposalsIssued / inquiries) * 1000) / 10 : 0;
    const conversionRateQuoteToAccept = proposalsIssued > 0 ? Math.round((customerAccepted / proposalsIssued) * 1000) / 10 : 0;
    const conversionRateAcceptToConfirm = customerAccepted > 0 ? Math.round((confirmedBookings / customerAccepted) * 1000) / 10 : 0;
    const overallWinRate = inquiries > 0 ? Math.round((confirmedBookings / inquiries) * 1000) / 10 : 0;

    return {
      dateRange: {
        option,
        startDate: startDate ? startDate.toISOString().split('T')[0] : undefined,
        endDate: endDate ? endDate.toISOString().split('T')[0] : undefined,
        dateBasis,
      },
      contractedBookingValue: Math.round(contractedBookingValueInPaise / 100),
      contractedBookingValueInPaise,
      verifiedCashCollected: Math.round(verifiedCashCollectedInPaise / 100),
      verifiedCashCollectedInPaise,
      outstandingReceivables: Math.round(outstandingReceivablesInPaise / 100),
      outstandingReceivablesInPaise,
      customerCreditsAmount: Math.round(customerCreditsInPaise / 100),
      customerCreditsInPaise,
      activeBookingsCount,
      confirmedBookingsCount,
      cancelledBookingsCount,
      totalQuotationsCount,
      totalQuotedPipelineValue: Math.round(totalQuotedPipelineValue),
      totalLeadsCount,
      bookingMetrics,
      leadMetrics,
      funnel: {
        inquiries,
        proposalsIssued,
        customerAccepted,
        confirmedBookings,
        conversionRateLeadToQuote,
        conversionRateQuoteToAccept,
        conversionRateAcceptToConfirm,
        overallWinRate,
      },
    };
  }

  /**
   * Generates time-series financial trends comparing Contracted Booking Value vs Verified Cash Collected.
   */
  async getFinancialTrends(
    query: FinancialTrendsQuery,
    actor: AnalyticsActorContext
  ): Promise<FinancialTrendsDto> {
    const { startDate, endDate, option, dateBasis } = this.resolveDateInterval(query);
    const dateField = dateBasis === 'travelDate' ? 'travelStartDate' : 'createdAt';
    const agentFilter = actor.role === 'AGENT' ? actor.userId : undefined;

    // Determine interval: day for 30d, month for ytd/all, or query override
    let interval: 'day' | 'week' | 'month' = query.interval || 'day';
    if (!query.interval) {
      if (option === '30d') interval = 'day';
      else if (option === '90d') interval = 'week';
      else interval = 'month';
    }

    // 1. Group bookings by period
    const bookingMatch: Record<string, unknown> = {
      status: { $in: ACTIVE_BOOKING_STATUSES },
    };
    if (agentFilter) {
      bookingMatch.assignedAgentId = new mongoose.Types.ObjectId(agentFilter);
    }
    if (startDate || endDate) {
      bookingMatch[dateField] = {
        ...(startDate && { $gte: startDate }),
        ...(endDate && { $lte: endDate }),
      };
    }

    const bookings = await BookingModel.find(bookingMatch).select(
      `financials.totalAmountInPaise ${dateField}`
    ).lean();

    // 2. Group verified payments by period
    const paymentMatch: Record<string, unknown> = {
      status: 'VERIFIED',
    };
    if (startDate || endDate) {
      paymentMatch.verifiedAt = {
        ...(startDate && { $gte: startDate }),
        ...(endDate && { $lte: endDate }),
      };
    }
    if (agentFilter) {
      const agentBookingIds = await BookingModel.find({ assignedAgentId: agentFilter }).distinct('_id');
      paymentMatch.bookingId = { $in: agentBookingIds };
    }

    const payments = await PaymentRecordModel.find(paymentMatch).select(
      'amountInPaise isRefund verifiedAt paymentDate'
    ).lean();

    // Helper to format date to bucket key
    const getBucketKey = (d: Date): { key: string; label: string } => {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');

      if (interval === 'day') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return {
          key: `${year}-${month}-${day}`,
          label: `${day} ${months[d.getUTCMonth()]}`,
        };
      } else if (interval === 'week') {
        // Calculate ISO week
        const target = new Date(d.valueOf());
        const dayNr = (d.getUTCDay() + 6) % 7;
        target.setUTCDate(target.getUTCDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setUTCMonth(0, 1);
        if (target.getUTCDay() !== 4) {
          target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
        }
        const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
        return {
          key: `${year}-W${String(weekNum).padStart(2, '0')}`,
          label: `W${weekNum} ${year}`,
        };
      } else {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return {
          key: `${year}-${month}`,
          label: `${months[d.getUTCMonth()]} ${year}`,
        };
      }
    };

    // Aggregate into a Map
    const bucketMap = new Map<string, FinancialTrendPointDto>();

    // Process bookings
    for (const b of bookings) {
      const d = (b as any)[dateField] ? new Date((b as any)[dateField]) : new Date();
      const { key, label } = getBucketKey(d);
      const fin = b.financials || { totalAmountInPaise: 0 };
      const valPaise = fin.totalAmountInPaise || 0;

      const entry = bucketMap.get(key) || {
        period: key,
        periodLabel: label,
        contractedBookingValue: 0,
        contractedBookingValueInPaise: 0,
        verifiedCashCollected: 0,
        verifiedCashCollectedInPaise: 0,
        verifiedRefunds: 0,
        verifiedRefundsInPaise: 0,
        netCashFlow: 0,
        netCashFlowInPaise: 0,
        bookingsCount: 0,
        paymentsCount: 0,
      };

      entry.contractedBookingValueInPaise += valPaise;
      entry.contractedBookingValue = Math.round(entry.contractedBookingValueInPaise / 100);
      entry.bookingsCount++;
      bucketMap.set(key, entry);
    }

    // Process payments
    for (const p of payments) {
      const d = p.verifiedAt ? new Date(p.verifiedAt) : p.paymentDate ? new Date(p.paymentDate) : new Date();
      const { key, label } = getBucketKey(d);
      const amountPaise = p.amountInPaise || 0;

      const entry = bucketMap.get(key) || {
        period: key,
        periodLabel: label,
        contractedBookingValue: 0,
        contractedBookingValueInPaise: 0,
        verifiedCashCollected: 0,
        verifiedCashCollectedInPaise: 0,
        verifiedRefunds: 0,
        verifiedRefundsInPaise: 0,
        netCashFlow: 0,
        netCashFlowInPaise: 0,
        bookingsCount: 0,
        paymentsCount: 0,
      };

      if (p.isRefund) {
        entry.verifiedRefundsInPaise += amountPaise;
        entry.verifiedRefunds = Math.round(entry.verifiedRefundsInPaise / 100);
      } else {
        entry.verifiedCashCollectedInPaise += amountPaise;
        entry.verifiedCashCollected = Math.round(entry.verifiedCashCollectedInPaise / 100);
      }

      entry.netCashFlowInPaise = entry.verifiedCashCollectedInPaise - entry.verifiedRefundsInPaise;
      entry.netCashFlow = Math.round(entry.netCashFlowInPaise / 100);
      entry.paymentsCount++;
      bucketMap.set(key, entry);
    }

    // Sort chronologically by period key
    const points = Array.from(bucketMap.values()).sort((a, b) => a.period.localeCompare(b.period));

    // Calculate totals
    const totals = points.reduce(
      (acc, p) => {
        acc.contractedBookingValueInPaise += p.contractedBookingValueInPaise;
        acc.verifiedCashCollectedInPaise += p.verifiedCashCollectedInPaise;
        acc.verifiedRefundsInPaise += p.verifiedRefundsInPaise;
        acc.netCashFlowInPaise += p.netCashFlowInPaise;
        acc.bookingsCount += p.bookingsCount;
        acc.paymentsCount += p.paymentsCount;
        return acc;
      },
      {
        contractedBookingValue: 0,
        contractedBookingValueInPaise: 0,
        verifiedCashCollected: 0,
        verifiedCashCollectedInPaise: 0,
        verifiedRefunds: 0,
        verifiedRefundsInPaise: 0,
        netCashFlow: 0,
        netCashFlowInPaise: 0,
        bookingsCount: 0,
        paymentsCount: 0,
      }
    );

    totals.contractedBookingValue = Math.round(totals.contractedBookingValueInPaise / 100);
    totals.verifiedCashCollected = Math.round(totals.verifiedCashCollectedInPaise / 100);
    totals.verifiedRefunds = Math.round(totals.verifiedRefundsInPaise / 100);
    totals.netCashFlow = Math.round(totals.netCashFlowInPaise / 100);

    return {
      interval,
      dateBasis,
      points,
      totals,
    };
  }

  /**
   * Generates top destinations ranking by booking volume and contracted revenue using database records.
   */
  async getTopDestinations(
    query: TopDestinationsQuery,
    actor: AnalyticsActorContext
  ): Promise<TopDestinationsResponseDto> {
    const { startDate, endDate, dateBasis } = this.resolveDateInterval(query);
    const dateField = dateBasis === 'travelDate' ? 'travelStartDate' : 'createdAt';
    const agentFilter = actor.role === 'AGENT' ? actor.userId : undefined;
    const limit = query.limit || 10;

    const match: Record<string, unknown> = {
      status: { $in: ACTIVE_BOOKING_STATUSES },
    };
    if (agentFilter) {
      match.assignedAgentId = new mongoose.Types.ObjectId(agentFilter);
    }
    if (startDate || endDate) {
      match[dateField] = {
        ...(startDate && { $gte: startDate }),
        ...(endDate && { $lte: endDate }),
      };
    }

    const aggregation = await BookingModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$destinationId',
          bookingCount: { $sum: 1 },
          contractedValueInPaise: { $sum: '$financials.totalAmountInPaise' },
          verifiedPaidValueInPaise: { $sum: '$financials.totalPaidInPaise' },
        },
      },
      { $sort: { contractedValueInPaise: -1, bookingCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'destinations',
          localField: '_id',
          foreignField: '_id',
          as: 'destination',
        },
      },
      { $unwind: { path: '$destination', preserveNullAndEmptyArrays: true } },
    ]).exec();

    let totalActiveBookingsEvaluated = 0;
    let totalContractedValueEvaluated = 0;

    const destinations: TopDestinationAnalyticsDto[] = aggregation.map((item) => {
      const contractedValueInPaise = item.contractedValueInPaise || 0;
      const verifiedPaidValueInPaise = item.verifiedPaidValueInPaise || 0;
      const contractedValue = Math.round(contractedValueInPaise / 100);
      const verifiedPaidValue = Math.round(verifiedPaidValueInPaise / 100);
      const bookingCount = item.bookingCount || 0;
      const averageBookingValue = bookingCount > 0 ? Math.round(contractedValue / bookingCount) : 0;

      totalActiveBookingsEvaluated += bookingCount;
      totalContractedValueEvaluated += contractedValue;

      return {
        destinationId: item._id ? item._id.toString() : 'unknown',
        destinationName: item.destination?.name || 'Custom Destination',
        state: item.destination?.state,
        country: item.destination?.country,
        bookingCount,
        contractedValue,
        contractedValueInPaise,
        verifiedPaidValue,
        verifiedPaidValueInPaise,
        averageBookingValue,
      };
    });

    return {
      destinations,
      totalActiveBookingsEvaluated,
      totalContractedValueEvaluated,
    };
  }
}

export const analyticsService = new AnalyticsService();
