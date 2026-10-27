import { LeadStatus } from './lead';

export type AnalyticsDateRangeOption = '30d' | '90d' | 'ytd' | 'all' | 'custom';
export type AnalyticsDateBasis = 'bookingDate' | 'travelDate';

export interface FunnelMetricsDto {
  inquiries: number;
  proposalsIssued: number;
  customerAccepted: number;
  confirmedBookings: number;
  conversionRateLeadToQuote: number; // percentage (0 - 100)
  conversionRateQuoteToAccept: number; // percentage (0 - 100)
  conversionRateAcceptToConfirm: number; // percentage (0 - 100)
  overallWinRate: number; // percentage (0 - 100)
}

export interface DashboardSummaryDto {
  dateRange: {
    option: AnalyticsDateRangeOption;
    startDate?: string;
    endDate?: string;
    dateBasis: AnalyticsDateBasis;
  };
  contractedBookingValue: number;
  contractedBookingValueInPaise: number;
  verifiedCashCollected: number;
  verifiedCashCollectedInPaise: number;
  outstandingReceivables: number;
  outstandingReceivablesInPaise: number;
  customerCreditsAmount: number;
  customerCreditsInPaise: number;
  activeBookingsCount: number;
  confirmedBookingsCount: number;
  cancelledBookingsCount: number;
  totalQuotationsCount: number;
  totalQuotedPipelineValue: number;
  totalLeadsCount: number;
  bookingMetrics: {
    quoteAccepted: number;
    pendingConfirmation: number;
    confirmed: number;
    operationalPreparation: number;
    inTrip: number;
    completed: number;
    cancelled: number;
    total: number;
  };
  leadMetrics: Record<LeadStatus, number> & { total: number };
  funnel: FunnelMetricsDto;
}

export interface FinancialTrendPointDto {
  period: string; // e.g. "2026-10-14" or "2026-10"
  periodLabel: string; // e.g. "14 Oct 2026" or "Oct 2026"
  contractedBookingValue: number;
  contractedBookingValueInPaise: number;
  verifiedCashCollected: number;
  verifiedCashCollectedInPaise: number;
  verifiedRefunds: number;
  verifiedRefundsInPaise: number;
  netCashFlow: number;
  netCashFlowInPaise: number;
  bookingsCount: number;
  paymentsCount: number;
}

export interface FinancialTrendsDto {
  interval: 'day' | 'week' | 'month';
  dateBasis: AnalyticsDateBasis;
  points: FinancialTrendPointDto[];
  totals: {
    contractedBookingValue: number;
    contractedBookingValueInPaise: number;
    verifiedCashCollected: number;
    verifiedCashCollectedInPaise: number;
    verifiedRefunds: number;
    verifiedRefundsInPaise: number;
    netCashFlow: number;
    netCashFlowInPaise: number;
    bookingsCount: number;
    paymentsCount: number;
  };
}

export interface TopDestinationAnalyticsDto {
  destinationId: string;
  destinationName: string;
  state?: string;
  country?: string;
  bookingCount: number;
  contractedValue: number;
  contractedValueInPaise: number;
  verifiedPaidValue: number;
  verifiedPaidValueInPaise: number;
  averageBookingValue: number;
}

export interface TopDestinationsResponseDto {
  destinations: TopDestinationAnalyticsDto[];
  totalActiveBookingsEvaluated: number;
  totalContractedValueEvaluated: number;
}
