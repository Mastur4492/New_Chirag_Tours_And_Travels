export type BookingStatus =
  | 'QUOTE_ACCEPTED'
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'OPERATIONAL_PREPARATION'
  | 'IN_TRIP'
  | 'COMPLETED'
  | 'CANCELLED';

export interface BookingFinancialsDto {
  totalAmount: number;
  totalAmountInPaise: number;
  currency: 'INR';
  advanceRequired: number;
  advanceRequiredInPaise: number;
  totalPaid: number;
  totalPaidInPaise: number;
  balancePending: number;
  balancePendingInPaise: number;
  excessPaid?: number;
  excessPaidInPaise?: number;
  supplierCostTotal?: number; // Confidential: ADMIN only
  supplierCostTotalInPaise?: number; // Confidential: ADMIN only
  realizedGrossProfit?: number; // Confidential: ADMIN only
  taxableAmount?: number;
  taxAmount?: number;
  taxRatePercent?: number;
}

export interface BookingTravelerSummaryDto {
  numberOfAdults: number;
  numberOfChildren: number;
  numberOfInfants: number;
}

export interface BookingHistoryEntryDto {
  fromStatus?: string;
  toStatus: string;
  changedBy?: string;
  reason?: string;
  timestamp: string;
}

export interface BookingDto {
  id: string;
  bookingNumber: string;
  quotationId: string;
  quotationVersionUsed: number;
  leadId: string;
  customerId: string;
  assignedAgentId: string;
  destinationId: string;
  travelStartDate: string;
  travelEndDate: string;
  durationNights: number;
  durationDays: number;
  travelerSummary: BookingTravelerSummaryDto;
  status: BookingStatus;
  financials: BookingFinancialsDto;
  hotelVoucherGenerated: boolean;
  driverDutySlipGenerated: boolean;
  assignedDriverId?: string;
  assignedVehicleId?: string;
  cancellationReason?: string;
  cancellationFee?: number;
  cancellationFeeInPaise?: number;
  cancelledBy?: string;
  cancelledAt?: string;
  confirmedBy?: string;
  confirmedAt?: string;
  customerNotes?: string;
  internalNotes?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  destinationName?: string;
  assignedAgentName?: string;
  itinerarySnapshot?: {
    hotels?: any[];
    transports?: any[];
    inclusions?: string[];
    exclusions?: string[];
    terms?: string[];
    days?: any[];
  };
  history?: BookingHistoryEntryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingFromQuotationInput {
  quotationId: string;
  quotationVersion: number;
  advancePercentage?: number;
  customerNotes?: string;
  internalNotes?: string;
}

