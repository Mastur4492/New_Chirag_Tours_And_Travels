import {
  BookingStatus,
  MealPlan,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  QuotationStatus,
} from '@chirag/types';

export const QUOTATION_STATUS_CONFIG: Record<
  QuotationStatus,
  { label: string; badgeClass: string; dotClass: string; description: string }
> = {
  DRAFT: {
    label: 'Draft',
    badgeClass: 'badge-draft',
    dotClass: 'bg-slate-400',
    description: 'Work in progress. Ready for review or calculation.',
  },
  PENDING_ADMIN_APPROVAL: {
    label: 'Pending Owner Approval',
    badgeClass: 'badge-pending',
    dotClass: 'bg-amber-500',
    description: 'Requires Faisal Bikanerwala approval (discount or pricing limit exceeded).',
  },
  APPROVED: {
    label: 'Approved by Owner',
    badgeClass: 'badge-approved',
    dotClass: 'bg-blue-500',
    description: 'Price approved. Ready to issue to customer.',
  },
  ISSUED: {
    label: 'Issued to Customer',
    badgeClass: 'badge-issued',
    dotClass: 'bg-teal-500',
    description: 'Shared with customer. Public link active.',
  },
  SENT: {
    label: 'Sent to Customer',
    badgeClass: 'badge-issued',
    dotClass: 'bg-teal-500',
    description: 'Dispatched to customer via WhatsApp or email.',
  },
  ACCEPTED: {
    label: 'Customer Accepted',
    badgeClass: 'badge-accepted',
    dotClass: 'bg-emerald-500',
    description: 'Customer approved itinerary and terms. Ready for booking reservation.',
  },
  REVISED: {
    label: 'Superseded (Revised)',
    badgeClass: 'badge-revised',
    dotClass: 'bg-purple-500',
    description: 'A newer version of this quotation proposal has been created.',
  },
  EXPIRED: {
    label: 'Expired',
    badgeClass: 'badge-expired',
    dotClass: 'bg-slate-400',
    description: 'Validity window elapsed. Requires revision with current rates.',
  },
  REJECTED: {
    label: 'Declined / Rejected',
    badgeClass: 'badge-rejected',
    dotClass: 'bg-rose-500',
    description: 'Rejected during admin approval or customer review.',
  },
};

export const MEAL_PLAN_LABELS: Record<string, { name: string; description: string }> = {
  EP: { name: 'EP (European Plan - Room Only)', description: 'Room Only' },
  RO: { name: 'EP (European Plan - Room Only)', description: 'Room Only' },
  CP: { name: 'CP (Continental Plan)', description: 'Room + Breakfast Included' },
  MAP: { name: 'MAP (Modified American)', description: 'Room + Breakfast + Dinner' },
  AP: { name: 'AP (American Plan)', description: 'All Meals Included (Breakfast, Lunch, Dinner)' },
};

export const BOOKING_STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; badgeClass: string; dotClass: string; description: string }
> = {
  QUOTE_ACCEPTED: {
    label: 'Quote Accepted (Awaiting Admin Confirm)',
    badgeClass: 'badge-pending',
    dotClass: 'bg-amber-500',
    description: 'Customer approved proposal. Booking created, awaiting Admin confirmation.',
  },
  PENDING_CONFIRMATION: {
    label: 'Pending Confirmation',
    badgeClass: 'badge-pending',
    dotClass: 'bg-amber-500',
    description: 'Booking reservation awaiting operations and inventory locks.',
  },
  CONFIRMED: {
    label: 'Confirmed Booking',
    badgeClass: 'badge-confirmed',
    dotClass: 'bg-emerald-500',
    description: 'Confirmed by Admin. Inventory and schedule reserved.',
  },
  OPERATIONAL_PREPARATION: {
    label: 'Operational Prep',
    badgeClass: 'badge-prep',
    dotClass: 'bg-blue-500',
    description: 'Hotel reservations and transport logistics being prepared.',
  },
  IN_TRIP: {
    label: 'In Trip / On Tour',
    badgeClass: 'badge-intrip',
    dotClass: 'bg-purple-500',
    description: 'Guests currently traveling on tour.',
  },
  COMPLETED: {
    label: 'Completed Trip',
    badgeClass: 'badge-completed',
    dotClass: 'bg-teal-500',
    description: 'Tour successfully completed and reconciled.',
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeClass: 'badge-cancelled',
    dotClass: 'bg-rose-500',
    description: 'Booking cancelled. Subject to cancellation and refund policies.',
  },
};

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; badgeClass: string; dotClass: string; description: string }
> = {
  SUBMITTED: {
    label: 'Pending Admin Verification',
    badgeClass: 'badge-pending',
    dotClass: 'bg-amber-500',
    description: 'Submitted by agent. Awaiting Admin bank/cash reconciliation.',
  },
  VERIFIED: {
    label: 'Verified & Credited',
    badgeClass: 'badge-verified',
    dotClass: 'bg-emerald-500',
    description: 'Reconciled and confirmed by Admin. Credited to booking ledger.',
  },
  REJECTED: {
    label: 'Verification Rejected',
    badgeClass: 'badge-rejected',
    dotClass: 'bg-rose-500',
    description: 'Declined by Admin. Does not affect ledger balance.',
  },
};

export const PAYMENT_TYPE_CONFIG: Record<PaymentType, { label: string }> = {
  ADVANCE: { label: 'Advance Payment' },
  PARTIAL: { label: 'Part Payment' },
  FINAL_BALANCE: { label: 'Final Settlement' },
  SECURITY_DEPOSIT: { label: 'Security Deposit' },
  REFUND: { label: 'Refund Allocation' },
};

export const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, { label: string }> = {
  UPI: { label: 'UPI / QR Code' },
  NEFT_IMPS: { label: 'NEFT / RTGS / IMPS' },
  BANK_DEPOSIT: { label: 'Bank Cash/Cheque Deposit' },
  CASH: { label: 'Direct Cash' },
  CHEQUE: { label: 'Cheque' },
  CREDIT_CARD: { label: 'Credit Card' },
  DEBIT_CARD: { label: 'Debit Card' },
  OTHER: { label: 'Other Transfer' },
};

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPaiseToRupees(paise: number | undefined | null): string {
  if (paise === undefined || paise === null || isNaN(paise)) return '₹0';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function formatDate(dateString: string | Date | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateString);
  }
}

export function formatDateTime(dateString: string | Date | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return String(dateString);
  }
}

export function sanitizeDisplayName(name?: string): string {
  if (!name) return 'Customer';
  return name.trim();
}

