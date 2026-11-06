'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarCheck,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Receipt,
  RotateCcw,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Info,
  DollarSign,
  FileSpreadsheet,
  Check,
  X,
  History,
  Building2,
  Car,
  ChevronRight,
  Eye,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  BookingDto,
  BookingStatus,
  HotelReservationDto,
  OperationalSummaryDto,
  PaymentMethod,
  PaymentRecordDto,
  PaymentType,
  TransportAssignmentDto,
} from '@chirag/types';
import { bookingsApi, paymentsApi, operationsApi } from '@/lib/api';
import {
  BOOKING_STATUS_CONFIG,
  PAYMENT_METHOD_CONFIG,
  PAYMENT_STATUS_CONFIG,
  PAYMENT_TYPE_CONFIG,
  MEAL_PLAN_LABELS,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPaiseToRupees,
  sanitizeDisplayName,
} from '@/lib/labels';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.id as string;

  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [payments, setPayments] = useState<PaymentRecordDto[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [operationsSummary, setOperationsSummary] = useState<OperationalSummaryDto | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ledger' | 'itinerary' | 'operations'>('ledger');

  // Toast Notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  // Form: Payment Submission
  const [paymentAmountRupees, setPaymentAmountRupees] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('ADVANCE');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Form: Refund Request
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<string>('');
  const [refundAmountRupees, setRefundAmountRupees] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundReference, setRefundReference] = useState('');
  const [refundNotes, setRefundNotes] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  // Load all data (supports silent background revalidation for real-time SSE)
  const loadData = async (background = false) => {
    if (!bookingId) return;
    if (!background) setLoading(true);
    setError(null);
    try {
      const [bookingRes, paymentsRes] = await Promise.all([
        bookingsApi.getById(bookingId),
        paymentsApi.getForBooking(bookingId),
      ]);

      setBooking(bookingRes.data);
      setPayments(paymentsRes.data?.payments || []);
      setPaymentSummary(paymentsRes.data?.summary || null);

      // Load operational readiness summary
      try {
        const opsRes = await operationsApi.getSummary(bookingId);
        setOperationsSummary(opsRes.data);
      } catch {
        // Non-blocking operations summary load
      }
    } catch (err: any) {
      if (!background) setError(err?.message || 'Failed to load booking details');
    } finally {
      if (!background) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [bookingId]);

  // Real-time synchronization via Server-Sent Events (SSE)
  useRealtimeSync({
    scopeId: bookingId,
    eventTypes: ['PAYMENT_UPDATE', 'BOOKING_UPDATE', 'OPERATIONS_UPDATE'],
    onRefresh: () => {
      loadData(true);
    },
    onEvent: (msg) => {
      if (msg.message || msg.title) {
        showToast(msg.message || msg.title || 'Live update applied', 'info' as any);
      }
    },
  });

  // Filter verified payments that can be refunded (have remaining headroom)
  const eligibleVerifiedPayments = useMemo(() => {
    return payments.filter((p) => {
      if (p.status !== 'VERIFIED') return false;
      if (p.isRefund) return false;
      const allocated = p.allocatedRefundPaise || 0;
      return p.amountInPaise - allocated > 0;
    });
  }, [payments]);

  const selectedOriginalPayment = useMemo(() => {
    return payments.find((p) => p.id === selectedPaymentForRefund);
  }, [payments, selectedPaymentForRefund]);

  const selectedRemainingHeadroomRupees = useMemo(() => {
    if (!selectedOriginalPayment) return 0;
    const allocated = selectedOriginalPayment.allocatedRefundPaise || 0;
    return Math.max(0, (selectedOriginalPayment.amountInPaise - allocated) / 100);
  }, [selectedOriginalPayment]);

  // Handle Payment Submission
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    const amountNum = parseFloat(paymentAmountRupees);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPaymentError('Payment amount must be greater than ₹0.00');
      return;
    }
    if (amountNum < 1) {
      setPaymentError('Payment amount must be at least ₹1.00');
      return;
    }

    setPaymentSubmitting(true);
    try {
      // Generate client-side idempotency key for network resilience
      const idempotencyKey = `agent-pay-${bookingId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      await paymentsApi.recordPayment({
        bookingId,
        amount: amountNum,
        paymentType,
        paymentMethod,
        transactionReference: paymentReference.trim() || undefined,
        paymentDate: paymentDate || undefined,
        notes: paymentNotes.trim() || undefined,
        idempotencyKey,
      });

      showToast('Payment submitted successfully. Awaiting Admin verification.', 'success');
      setIsPaymentModalOpen(false);
      setPaymentAmountRupees('');
      setPaymentReference('');
      setPaymentNotes('');

      // Refresh ledger
      await loadData();
    } catch (err: any) {
      setPaymentError(err?.message || 'Failed to submit payment. Please verify the amount and retry.');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Handle Refund Request Submission
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRefundError(null);

    if (!selectedPaymentForRefund) {
      setRefundError('Please select a verified payment to refund against.');
      return;
    }

    const amountNum = parseFloat(refundAmountRupees);
    if (isNaN(amountNum) || amountNum <= 0) {
      setRefundError('Refund amount must be greater than ₹0.00');
      return;
    }
    if (amountNum < 1) {
      setRefundError('Refund amount must be at least ₹1.00');
      return;
    }

    if (amountNum > selectedRemainingHeadroomRupees) {
      setRefundError(
        `Refund amount cannot exceed the remaining refundable headroom (₹${selectedRemainingHeadroomRupees.toFixed(2)})`
      );
      return;
    }

    if (!refundReason.trim() || refundReason.trim().length < 3) {
      setRefundError('Please provide a descriptive refund reason (minimum 3 characters).');
      return;
    }

    setRefundSubmitting(true);
    try {
      const idempotencyKey = `agent-ref-${bookingId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      await paymentsApi.recordRefund({
        bookingId,
        originalPaymentId: selectedPaymentForRefund,
        amount: amountNum,
        refundReason: refundReason.trim(),
        transactionReference: refundReference.trim() || undefined,
        notes: refundNotes.trim() || undefined,
        idempotencyKey,
      });

      showToast('Refund request submitted successfully. Awaiting Admin review and execution.', 'success');
      setIsRefundModalOpen(false);
      setSelectedPaymentForRefund('');
      setRefundAmountRupees('');
      setRefundReason('');
      setRefundReference('');
      setRefundNotes('');

      // Refresh ledger
      await loadData();
    } catch (err: any) {
      setRefundError(err?.message || 'Failed to submit refund request.');
    } finally {
      setRefundSubmitting(false);
    }
  };

  if (loading && !booking) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div
          className="spin"
          style={{
            margin: '0 auto 16px auto',
            width: 36,
            height: 36,
            border: '3px solid var(--border-subtle)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
          }}
        />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Loading authorized booking records from Chirag Travel Desk...
        </p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div style={{ padding: '40px 24px', maxWidth: 800, margin: '0 auto' }}>
        <div
          style={{
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#9f1239',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={22} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              Unable to Access Booking
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#881337' }}>
            {error || 'The requested booking could not be found or you are not authorized to view it.'}
          </p>
          <div style={{ marginTop: 8 }}>
            <Link
              href="/bookings"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                background: '#9f1239',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              <ArrowLeft size={15} />
              <span>Back to My Bookings</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusConf = BOOKING_STATUS_CONFIG[booking.status] || {
    label: booking.status,
    badgeClass: 'badge-pending',
    dotClass: 'bg-slate-400',
    description: '',
  };

  const totalAmount = booking.financials?.totalAmount ?? 0;
  const verifiedPaid = booking.financials?.totalPaid ?? 0;
  const balancePending = booking.financials?.balancePending ?? totalAmount;
  const advanceRequired = booking.financials?.advanceRequired ?? 0;
  const excessPaid = booking.financials?.excessPaid ?? 0;

  // Submitted payments count
  const submittedPayments = payments.filter((p) => p.status === 'SUBMITTED' && !p.isRefund);
  const submittedTotalRupees = submittedPayments.reduce((sum, p) => sum + p.amount, 0);

  const travelers = booking.travelerSummary || {
    numberOfAdults: 2,
    numberOfChildren: 0,
    numberOfInfants: 0,
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 100,
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            background: toast.type === 'success' ? '#0f766e' : '#e11d48',
            color: '#ffffff',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navigation & Header */}
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/bookings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontWeight: 600,
            marginBottom: 14,
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Bookings</span>
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-main)',
                  fontFamily: 'monospace',
                  margin: 0,
                }}
              >
                {booking.bookingNumber}
              </h1>

              {/* Status Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background:
                    booking.status === 'CONFIRMED'
                      ? '#ecfdf5'
                      : booking.status === 'QUOTE_ACCEPTED'
                      ? '#fffbeb'
                      : booking.status === 'OPERATIONAL_PREPARATION'
                      ? '#eff6ff'
                      : booking.status === 'IN_TRIP'
                      ? '#f5f3ff'
                      : booking.status === 'COMPLETED'
                      ? '#f0fdfa'
                      : '#fff1f2',
                  color:
                    booking.status === 'CONFIRMED'
                      ? '#065f46'
                      : booking.status === 'QUOTE_ACCEPTED'
                      ? '#92400e'
                      : booking.status === 'OPERATIONAL_PREPARATION'
                      ? '#1e40af'
                      : booking.status === 'IN_TRIP'
                      ? '#5b21b6'
                      : booking.status === 'COMPLETED'
                      ? '#134e4a'
                      : '#9f1239',
                  border:
                    booking.status === 'CONFIRMED'
                      ? '1px solid #a7f3d0'
                      : booking.status === 'QUOTE_ACCEPTED'
                      ? '1px solid #fde68a'
                      : booking.status === 'OPERATIONAL_PREPARATION'
                      ? '1px solid #bfdbfe'
                      : booking.status === 'IN_TRIP'
                      ? '1px solid #ddd6fe'
                      : booking.status === 'COMPLETED'
                      ? '1px solid #99f6e4'
                      : '1px solid #fecdd3',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'currentColor',
                  }}
                />
                <span>{statusConf.label}</span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '6px 0 0 0' }}>
              Created on {formatDateTime(booking.createdAt)} &bull; Assigned Agent: {booking.assignedAgentName || 'You'}
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(15, 118, 110, 0.3)',
              }}
            >
              <CreditCard size={16} />
              <span>Record Payment</span>
            </button>

            {eligibleVerifiedPayments.length > 0 && (
              <button
                onClick={() => {
                  setSelectedPaymentForRefund(eligibleVerifiedPayments[0].id);
                  setIsRefundModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  color: '#9f1239',
                  border: '1px solid #fecdd3',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Submit a customer refund request against a verified payment"
              >
                <RotateCcw size={15} />
                <span>Request Refund</span>
              </button>
            )}

            <button
              onClick={() => loadData()}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* 1. Total Package Cost */}
        <div
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Package Cost
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 6 }}>
            {formatCurrency(totalAmount)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 4 }}>
            All-Inclusive (Taxes & 5% GST included)
          </div>
        </div>

        {/* 2. Total Received */}
        <div
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Received
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#059669', marginTop: 6 }}>
            {formatCurrency(verifiedPaid)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: 4 }}>
            Verified & Credited to Bank
          </div>
        </div>

        {/* 3. Balance Remaining */}
        <div
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            background: balancePending <= 0 ? '#ecfdf5' : '#fffbeb',
            border: balancePending <= 0 ? '1px solid #a7f3d0' : '1px solid #fde68a',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: balancePending <= 0 ? '#047857' : '#b45309', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {balancePending <= 0 ? 'Balance Due' : 'Balance Remaining'}
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: balancePending <= 0 ? '#059669' : '#d97706', marginTop: 6 }}>
            {formatCurrency(balancePending > 0 ? balancePending : 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: balancePending <= 0 ? '#047857' : '#92400e', marginTop: 4 }}>
            {balancePending <= 0 ? (excessPaid > 0 ? `Fully Paid (+${formatCurrency(excessPaid)} extra)` : 'Fully Paid & Cleared ✅') : 'Pending payment from customer'}
          </div>
        </div>

        {/* 4. Payment Progress / Stage */}
        <div
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            background: verifiedPaid >= totalAmount ? '#ecfdf5' : verifiedPaid > 0 ? '#eff6ff' : '#fff7ed',
            border: verifiedPaid >= totalAmount ? '1px solid #a7f3d0' : verifiedPaid > 0 ? '1px solid #bfdbfe' : '1px solid #fed7aa',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: verifiedPaid >= totalAmount ? '#047857' : verifiedPaid > 0 ? '#1d4ed8' : '#c2410c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Payment Stage
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: verifiedPaid >= totalAmount ? '#059669' : verifiedPaid > 0 ? '#2563eb' : '#ea580c', marginTop: 6 }}>
            {verifiedPaid >= totalAmount ? '100% Paid' : verifiedPaid > 0 ? `${Math.round((verifiedPaid / (totalAmount || 1)) * 100)}% Paid` : 'Advance Due'}
          </div>
          <div style={{ fontSize: '0.75rem', color: verifiedPaid >= totalAmount ? '#047857' : verifiedPaid > 0 ? '#1e40af' : '#9a3412', marginTop: 4 }}>
            {verifiedPaid >= totalAmount ? 'Tour & room allotments confirmed' : verifiedPaid > 0 ? `${formatCurrency(balancePending)} remaining balance` : 'Minimum 25% to lock hotel & cab'}
          </div>
        </div>
      </div>

      {/* Minor Round-off Note Banner (if any extra payment was recorded) */}
      {excessPaid > 0 && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
            fontSize: '0.85rem',
          }}
        >
          <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#0f172a' }}>Payment Complete with Minor Round-off (+{formatCurrency(excessPaid)}):</strong>{' '}
            Customer has deposited {formatCurrency(verifiedPaid)} against total package cost of {formatCurrency(totalAmount)}. Outstanding balance is ₹0 (Fully settled).
          </div>
          <span style={{ fontSize: '0.78rem', background: '#e2e8f0', color: '#475569', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
            No Balance Due
          </span>
        </div>
      )}

      {/* Unverified Submissions Alert Banner */}
      {submittedPayments.length > 0 && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20,
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={18} style={{ color: '#d97706', flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#78350f' }}>
                {submittedPayments.length} Payment(s) ({formatCurrency(submittedTotalRupees)}) Awaiting Admin Verification
              </strong>
              <div style={{ fontSize: '0.78rem', color: '#92400e', marginTop: 2 }}>
                Admin accounts desk will verify the bank/UPI reference. Once verified, it will automatically reflect in the verified total.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('ledger')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              background: '#d97706',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            View Details
          </button>
        </div>
      )}

      {/* Main Grid: Customer & Booking Info + Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Column: Customer & Trip Overview Card */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '22px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              Guest & Customer
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 6 }}>
              {sanitizeDisplayName(booking.customerName)}
            </div>
            {booking.customerPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                <Phone size={13} />
                <span>{booking.customerPhone}</span>
              </div>
            )}
            {booking.customerEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 3 }}>
                <Mail size={13} />
                <span>{booking.customerEmail}</span>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              Travel Circuit
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: 6 }}>
              <MapPin size={15} style={{ color: '#0f766e' }} />
              <span>{booking.destinationName || 'Tour Destination'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 5 }}>
              <Calendar size={13} />
              <span>
                {formatDate(booking.travelStartDate)} &rarr; {formatDate(booking.travelEndDate)}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: 3 }}>
              {booking.durationNights} Nights / {booking.durationDays} Days
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              Travelers Composition
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 600, marginTop: 6 }}>
              {travelers.numberOfAdults} Adults
              {travelers.numberOfChildren > 0 ? `, ${travelers.numberOfChildren} Children` : ''}
              {travelers.numberOfInfants > 0 ? `, ${travelers.numberOfInfants} Infants` : ''}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              Originating Proposal
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, marginTop: 4 }}>
              Version {booking.quotationVersionUsed || 1}
            </div>
            {booking.quotationId && (
              <Link
                href="/quotations"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.78rem',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  textDecoration: 'none',
                  marginTop: 4,
                }}
              >
                <span>View Quotation Proposals</span>
                <ChevronRight size={12} />
              </Link>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Tabs */}
        <div>
          {/* Tab Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: 20,
            }}
          >
            <button
              onClick={() => setActiveTab('ledger')}
              style={{
                padding: '10px 18px',
                fontSize: '0.9rem',
                fontWeight: activeTab === 'ledger' ? 700 : 500,
                color: activeTab === 'ledger' ? '#0f766e' : 'var(--text-muted)',
                borderBottom: activeTab === 'ledger' ? '2px solid #0f766e' : '2px solid transparent',
                background: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderTop: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Receipt size={16} />
              <span>Payment Ledger ({payments.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('itinerary')}
              style={{
                padding: '10px 18px',
                fontSize: '0.9rem',
                fontWeight: activeTab === 'itinerary' ? 700 : 500,
                color: activeTab === 'itinerary' ? '#0f766e' : 'var(--text-muted)',
                borderBottom: activeTab === 'itinerary' ? '2px solid #0f766e' : '2px solid transparent',
                background: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderTop: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <FileSpreadsheet size={16} />
              <span>Itinerary Snapshot</span>
            </button>

            <button
              onClick={() => setActiveTab('operations')}
              style={{
                padding: '10px 18px',
                fontSize: '0.9rem',
                fontWeight: activeTab === 'operations' ? 700 : 500,
                color: activeTab === 'operations' ? '#0f766e' : 'var(--text-muted)',
                borderBottom: activeTab === 'operations' ? '2px solid #0f766e' : '2px solid transparent',
                background: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderTop: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Building2 size={16} />
              <span>Operational Readiness</span>
            </button>
          </div>

          {/* TAB 1: PAYMENT LEDGER */}
          {activeTab === 'ledger' && (
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Payment & Refund History
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                    Track all payments received, UPI/bank transfer receipts, and processed refunds.
                  </p>
                </div>

                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                  <span>Submit Payment</span>
                </button>
              </div>

              {payments.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                  <Receipt size={32} style={{ color: 'var(--text-subtle)', margin: '0 auto 10px auto' }} />
                  <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.92rem', margin: '0 0 4px 0' }}>
                    No Payment Records Found
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                    Click &quot;Submit Payment&quot; above to record advance or installment payments made by the customer.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase' }}>
                          Receipt / Ref
                        </th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase' }}>
                          Type & Method
                        </th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase' }}>
                          Date
                        </th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase' }}>
                          Status
                        </th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase', textAlign: 'right' }}>
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => {
                        const statusConf = PAYMENT_STATUS_CONFIG[p.status] || {
                          label: p.status,
                          badgeClass: 'badge-pending',
                          description: '',
                        };

                        const isRefund = p.isRefund || p.paymentType === 'REFUND';

                        return (
                          <tr
                            key={p.id}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              background: p.status === 'SUBMITTED' ? '#fffdfa' : 'transparent',
                            }}
                          >
                            {/* Receipt & Reference */}
                            <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: isRefund ? '#fff1f2' : '#f0fdfa',
                                  border: isRefund ? '1px solid #fecdd3' : '1px solid #ccfbf1',
                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  color: isRefund ? '#9f1239' : '#0f766e',
                                  letterSpacing: '0.02em',
                                }}
                              >
                                {p.receiptNumber}
                              </div>
                              {p.transactionReference && (
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                  Ref: {p.transactionReference}
                                </div>
                              )}
                              {p.settlementReference && (
                                <div style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 600, marginTop: 2 }}>
                                  Settlement UTR: {p.settlementReference}
                                </div>
                              )}
                              {p.notes && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 2, fontStyle: 'italic' }}>
                                  &quot;{p.notes}&quot;
                                </div>
                              )}
                            </td>

                            {/* Type & Method */}
                            <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                {PAYMENT_TYPE_CONFIG[p.paymentType]?.label || p.paymentType}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                {PAYMENT_METHOD_CONFIG[p.paymentMethod]?.label || p.paymentMethod}
                              </div>
                            </td>

                            {/* Date */}
                            <td style={{ padding: '12px 14px', verticalAlign: 'top', color: 'var(--text-muted)' }}>
                              <div>{formatDate(p.paymentDate)}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 2 }}>
                                Recorded: {formatDate(p.createdAt)}
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-full)',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  background:
                                    p.status === 'VERIFIED'
                                      ? '#ecfdf5'
                                      : p.status === 'SUBMITTED'
                                      ? '#fffbeb'
                                      : '#fff1f2',
                                  color:
                                    p.status === 'VERIFIED'
                                      ? '#065f46'
                                      : p.status === 'SUBMITTED'
                                      ? '#92400e'
                                      : '#9f1239',
                                  border:
                                    p.status === 'VERIFIED'
                                      ? '1px solid #a7f3d0'
                                      : p.status === 'SUBMITTED'
                                      ? '1px solid #fde68a'
                                      : '1px solid #fecdd3',
                                }}
                              >
                                <span>
                                  {isRefund && p.status === 'VERIFIED'
                                    ? 'Refund Settled'
                                    : isRefund && p.status === 'SUBMITTED'
                                    ? 'Refund Pending'
                                    : statusConf.label}
                                </span>
                              </span>
                              {p.rejectionReason && (
                                <div style={{ fontSize: '0.72rem', color: '#9f1239', marginTop: 3 }}>
                                  Reason: {p.rejectionReason}
                                </div>
                              )}
                              {p.status === 'VERIFIED' && p.verifiedAt && (
                                <div style={{ fontSize: '0.72rem', color: '#047857', marginTop: 2 }}>
                                  Verified: {formatDate(p.verifiedAt)}
                                </div>
                              )}
                            </td>

                            {/* Amount */}
                            <td style={{ padding: '12px 14px', verticalAlign: 'top', textAlign: 'right' }}>
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: '0.95rem',
                                  color: isRefund ? '#9f1239' : p.status === 'VERIFIED' ? '#059669' : 'var(--text-main)',
                                }}
                              >
                                {isRefund ? `-${formatCurrency(p.amount)}` : formatCurrency(p.amount)}
                              </div>
                              {isRefund && (
                                <div style={{ fontSize: '0.72rem', color: '#9f1239', fontWeight: 600, marginTop: 2 }}>
                                  Refunded
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ITINERARY SNAPSHOT */}
          {activeTab === 'itinerary' && (
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '22px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Accepted Proposal Snapshot
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                  Immutable itinerary and inventory snapshot frozen at the moment of customer acceptance.
                </p>
              </div>

              {/* Hotels Snapshot */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={15} style={{ color: '#0f766e' }} />
                  <span>Hotel Accommodations</span>
                </h4>
                {booking.itinerarySnapshot?.hotels && booking.itinerarySnapshot.hotels.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {booking.itinerarySnapshot.hotels.map((h: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            {h.hotelName || `Hotel #${i + 1}`}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {h.roomCategoryName || 'Standard Room'} &bull; Plan: {h.mealPlan || 'CP'} ({(MEAL_PLAN_LABELS as any)[h.mealPlan]?.description || h.mealPlan})
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          <div>{h.numberOfRooms || 1} Room(s) &bull; {h.numberOfNights || 1} Night(s)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No hotel details recorded in proposal snapshot.
                  </p>
                )}
              </div>

              {/* Transports Snapshot */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Car size={15} style={{ color: '#0f766e' }} />
                  <span>Transport & Sightseeing Circuit</span>
                </h4>
                {booking.itinerarySnapshot?.transports && booking.itinerarySnapshot.transports.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {booking.itinerarySnapshot.transports.map((t: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                          {t.vehicleModel || t.vehicleCategory || 'Private Vehicle'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {t.serviceType || 'Complete Tour Circuit / Dedicated Chauffeur'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No dedicated vehicles recorded in proposal snapshot.
                  </p>
                )}
              </div>

              {/* Inclusions & Exclusions */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#047857' }}>
                    Inclusions
                  </div>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: 18, fontSize: '0.82rem', color: '#065f46' }}>
                    {(booking.itinerarySnapshot?.inclusions || ['Accommodation with meal plan as booked', 'Transport as per itinerary']).map((inc: string, idx: number) => (
                      <li key={idx} style={{ marginTop: 3 }}>{inc}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: '#fff1f2', border: '1px solid #fecdd3' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#9f1239' }}>
                    Exclusions
                  </div>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: 18, fontSize: '0.82rem', color: '#881337' }}>
                    {(booking.itinerarySnapshot?.exclusions || ['Personal expenses & laundry', 'Entry tickets & monument fees unless specified']).map((exc: string, idx: number) => (
                      <li key={idx} style={{ marginTop: 3 }}>{exc}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OPERATIONAL READINESS */}
          {activeTab === 'operations' && (
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '22px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Operations & Logistics Readiness
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                    Read-only tracking of hotel vouchers, driver duty slips, and logistics staging.
                  </p>
                </div>

                {operationsSummary && (
                  <div
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-full)',
                      background: operationsSummary.operationalReadinessPercent === 100 ? '#ecfdf5' : '#eff6ff',
                      color: operationsSummary.operationalReadinessPercent === 100 ? '#065f46' : '#1e40af',
                      border: operationsSummary.operationalReadinessPercent === 100 ? '1px solid #a7f3d0' : '1px solid #bfdbfe',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                  >
                    Readiness: {operationsSummary.operationalReadinessPercent}%
                  </div>
                )}
              </div>

              {/* Status Checklist */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Hotel Vouchers
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontWeight: 700, fontSize: '0.9rem', color: operationsSummary?.allHotelVouchersIssued ? '#059669' : '#d97706' }}>
                    {operationsSummary?.allHotelVouchersIssued ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                    <span>{operationsSummary?.allHotelVouchersIssued ? 'All Vouchers Issued' : 'Preparation in Progress'}</span>
                  </div>
                </div>

                <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Driver Duty Slips
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontWeight: 700, fontSize: '0.9rem', color: operationsSummary?.allDriverDutySlipsIssued ? '#059669' : '#d97706' }}>
                    {operationsSummary?.allDriverDutySlipsIssued ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                    <span>{operationsSummary?.allDriverDutySlipsIssued ? 'All Duty Slips Issued' : 'Awaiting Operations Dispatch'}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Hotel Reservations (Read-only) */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 10px 0' }}>
                  Hotel Reservations ({operationsSummary?.hotelReservations?.length || 0})
                </h4>
                {operationsSummary?.hotelReservations && operationsSummary.hotelReservations.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {operationsSummary.hotelReservations.map((r: HotelReservationDto) => (
                      <div
                        key={r.id}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            {r.hotelName || 'Reserved Hotel'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {r.roomCategoryName || 'Room'} &bull; Check-in: {formatDate(r.checkInDate)} &rarr; Check-out: {formatDate(r.checkOutDate)}
                          </div>
                          {r.voucherIssued && (
                            <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600, marginTop: 2 }}>
                              &bull; Hotel Voucher Issued by Operations
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: r.status === 'CONFIRMED' ? '#ecfdf5' : '#fffbeb',
                            color: r.status === 'CONFIRMED' ? '#065f46' : '#92400e',
                            border: r.status === 'CONFIRMED' ? '1px solid #a7f3d0' : '1px solid #fde68a',
                          }}
                        >
                          {r.status}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No hotel reservation records generated yet.
                  </p>
                )}
              </div>

              {/* Detailed Transport Assignments (Read-only) */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 10px 0' }}>
                  Transport & Driver Assignments ({operationsSummary?.transportAssignments?.length || 0})
                </h4>
                {operationsSummary?.transportAssignments && operationsSummary.transportAssignments.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {operationsSummary.transportAssignments.map((t: TransportAssignmentDto) => (
                      <div
                        key={t.id}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            {t.vehicleModel || t.vehicleCategory || 'Vehicle Service'}
                            {t.vehicleRegistrationNumber ? ` (${t.vehicleRegistrationNumber})` : ''}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            Chauffeur: {t.driverName ? `${t.driverName} (${t.driverMobile || 'No Mobile'})` : 'Awaiting Driver Assignment'}
                          </div>
                          {t.dutySlipIssued && (
                            <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600, marginTop: 2 }}>
                              &bull; Driver Duty Slip Dispatched
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: t.status === 'ASSIGNED' || t.status === 'DISPATCHED' ? '#eff6ff' : '#fffbeb',
                            color: t.status === 'ASSIGNED' || t.status === 'DISPATCHED' ? '#1e40af' : '#92400e',
                            border: t.status === 'ASSIGNED' || t.status === 'DISPATCHED' ? '1px solid #bfdbfe' : '1px solid #fde68a',
                          }}
                        >
                          {t.status}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No transport assignment records generated yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: SUBMIT PAYMENT ================= */}
      {isPaymentModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-modal)',
              width: '100%',
              maxWidth: 520,
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CreditCard size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Record Payment Submission
                </h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handlePaymentSubmit} style={{ padding: '24px' }}>
              {paymentError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    color: '#9f1239',
                    fontSize: '0.85rem',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{paymentError}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Amount */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                    Payment Amount (₹ INR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="e.g. 15000"
                    required
                    value={paymentAmountRupees}
                    onChange={(e) => setPaymentAmountRupees(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Remaining authoritative balance: {formatCurrency(balancePending)}
                  </div>
                </div>

                {/* Payment Type & Method */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                      Payment Type *
                    </label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        background: 'var(--bg-surface)',
                      }}
                    >
                      <option value="ADVANCE">Advance Payment</option>
                      <option value="PARTIAL">Part Payment</option>
                      <option value="FINAL_BALANCE">Final Settlement</option>
                      <option value="SECURITY_DEPOSIT">Security Deposit</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                      Payment Method *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        background: 'var(--bg-surface)',
                      }}
                    >
                      <option value="UPI">UPI / QR Code</option>
                      <option value="NEFT_IMPS">NEFT / RTGS / IMPS</option>
                      <option value="BANK_DEPOSIT">Bank Direct Deposit</option>
                      <option value="CASH">Direct Cash</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                      <option value="DEBIT_CARD">Debit Card</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                {/* Transaction Reference & Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                      UTR / Reference Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 428901234567"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                    Notes / Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Optional notes for Admin verifier..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Notice */}
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#f8fafc', border: '1px solid var(--border-subtle)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <strong>Important:</strong> Submitted payments will be recorded with status <code>SUBMITTED</code>. They will be reviewed and reconciled by an Administrator before crediting to the verified ledger.
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: paymentSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(15, 118, 110, 0.3)',
                  }}
                >
                  {paymentSubmitting ? 'Submitting...' : 'Submit Payment Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: REQUEST REFUND ================= */}
      {isRefundModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-modal)',
              width: '100%',
              maxWidth: 520,
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <RotateCcw size={20} style={{ color: '#9f1239' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Request Customer Refund
                </h3>
              </div>
              <button
                onClick={() => setIsRefundModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRefundSubmit} style={{ padding: '24px' }}>
              {refundError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    color: '#9f1239',
                    fontSize: '0.85rem',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{refundError}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Select Verified Payment */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                    Select Source Verified Payment *
                  </label>
                  <select
                    value={selectedPaymentForRefund}
                    onChange={(e) => {
                      setSelectedPaymentForRefund(e.target.value);
                      setRefundAmountRupees('');
                    }}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      background: 'var(--bg-surface)',
                    }}
                  >
                    {eligibleVerifiedPayments.map((p) => {
                      const allocated = p.allocatedRefundPaise || 0;
                      const headroom = (p.amountInPaise - allocated) / 100;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.receiptNumber} &bull; Total: ₹{p.amount} &bull; Available Headroom: ₹{headroom.toFixed(2)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Refund Amount */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                    Refund Amount (₹ INR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={selectedRemainingHeadroomRupees}
                    placeholder={`Max ₹${selectedRemainingHeadroomRupees.toFixed(2)}`}
                    required
                    value={refundAmountRupees}
                    onChange={(e) => setRefundAmountRupees(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 600, marginTop: 4 }}>
                    Remaining refundable headroom on selected payment: ₹{selectedRemainingHeadroomRupees.toFixed(2)}
                  </div>
                </div>

                {/* Refund Reason */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                    Mandatory Refund Reason *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="State reason for customer refund request (min 3 characters)..."
                    required
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Reference */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                    Transaction Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bank payout reference if already disbursed"
                    value={refundReference}
                    onChange={(e) => setRefundReference(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Warning */}
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#fff1f2', border: '1px solid #fecdd3', fontSize: '0.78rem', color: '#9f1239' }}>
                  <strong>Policy Notice:</strong> Submitting a refund request reserves headroom against the source verified payment. Only an Administrator can approve and verify the refund to adjust the verified ledger.
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundSubmitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: '#9f1239',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: refundSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {refundSubmitting ? 'Submitting...' : 'Submit Refund Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
