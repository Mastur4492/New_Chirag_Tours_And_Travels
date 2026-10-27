'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookCheck,
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
  HelpCircle,
} from 'lucide-react';
import {
  BookingDto,
  BookingStatus,
  PaymentMethod,
  PaymentRecordDto,
  PaymentType,
} from '@chirag/types';
import { apiRequest, getUserRole } from '@/lib/api';
import {
  BOOKING_STATUS_CONFIG,
  PAYMENT_METHOD_CONFIG,
  PAYMENT_STATUS_CONFIG,
  PAYMENT_TYPE_CONFIG,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPaiseToRupees,
} from '@/lib/labels';
import { OperationsManagementView } from '@/components/operations/OperationsManagementView';

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = params?.id as string;

  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [payments, setPayments] = useState<PaymentRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'ledger' | 'itinerary' | 'operations' | 'history'>(
    initialTab === 'operations'
      ? 'operations'
      : initialTab === 'itinerary'
      ? 'itinerary'
      : initialTab === 'history'
      ? 'history'
      : 'ledger'
  );
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'operations' || t === 'itinerary' || t === 'history' || t === 'ledger') {
      setActiveTab(t);
    }
  }, [searchParams]);

  // Toast Notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [verifyPaymentTarget, setVerifyPaymentTarget] = useState<PaymentRecordDto | null>(null);
  const [rejectPaymentTarget, setRejectPaymentTarget] = useState<PaymentRecordDto | null>(null);
  const [refundPaymentTarget, setRefundPaymentTarget] = useState<PaymentRecordDto | null>(null);

  // Form States - Manual Payment
  const [paymentAmountRupees, setPaymentAmountRupees] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('ADVANCE');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Form States - Rejection
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionSubmitting, setRejectionSubmitting] = useState(false);

  // Form States - Refund
  const [refundAmountRupees, setRefundAmountRupees] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundReference, setRefundReference] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  // Form States - Status Update
  const [newStatus, setNewStatus] = useState<BookingStatus>('CONFIRMED');
  const [statusReason, setStatusReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Verification in progress
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifySettlementRef, setVerifySettlementRef] = useState('');
  const [verifyNotes, setVerifyNotes] = useState('');

  // Fetch initial data
  const loadData = async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const [bookingData, paymentsData] = await Promise.all([
        apiRequest<BookingDto>(`/bookings/${bookingId}`),
        apiRequest<any>(`/payments/booking/${bookingId}`),
      ]);
      setBooking(bookingData);
      const list = Array.isArray(paymentsData)
        ? paymentsData
        : Array.isArray(paymentsData?.payments)
        ? paymentsData.payments
        : [];
      setPayments(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUserRole(getUserRole());
    loadData();
  }, [bookingId]);

  const isAdmin = userRole === 'ADMIN';

  // Handle Manual Payment Submit
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(paymentAmountRupees);
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Please enter a valid payment amount greater than ₹0', 'error');
      return;
    }

    setPaymentSubmitting(true);
    try {
      await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify({
          bookingId,
          amount: amountVal,
          paymentType,
          paymentMethod,
          transactionReference: paymentReference.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
          idempotencyKey: `MANUAL_PAY_${bookingId}_${Date.now()}`,
        }),
      });

      showToast('Payment recorded successfully! Awaiting Admin verification.');
      setIsPaymentModalOpen(false);
      setPaymentAmountRupees('');
      setPaymentReference('');
      setPaymentNotes('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to record payment', 'error');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Handle Payment Verification
  const handleConfirmVerify = async () => {
    if (!verifyPaymentTarget) return;

    if (verifyPaymentTarget.isRefund && !verifySettlementRef.trim()) {
      showToast('Settlement reference (e.g. payout UTR) is required to settle a refund payout', 'error');
      return;
    }

    setVerifySubmitting(true);
    try {
      await apiRequest(`/payments/${verifyPaymentTarget.id}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          settlementReference: verifySettlementRef.trim() || undefined,
          notes: verifyNotes.trim() || undefined,
        }),
      });
      showToast(
        verifyPaymentTarget.isRefund
          ? `Refund ${verifyPaymentTarget.receiptNumber} settled and deducted from net verified receipts!`
          : `Payment ${verifyPaymentTarget.receiptNumber} verified and credited to ledger!`
      );
      setVerifyPaymentTarget(null);
      setVerifySettlementRef('');
      setVerifyNotes('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Verification failed', 'error');
    } finally {
      setVerifySubmitting(false);
    }
  };

  // Handle Payment Rejection
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectPaymentTarget) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      showToast('Please provide a meaningful rejection reason (minimum 5 characters)', 'error');
      return;
    }

    setRejectionSubmitting(true);
    try {
      await apiRequest(`/payments/${rejectPaymentTarget.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          reason: rejectionReason.trim(),
        }),
      });
      showToast(`Payment ${rejectPaymentTarget.receiptNumber} rejected.`);
      setRejectPaymentTarget(null);
      setRejectionReason('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Rejection failed', 'error');
    } finally {
      setRejectionSubmitting(false);
    }
  };

  // Handle Refund Submit
  const handleRecordRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundPaymentTarget) return;
    const amountVal = parseFloat(refundAmountRupees);
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Please enter a valid refund amount', 'error');
      return;
    }
    if (!refundReason.trim() || refundReason.trim().length < 5) {
      showToast('Please specify a valid refund justification (min 5 characters)', 'error');
      return;
    }

    setRefundSubmitting(true);
    try {
      await apiRequest('/payments/refund', {
        method: 'POST',
        body: JSON.stringify({
          bookingId,
          originalPaymentId: refundPaymentTarget.id,
          amount: amountVal,
          refundReason: refundReason.trim(),
          transactionReference: refundReference.trim() || undefined,
          idempotencyKey: `REFUND_${refundPaymentTarget.id}_${Date.now()}`,
        }),
      });
      showToast('Refund processed successfully!');
      setRefundPaymentTarget(null);
      setRefundAmountRupees('');
      setRefundReason('');
      setRefundReference('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to record refund', 'error');
    } finally {
      setRefundSubmitting(false);
    }
  };

  // Handle Booking Status Update
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusSubmitting(true);
    try {
      await apiRequest(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          reason: statusReason.trim() || undefined,
        }),
      });
      showToast(`Booking status successfully updated to ${newStatus}`);
      setIsStatusModalOpen(false);
      setStatusReason('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update booking status', 'error');
    } finally {
      setStatusSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
        <h3 className="text-lg font-bold text-rose-900">Unable to load booking details</h3>
        <p className="text-sm text-rose-700 max-w-md mx-auto">{error || 'Booking not found'}</p>
        <Link
          href="/bookings"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-800 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Bookings
        </Link>
      </div>
    );
  }

  const statusCfg =
    BOOKING_STATUS_CONFIG[booking.status] || {
      label: booking.status,
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      dotClass: 'bg-slate-400',
      description: '',
    };

  const totalPaise = booking.financials?.totalAmountInPaise ?? 0;
  const advanceReqPaise = booking.financials?.advanceRequiredInPaise ?? 0;
  const totalPaidPaise = booking.financials?.totalPaidInPaise ?? 0;
  const balancePaise = booking.financials?.balancePendingInPaise ?? 0;
  const excessPaidPaise = booking.financials?.excessPaidInPaise ?? 0;

  const isOverpaid = excessPaidPaise > 0;
  const isSettled = balancePaise === 0 && totalPaise > 0;

  // Pending verification count
  const pendingPaymentsCount = payments.filter((p) => p.status === 'SUBMITTED').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/bookings" className="hover:text-teal-700 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Bookings List</span>
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-mono font-semibold">{booking.bookingNumber}</span>
      </div>

      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-slate-900">{booking.bookingNumber}</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg.badgeClass}`}
            >
              <span className={`w-2 h-2 rounded-full ${statusCfg.dotClass}`} />
              {statusCfg.label}
            </span>
            {pendingPaymentsCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                <Clock className="w-3 h-3 text-amber-600" />
                {pendingPaymentsCount} Pending Verification
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Created on {formatDateTime(booking.createdAt)} • Accepted Quotation v
            {booking.quotationVersionUsed}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveTab('operations')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-all shadow-sm ${
              activeTab === 'operations'
                ? 'bg-teal-700 text-white'
                : 'text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Operations & Vouchers</span>
          </button>

          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-teal-700 rounded-xl hover:bg-teal-800 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setNewStatus(booking.status);
                setIsStatusModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Update Booking Status</span>
            </button>
          )}
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Amount */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Package Value
          </span>
          <div className="mt-2 text-2xl font-bold font-outfit text-slate-900">
            {formatPaiseToRupees(totalPaise)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {booking.financials?.taxAmount ? (
              <span>Incl. GST {formatCurrency(booking.financials.taxAmount)}</span>
            ) : (
              <span>All taxes included</span>
            )}
          </div>
        </div>

        {/* Advance Required */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
            Advance Required
          </span>
          <div className="mt-2 text-2xl font-bold font-outfit text-blue-900">
            {formatPaiseToRupees(advanceReqPaise)}
          </div>
          <div className="mt-1 text-xs text-blue-700">
            {advanceReqPaise > 0
              ? `${Math.round((advanceReqPaise / (totalPaise || 1)) * 100)}% of package`
              : 'Zero advance required'}
          </div>
        </div>

        {/* Net Verified Paid */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
            Net Verified Paid
          </span>
          <div className="mt-2 text-2xl font-bold font-outfit text-emerald-900">
            {formatPaiseToRupees(totalPaidPaise)}
          </div>
          <div className="mt-1 text-xs text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Audit-verified ledger total</span>
          </div>
        </div>

        {/* Balance Pending / Customer Credit */}
        <div
          className={`p-5 rounded-2xl border shadow-sm ${
            isOverpaid
              ? 'bg-purple-50/50 border-purple-200'
              : isSettled
              ? 'bg-emerald-50/50 border-emerald-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <span
            className={`text-xs font-bold uppercase tracking-wider block ${
              isOverpaid
                ? 'text-purple-700'
                : isSettled
                ? 'text-emerald-700'
                : 'text-slate-500'
            }`}
          >
            {isOverpaid ? 'Unresolved Excess' : isSettled ? 'Account Status' : 'Balance Pending'}
          </span>
          <div
            className={`mt-2 text-2xl font-bold font-outfit ${
              isOverpaid
                ? 'text-purple-900'
                : isSettled
                ? 'text-emerald-900'
                : 'text-slate-900'
            }`}
          >
            {isOverpaid
              ? formatPaiseToRupees(excessPaidPaise)
              : isSettled
              ? '₹0 (Settled)'
              : formatPaiseToRupees(balancePaise)}
          </div>
          <div className="mt-1 text-xs">
            {isOverpaid ? (
              <span className="text-purple-700 font-medium">
                Excess received; awaiting owner settlement / credit decision
              </span>
            ) : isSettled ? (
              <span className="text-emerald-700 font-medium">Full package paid</span>
            ) : (
              <span className="text-amber-700 font-medium">Outstanding to collect</span>
            )}
          </div>
        </div>
      </div>

      {/* Overpayment Warning Banner if Unresolved Excess Exists */}
      {excessPaidPaise > 0 && (
        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 flex items-start gap-3 text-xs">
          <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-sm block">
              Unresolved Excess Payment: {formatPaiseToRupees(excessPaidPaise)}
            </span>
            <p className="text-purple-800">
              Verified customer payments exceed the authoritative selling price. Outstanding balance is clamped to ₹0.
              Automatic customer credit and automated refund payouts are disabled pending formal owner / CA approval.
            </p>
          </div>
        </div>
      )}

      {/* Decoupled Confirmation Banner */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-0.5">
          <p className="font-semibold text-amber-950">
            Important Commercial & Operational Guardrail
          </p>
          <p className="text-amber-800 leading-relaxed">
            Verifying a payment records funds in the accounting ledger. It does <strong>NOT</strong>{' '}
            automatically lock hotel room inventory, assign drivers, or change the booking to CONFIRMED.
            Business and inventory confirmations must be executed separately by authorized personnel.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-6">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'ledger'
              ? 'border-teal-700 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Payment Ledger ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('operations')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'operations'
              ? 'border-teal-700 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Operations & Vouchers</span>
        </button>

        <button
          onClick={() => setActiveTab('itinerary')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'itinerary'
              ? 'border-teal-700 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Tour & Itinerary Details</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-teal-700 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit History ({booking.history?.length || 0})</span>
        </button>
      </div>

      {/* Tab 1: Payment Ledger */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-outfit">
                Financial Transactions & Verification Audit
              </h3>
              <p className="text-xs text-slate-500">
                All customer transactions recorded against this booking. Only VERIFIED payments are
                summed into the net paid total.
              </p>
            </div>
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {payments.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-800">No payment records yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click &quot;Record Payment&quot; above to submit an advance or partial payment for Admin
                  verification.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Receipt #</th>
                      <th className="py-3 px-4">Type & Method</th>
                      <th className="py-3 px-4">Transaction Ref</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date / Recorded By</th>
                      <th className="py-3 px-4 text-center">Audit Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => {
                      const statusConfig =
                        PAYMENT_STATUS_CONFIG[p.status] || {
                          label: p.status,
                          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                          dotClass: 'bg-slate-400',
                        };

                      const typeConfig =
                        PAYMENT_TYPE_CONFIG[p.paymentType] || {
                          label: p.paymentType,
                          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                        };

                      const methodConfig =
                        PAYMENT_METHOD_CONFIG[p.paymentMethod] || {
                          label: p.paymentMethod,
                        };

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Receipt Number */}
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                            {p.receiptNumber}
                            {p.isRefund && (
                              <span
                                className={`block text-[10px] font-sans font-semibold mt-0.5 ${
                                  p.status === 'VERIFIED'
                                    ? 'text-emerald-700'
                                    : p.status === 'REJECTED'
                                    ? 'text-slate-500'
                                    : 'text-amber-700'
                                }`}
                              >
                                {p.status === 'VERIFIED'
                                  ? 'Settled Refund Payout'
                                  : p.status === 'REJECTED'
                                  ? 'Rejected Refund'
                                  : 'Submitted Refund Request'}
                              </span>
                            )}
                          </td>

                          {/* Type & Method */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${typeConfig.badgeClass}`}
                            >
                              {typeConfig.label}
                            </span>
                            <div className="text-xs text-slate-500 mt-1">{methodConfig.label}</div>
                          </td>

                          {/* Transaction Reference */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-xs text-slate-700">
                              {p.transactionReference || '—'}
                            </span>
                            {p.settlementReference && (
                              <div className="text-[11px] text-emerald-700 font-mono font-medium mt-0.5">
                                Settlement UTR: {p.settlementReference}
                              </div>
                            )}
                            {p.notes && (
                              <div className="text-[11px] text-slate-500 italic mt-0.5 max-w-xs truncate">
                                &quot;{p.notes}&quot;
                              </div>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`font-semibold font-outfit ${
                                p.isRefund ? 'text-rose-700' : 'text-slate-900'
                              }`}
                            >
                              {p.isRefund ? '-' : ''}
                              {formatPaiseToRupees(p.amountInPaise)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                p.isRefund && p.status === 'VERIFIED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : p.isRefund && p.status === 'SUBMITTED'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : statusConfig.badgeClass
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  p.isRefund && p.status === 'VERIFIED'
                                    ? 'bg-emerald-500'
                                    : p.isRefund && p.status === 'SUBMITTED'
                                    ? 'bg-amber-500'
                                    : statusConfig.dotClass
                                }`}
                              />
                              {p.isRefund && p.status === 'VERIFIED'
                                ? 'Refund Settled'
                                : p.isRefund && p.status === 'SUBMITTED'
                                ? 'Refund Requested'
                                : statusConfig.label}
                            </span>
                            {p.status === 'REJECTED' && p.rejectionReason && (
                              <div className="text-[11px] text-rose-700 mt-1 max-w-xs">
                                <strong>Reason:</strong> {p.rejectionReason}
                              </div>
                            )}
                          </td>

                          {/* Date & Submitter */}
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            <div>{formatDate(p.paymentDate || p.createdAt)}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {p.verifiedAt ? `Verified ${formatDate(p.verifiedAt)}` : 'Recorded'}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            {isAdmin && p.status === 'SUBMITTED' ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setVerifyPaymentTarget(p)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors"
                                  title="Audit and verify payment"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Verify</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectPaymentTarget(p);
                                    setRejectionReason('');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-300 rounded-lg hover:bg-rose-100 transition-colors"
                                  title="Reject unverified payment"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : isAdmin && p.status === 'VERIFIED' && !p.isRefund ? (
                              <button
                                onClick={() => {
                                  setRefundPaymentTarget(p);
                                  setRefundAmountRupees('');
                                  setRefundReason('');
                                  setRefundReference('');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors"
                                title="Issue partial or full refund"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Refund</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
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
        </div>
      )}

      {/* Tab 2: Tour & Itinerary Details */}
      {activeTab === 'itinerary' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer & Traveler Summary */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-teal-700" />
              <span>Customer Details</span>
            </h4>
            <div className="space-y-2.5 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">Name</span>
                <span className="font-semibold text-slate-900">
                  {booking.customerName || 'Registered Customer'}
                </span>
              </div>
              {booking.customerPhone && (
                <div>
                  <span className="text-xs text-slate-400 block">Phone Number</span>
                  <span className="font-mono text-slate-800">{booking.customerPhone}</span>
                </div>
              )}
              {booking.customerEmail && (
                <div>
                  <span className="text-xs text-slate-400 block">Email Address</span>
                  <span className="text-slate-800">{booking.customerEmail}</span>
                </div>
              )}
              <div>
                <span className="text-xs text-slate-400 block">Party Size</span>
                <span className="text-slate-800 font-medium">
                  {booking.travelerSummary?.numberOfAdults || 2} Adults
                  {booking.travelerSummary?.numberOfChildren
                    ? ` • ${booking.travelerSummary.numberOfChildren} Children`
                    : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Quotation & Destination Summary */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-700" />
              <span>Destination & Proposal</span>
            </h4>
            <div className="space-y-2.5 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">Destination</span>
                <span className="font-semibold text-slate-900">
                  {booking.destinationName || 'Custom Travel Circuit'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Travel Dates</span>
                <span className="text-slate-800">
                  {booking.travelStartDate
                    ? `${formatDate(booking.travelStartDate)} to ${formatDate(booking.travelEndDate)}`
                    : 'Pending finalization'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Duration</span>
                <span className="text-slate-800">
                  {booking.durationNights || 0} Nights / {(booking.durationNights || 0) + 1} Days
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Accepted Quotation</span>
                <Link
                  href={`/quotations`}
                  className="text-xs text-teal-700 hover:underline font-mono"
                >
                  View Quotations (v{booking.quotationVersionUsed})
                </Link>
              </div>
            </div>
          </div>

          {/* Operational Status Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-700" />
                <span>Operations Readiness</span>
              </h4>
              <button
                onClick={() => setActiveTab('operations')}
                className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 font-semibold"
              >
                <span>Manage Dispatch</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-600 space-y-2.5">
              <div className="flex items-center justify-between">
                <span>Hotel Vouchers:</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                    booking.hotelVoucherGenerated
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {booking.hotelVoucherGenerated ? 'Generated & Issued' : 'Pending Generation'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Fleet & Driver Duty Slips:</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                    booking.driverDutySlipGenerated
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {booking.driverDutySlipGenerated ? 'Assigned & Dispatched' : 'Pending Assignment'}
                </span>
              </div>
            </div>
          </div>

          {/* Itinerary Snapshot Days */}
          {booking.itinerarySnapshot?.days && booking.itinerarySnapshot.days.length > 0 && (
            <div className="md:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-700" />
                <span>Day-by-Day Tour Program Snapshot</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {booking.itinerarySnapshot.days.map((day: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-teal-800">
                      <span>Day {day.dayNumber || idx + 1}</span>
                      {day.title && <span className="text-slate-700">{day.title}</span>}
                    </div>
                    {day.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">{day.description}</p>
                    )}
                    {day.hotel && (
                      <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>Hotel: {day.hotel}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Operations & Fleet Management */}
      {activeTab === 'operations' && (
        <OperationsManagementView bookingId={bookingId} onRefreshParent={loadData} />
      )}

      {/* Tab 3: History & Audit Timeline */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 font-outfit">
            Booking Event & Transition Timeline
          </h3>
          <p className="text-xs text-slate-500">
            Immutable audit record of all state transitions and management updates.
          </p>

          <div className="space-y-4 pt-2">
            {booking.history && booking.history.length > 0 ? (
              booking.history.map((h: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 relative pb-4 last:pb-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-600 mt-1 flex-shrink-0" />
                  <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : h.toStatus || 'Updated'}
                      </span>
                      <span className="text-slate-400">{formatDateTime(h.timestamp)}</span>
                    </div>
                    {h.reason && (
                      <p className="text-xs text-slate-600 mt-1 italic">&quot;{h.reason}&quot;</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Initial booking created upon customer quotation acceptance.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Manual Payment Submission */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-teal-700" />
                <h3 className="text-base font-bold text-slate-900">Record Manual Payment</h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Verification Notice:</strong> Manually recorded payments start in{' '}
                  <span className="font-semibold underline">SUBMITTED</span> state. They will only
                  reflect in the verified net ledger after an Administrator audits and verifies the
                  transaction.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Amount (in ₹ INR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={paymentAmountRupees}
                    onChange={(e) => setPaymentAmountRupees(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full pl-8 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Type *
                  </label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
                  >
                    <option value="ADVANCE">Advance Payment</option>
                    <option value="PARTIAL">Part Payment</option>
                    <option value="FINAL_BALANCE">Final Settlement</option>
                    <option value="SECURITY_DEPOSIT">Security Deposit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
                  >
                    <option value="UPI">UPI / QR Scan</option>
                    <option value="NEFT_IMPS">NEFT / RTGS / IMPS</option>
                    <option value="BANK_DEPOSIT">Bank Cash/Transfer Deposit</option>
                    <option value="CASH">Direct Cash</option>
                    <option value="CHEQUE">Cheque / Demand Draft</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="DEBIT_CARD">Debit Card</option>
                    <option value="OTHER">Other Method</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Reference / UTR Number
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. UTR123456789012 or Cheque # 452109"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audit Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Optional details regarding receipt or customer communication..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  {paymentSubmitting ? 'Recording...' : 'Submit Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Admin Verify Payment / Settle Refund */}
      {verifyPaymentTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-emerald-800">
              <span className="p-2 bg-emerald-100 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-700" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {verifyPaymentTarget.isRefund ? 'Verify & Settle Refund Payout' : 'Verify Payment Receipt'}
                </h3>
                <p className="text-xs text-slate-500">
                  {verifyPaymentTarget.isRefund ? 'Refund ' : ''}Receipt #{verifyPaymentTarget.receiptNumber}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              {verifyPaymentTarget.isRefund ? (
                <>
                  Confirm that the refund of{' '}
                  <strong className="text-slate-900">
                    {formatPaiseToRupees(verifyPaymentTarget.amountInPaise)}
                  </strong>{' '}
                  has been transferred/paid out to the customer. This action will deduct the amount from net verified receipts in the ledger.
                </>
              ) : (
                <>
                  Are you sure you want to verify this payment of{' '}
                  <strong className="text-slate-900">
                    {formatPaiseToRupees(verifyPaymentTarget.amountInPaise)}
                  </strong>
                  ? This action will formally credit the amount to the booking ledger.
                </>
              )}
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-600">
              <div>
                <strong>Method:</strong> {verifyPaymentTarget.paymentMethod}
              </div>
              <div>
                <strong>Reference:</strong> {verifyPaymentTarget.transactionReference || 'None'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {verifyPaymentTarget.isRefund
                  ? 'Bank Settlement / Payout Reference UTR *'
                  : 'Verification / Bank Reference UTR'}
              </label>
              <input
                type="text"
                required={verifyPaymentTarget.isRefund}
                value={verifySettlementRef}
                onChange={(e) => setVerifySettlementRef(e.target.value)}
                placeholder={verifyPaymentTarget.isRefund ? 'e.g. UTR-PAYOUT-987654 (Required)' : 'e.g. UTR1234567890'}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audit Notes / Remarks
              </label>
              <textarea
                rows={2}
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="Optional audit remarks regarding verification or payout..."
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setVerifyPaymentTarget(null);
                  setVerifySettlementRef('');
                  setVerifyNotes('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVerify}
                disabled={verifySubmitting || (verifyPaymentTarget.isRefund && !verifySettlementRef.trim())}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                {verifySubmitting
                  ? 'Verifying...'
                  : verifyPaymentTarget.isRefund
                  ? 'Confirm Payout & Settle Refund'
                  : 'Confirm & Credit Ledger'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Admin Reject Payment */}
      {rejectPaymentTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-800">
              <span className="p-2 bg-rose-100 rounded-xl">
                <XCircle className="w-6 h-6 text-rose-700" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reject Payment</h3>
                <p className="text-xs text-slate-500">Receipt #{rejectPaymentTarget.receiptNumber}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rejection Reason * (Mandatory for audit trail)
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Funds not reflected in bank statement, invalid UTR, or duplicate submission..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectPaymentTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectionSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  {rejectionSubmitting ? 'Rejecting...' : 'Reject Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Admin Record Refund */}
      {refundPaymentTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-800">
              <span className="p-2 bg-rose-100 rounded-xl">
                <RotateCcw className="w-6 h-6 text-rose-700" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Customer Refund</h3>
                <p className="text-xs text-slate-500">
                  Against Receipt #{refundPaymentTarget.receiptNumber}
                </p>
              </div>
            </div>

            <form onSubmit={handleRecordRefund} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <span className="block font-semibold">Available Refund Headroom:</span>
                <span className="font-outfit text-base font-bold text-slate-900">
                  {formatPaiseToRupees(
                    (refundPaymentTarget.amountInPaise || 0) -
                      (refundPaymentTarget.allocatedRefundPaise || 0)
                  )}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Refund Amount (in ₹ INR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={refundAmountRupees}
                  onChange={(e) => setRefundAmountRupees(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Refund Justification / Reason *
                </label>
                <textarea
                  rows={2}
                  required
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Tour cancellation, itinerary downgrade, or excess advance settlement..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Outflow Reference / UTR
                </label>
                <input
                  type="text"
                  value={refundReference}
                  onChange={(e) => setRefundReference(e.target.value)}
                  placeholder="e.g. REFUND-UTR-998877"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundPaymentTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  {refundSubmitting ? 'Recording...' : 'Process Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Admin Update Booking Status */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-teal-100 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-teal-800" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Update Booking Status</h3>
                <p className="text-xs text-slate-500">Booking #{booking.bookingNumber}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Status *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as BookingStatus)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
                >
                  <option value="QUOTE_ACCEPTED">Quote Accepted</option>
                  <option value="PENDING_CONFIRMATION">Pending Confirmation</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="OPERATIONAL_PREPARATION">Operational Preparation</option>
                  <option value="IN_TRIP">In Trip</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audit Reason / Confirmation Notes
                </label>
                <textarea
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="State operational verification or commercial reason for this update..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  {statusSubmitting ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
