import {
  BookingStatus,
  HotelReservationStatus,
  LeadSource,
  LeadStatus,
  MealPlan,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  QuotationStatus,
  SupplierCancellationStatus,
  TransportAssignmentStatus,
  VehicleCategory,
} from '@chirag/types';

/**
 * NEW CHIRAG TOURS & TRAVELS — CENTRALIZED BUSINESS LABELS & HELPERS
 * 
 * Replaces technical enums and codes with human-readable labels for non-technical agency staff.
 */

export const LEAD_STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; description: string; badgeClass: string; dotClass: string }
> = {
  NEW: {
    label: 'New Enquiry',
    description: 'Fresh incoming lead, awaiting first contact',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  ASSIGNED: {
    label: 'Assigned',
    description: 'Assigned to a travel consultant',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    dotClass: 'bg-purple-500',
  },
  CONTACTED: {
    label: 'Contacted',
    description: 'Initial customer interaction completed',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    dotClass: 'bg-teal-500',
  },
  QUOTED: {
    label: 'Quotation Sent',
    description: 'Tour proposal issued to customer',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  NEGOTIATING: {
    label: 'Discussion in Progress',
    description: 'Customer discussing itinerary/pricing adjustments',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dotClass: 'bg-indigo-500',
  },
  CONVERTED: {
    label: 'Booking Confirmed',
    description: 'Proposal accepted, tour booked successfully',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  LOST: {
    label: 'Not Converted',
    description: 'Customer opted out or did not proceed',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  JUNK: {
    label: 'Invalid / Spam',
    description: 'Spam, duplicate, or unverified contact',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-400',
  },
};

export const LEAD_SOURCE_CONFIG: Record<LeadSource, { label: string; badgeClass: string }> = {
  ADMIN_DIRECT: {
    label: 'Direct Enquiry',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  CUSTOMER_WEB: {
    label: 'Website Enquiry',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  CUSTOMER_APP: {
    label: 'Mobile App',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  AGENT: {
    label: 'Partner Agent',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  PHONE: {
    label: 'Phone Call',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  WALK_IN: {
    label: 'Office Walk-in',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  OTHER: {
    label: 'Other Source',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

export const QUOTATION_STATUS_CONFIG: Record<
  QuotationStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  DRAFT: {
    label: 'Draft Proposal',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  PENDING_ADMIN_APPROVAL: {
    label: 'Pending Owner Approval',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  APPROVED: {
    label: 'Approved & Ready',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  ISSUED: {
    label: 'Issued to Customer',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    dotClass: 'bg-teal-500',
  },
  SENT: {
    label: 'Sent to Customer',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    dotClass: 'bg-teal-500',
  },
  ACCEPTED: {
    label: 'Customer Accepted',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  REVISED: {
    label: 'Revision Issued',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    dotClass: 'bg-purple-500',
  },
  REJECTED: {
    label: 'Declined',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-400',
  },
  EXPIRED: {
    label: 'Validity Expired',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    dotClass: 'bg-slate-400',
  },
};

export const MEAL_PLAN_CONFIG: Record<MealPlan, { short: string; label: string; desc: string }> = {
  RO: {
    short: 'RO',
    label: 'Room Only',
    desc: 'Room accommodation only, no meals included',
  },
  CP: {
    short: 'CP',
    label: 'Bed & Breakfast',
    desc: 'Room accommodation with daily morning breakfast',
  },
  MAP: {
    short: 'MAP',
    label: 'Breakfast & Dinner',
    desc: 'Room accommodation with breakfast and dinner (Half Board)',
  },
  AP: {
    short: 'AP',
    label: 'All Meals Included',
    desc: 'Breakfast, lunch, and dinner included (Full Board)',
  },
};

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  HATCHBACK: 'Hatchback (WagonR / Swift)',
  SEDAN: 'Sedan (Dzire / Etios / Amaze)',
  SUV: 'SUV (Ertiga / Bolero)',
  PREMIUM_SUV: 'Premium SUV (Innova / Crysta)',
  TEMPO_TRAVELLER: 'Tempo Traveller (12-17 Seater)',
  BUS: 'Mini Bus / Luxury Coach',
};

/**
 * Format date in readable local Indian format, e.g. "12 Oct 2026"
 */
export function formatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return 'Not scheduled';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

/**
 * Format date and time in readable local Indian format, e.g. "12 Oct 2026, 04:30 PM"
 */
export function formatDateTime(dateStr?: string | Date | null): string {
  if (!dateStr) return 'Not scheduled';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

/**
 * Format follow-up date, distinguishing date-only calendar values (e.g. UTC midnight)
 * from genuine time-of-day appointments to prevent misleading "05:30 am" IST artifacts.
 */
export function formatFollowUpDate(dateStr?: string | Date | null): string {
  if (!dateStr) return 'Not scheduled';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);

    // If date is passed as a string with date-only format (e.g. "2026-10-15")
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      return formatDate(d);
    }

    // Check if the timestamp is exactly midnight UTC (00:00:00.000Z)
    // or midnight local time, indicating a date-only calendar value
    const isUtcMidnight =
      d.getUTCHours() === 0 &&
      d.getUTCMinutes() === 0 &&
      d.getUTCSeconds() === 0 &&
      d.getUTCMilliseconds() === 0;

    const isLocalMidnight =
      d.getHours() === 0 &&
      d.getMinutes() === 0 &&
      d.getSeconds() === 0 &&
      d.getMilliseconds() === 0;

    if (isUtcMidnight || isLocalMidnight) {
      return formatDate(d);
    }

    // Otherwise, an explicit appointment time was scheduled: format with time
    return formatDateTime(d);
  } catch {
    return String(dateStr);
  }
}

/**
 * Sanitizes destination and business entity display names by removing known
 * seed/test generated timestamp suffixes (10-14 consecutive digits at string end)
 * while preserving legitimate numbers in real business names (e.g. "Terminal 3", "NH 44").
 */
export function sanitizeDisplayName(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s*[-_]?\b\d{10,14}\b\s*$/, '').trim();
}

/**
 * Format currency in Indian Rupees
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Check if a date string is today
 */
export function isToday(dateStr?: string | Date | null): boolean {
  if (!dateStr) return false;
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  } catch {
    return false;
  }
}

/**
 * Check if a follow-up date is in the past (overdue)
 */
export function isOverdue(dateStr?: string | Date | null): boolean {
  if (!dateStr) return false;
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    const now = new Date();
    // Compare date parts only (before today)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return d.getTime() < todayStart.getTime();
  } catch {
    return false;
  }
}

export const BOOKING_STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; description: string; badgeClass: string; dotClass: string }
> = {
  QUOTE_ACCEPTED: {
    label: 'Quote Accepted',
    description: 'Customer approved quotation; awaiting confirmation/advance payment',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  PENDING_CONFIRMATION: {
    label: 'Pending Confirmation',
    description: 'Advance received; operational checks in progress',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  CONFIRMED: {
    label: 'Confirmed',
    description: 'Booking officially locked; itinerary and inventory confirmed',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  OPERATIONAL_PREPARATION: {
    label: 'Operational Prep',
    description: 'Vouchers, fleet, and driver assignment active',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    dotClass: 'bg-purple-500',
  },
  IN_TRIP: {
    label: 'In Trip',
    description: 'Tour underway with travelers on location',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    dotClass: 'bg-teal-500',
  },
  COMPLETED: {
    label: 'Completed',
    description: 'Tour successfully delivered and settled',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-500',
  },
  CANCELLED: {
    label: 'Cancelled',
    description: 'Booking cancelled or forfeited',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
};

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; description: string; badgeClass: string; dotClass: string }
> = {
  SUBMITTED: {
    label: 'Pending Verification',
    description: 'Recorded by agent/staff; awaiting Admin audit approval',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    dotClass: 'bg-amber-500',
  },
  VERIFIED: {
    label: 'Verified & Credited',
    description: 'Audit verified; officially applied to booking ledger',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  REJECTED: {
    label: 'Rejected',
    description: 'Declined during verification review',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
    dotClass: 'bg-rose-500',
  },
};

export const PAYMENT_METHOD_CONFIG: Record<
  PaymentMethod,
  { label: string }
> = {
  UPI: { label: 'UPI / QR Scan' },
  NEFT_IMPS: { label: 'NEFT / RTGS / IMPS' },
  BANK_DEPOSIT: { label: 'Bank Cash/Transfer Deposit' },
  CASH: { label: 'Direct Cash' },
  CHEQUE: { label: 'Cheque / Demand Draft' },
  CREDIT_CARD: { label: 'Credit Card' },
  DEBIT_CARD: { label: 'Debit Card' },
  OTHER: { label: 'Other Method' },
};

export const PAYMENT_TYPE_CONFIG: Record<
  PaymentType,
  { label: string; badgeClass: string }
> = {
  ADVANCE: {
    label: 'Advance Payment',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  PARTIAL: {
    label: 'Part Payment',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  FINAL_BALANCE: {
    label: 'Final Settlement',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  SECURITY_DEPOSIT: {
    label: 'Security Deposit',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  REFUND: {
    label: 'Refund (Outflow)',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

/**
 * Converts integer paise to formatted INR string, e.g. 5250000 -> ₹52,500
 */
export function formatPaiseToRupees(paise?: number | null): string {
  const amount = (paise || 0) / 100;
  return formatCurrency(amount);
}

export const HOTEL_RESERVATION_STATUS_CONFIG: Record<
  HotelReservationStatus,
  { label: string; description: string; badgeClass: string; dotClass: string }
> = {
  PENDING: {
    label: 'Pending Supplier Confirmation',
    description: 'Booking confirmed; awaiting hotel room reservation request',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    dotClass: 'bg-amber-500',
  },
  REQUESTED: {
    label: 'Sent to Hotel',
    description: 'Reservation email/call placed with hotel property',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
    dotClass: 'bg-blue-500',
  },
  CONFIRMED: {
    label: 'Confirmed by Hotel',
    description: 'Supplier confirmation number received; ready for voucher',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  REJECTED: {
    label: 'Hotel Sold Out / Rejected',
    description: 'Hotel property unable to accommodate; requires alternative property',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
    dotClass: 'bg-rose-500',
  },
  CANCELLED: {
    label: 'Reservation Cancelled',
    description: 'Hotel stay cancelled due to booking amendment or cancellation',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    dotClass: 'bg-slate-500',
  },
};

export const TRANSPORT_ASSIGNMENT_STATUS_CONFIG: Record<
  TransportAssignmentStatus,
  { label: string; description: string; badgeClass: string; dotClass: string }
> = {
  UNASSIGNED: {
    label: 'Cab / Driver Needed',
    description: 'Itinerary transport item requires vehicle and driver assignment',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    dotClass: 'bg-amber-500',
  },
  ASSIGNED: {
    label: 'Vehicle & Driver Assigned',
    description: 'Cab and driver locked on schedule; ready for duty slip generation',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
    dotClass: 'bg-blue-500',
  },
  DISPATCHED: {
    label: 'Dispatched to Guest',
    description: 'Driver briefed, duty slip issued, driver en route to pickup',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    dotClass: 'bg-indigo-500',
  },
  IN_TRANSIT: {
    label: 'On Tour / In Transit',
    description: 'Tour circuit actively underway with driver on duty',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-300',
    dotClass: 'bg-teal-500',
  },
  COMPLETED: {
    label: 'Tour Completed',
    description: 'Transport leg completed successfully; schedule locks released',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'Assignment Cancelled',
    description: 'Transport cancelled; schedule locks released back to fleet pool',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    dotClass: 'bg-slate-500',
  },
};

export const SUPPLIER_CANCELLATION_STATUS_CONFIG: Record<
  SupplierCancellationStatus,
  { label: string; description: string; badgeClass: string; dotClass: string }
> = {
  PENDING_SUPPLIER_ACKNOWLEDGEMENT: {
    label: 'Pending Supplier Acknowledgement',
    description: 'Cancellation request recorded; awaiting formal confirmation and penalty terms from supplier',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-400 font-semibold',
    dotClass: 'bg-amber-600',
  },
  SUPPLIER_CONFIRMED: {
    label: 'Supplier Confirmed Cancellation',
    description: 'Supplier confirmed cancellation; penalty/refund terms acknowledged',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  SUPPLIER_PENALTY_DISPUTED: {
    label: 'Disputed Cancellation Penalty',
    description: 'Supplier dispute over cancellation policy, timing or penalty retention',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
    dotClass: 'bg-rose-500',
  },
};

