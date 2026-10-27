'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BookCheck,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  MapPin,
  ArrowRight,
  TrendingUp,
  CreditCard,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import { BookingDto, BookingStatus } from '@chirag/types';
import { apiPaginatedRequest, apiRequest } from '@/lib/api';
import { Pagination } from '@/components/Pagination';
import {
  BOOKING_STATUS_CONFIG,
  formatDate,
  formatCurrency,
  formatPaiseToRupees,
  sanitizeDisplayName,
} from '@/lib/labels';

interface BookingMetrics {
  total: number;
  quoteAccepted: number;
  pendingConfirmation: number;
  confirmed: number;
  operationalPreparation?: number;
  inTrip?: number;
  completed: number;
  cancelled: number;
}

const STATUS_FILTERS: { id: BookingStatus | 'ALL' | string; label: string }[] = [
  { id: 'ALL', label: 'All Bookings' },
  { id: 'QUOTE_ACCEPTED', label: 'Quote Accepted' },
  { id: 'PENDING_CONFIRMATION', label: 'Pending Confirm' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'OPERATIONAL_PREPARATION', label: 'Operational Prep' },
  { id: 'IN_TRIP', label: 'In Trip' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

function BookingsContent() {
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get('status') as BookingStatus | string | null;

  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [metrics, setMetrics] = useState<BookingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search State
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL' | string>(urlStatus || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Sync state if urlStatus changes
  useEffect(() => {
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
      setCurrentPage(1);
    }
  }, [urlStatus]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch metrics once & on refresh
  const fetchMetrics = async () => {
    try {
      const data = await apiRequest<BookingMetrics>('/bookings/metrics');
      setMetrics(data);
    } catch {
      // Non-blocking for metrics
    }
  };

  // Fetch bookings list
  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
      });

      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      const res = await apiPaginatedRequest<BookingDto[]>(`/bookings?${params.toString()}`);
      setBookings(res.data || []);
      setTotalRecords(res.meta?.total || (res.data ? res.data.length : 0));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bookings list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, debouncedSearch, currentPage, pageSize]);

  const handleStatusFilterChange = (status: BookingStatus | 'ALL' | string) => {
    setStatusFilter(status);
    setCurrentPage(1);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (status === 'ALL') {
        url.searchParams.delete('status');
      } else {
        url.searchParams.set('status', status);
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/60 shadow-sm">
              <BookCheck className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-outfit">
                Bookings & Payment Ledger
              </h1>
              <p className="text-sm text-slate-500">
                Manage confirmed customer bookings, tour commitments, and audit-verified payment ledgers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchMetrics();
              fetchBookings();
            }}
            disabled={loading}
            style={{
              padding: '8px 18px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '10px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
            className="hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50"
            title="Refresh bookings data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Bookings
            </span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <BookCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-outfit">
              {metrics ? metrics.total : '—'}
            </span>
            <span className="text-xs text-slate-500">all time</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Quotes Accepted
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-900 font-outfit">
              {metrics ? metrics.quoteAccepted : '—'}
            </span>
            <span className="text-xs text-blue-600 font-medium">awaiting advance</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
              Pending Confirm
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900 font-outfit">
              {metrics ? metrics.pendingConfirmation : '—'}
            </span>
            <span className="text-xs text-amber-600 font-medium">in verification</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              Confirmed Tours
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-900 font-outfit">
              {metrics ? metrics.confirmed : '—'}
            </span>
            <span className="text-xs text-emerald-600 font-medium">active bookings</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => handleStatusFilterChange(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              width: 17,
              height: 17,
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Booking # (e.g. BK-20261013-0001), Customer Name, or Phone..."
            style={{
              width: '100%',
              paddingLeft: 42,
              paddingRight: 16,
              paddingTop: 10,
              paddingBottom: 10,
              fontSize: '13.5px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold">Unable to load bookings</h4>
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchBookings}
            className="px-3 py-1 text-xs font-medium bg-rose-100 text-rose-800 rounded-md hover:bg-rose-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Bookings Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-16 bg-slate-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <BookCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              No bookings found
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No bookings match your current search or status filter. Try clearing the filters.'
                : 'Accepted customer quotations will automatically create bookings that appear here.'}
            </p>
            {(searchQuery || statusFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Booking #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Tour / Destination</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Package Total</th>
                  <th className="py-3 px-4 text-right">Verified Paid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {bookings.map((booking) => {
                  const statusCfg =
                    BOOKING_STATUS_CONFIG[booking.status] || {
                      label: booking.status,
                      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                      dotClass: 'bg-slate-400',
                    };

                  const totalPaise = booking.financials?.totalAmountInPaise ?? 0;
                  const paidPaise = booking.financials?.totalPaidInPaise ?? 0;
                  const balancePaise = booking.financials?.balancePendingInPaise ?? 0;
                  const excessPaidPaise = booking.financials?.excessPaidInPaise ?? 0;

                  // Determine financial badge status
                  const isFullyPaid = balancePaise === 0 && totalPaise > 0;
                  const hasCredit = excessPaidPaise > 0;
                  const hasPartial = paidPaise > 0 && balancePaise > 0;

                  return (
                    <tr
                      key={booking.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Booking Number */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                        <Link
                          href={`/bookings/${booking.id}`}
                          className="text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1"
                        >
                          <span>{booking.bookingNumber}</span>
                        </Link>
                        <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                          Created {formatDate(booking.createdAt)}
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{booking.customerName || 'Customer'}</span>
                        </div>
                        {booking.customerPhone && (
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{booking.customerPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Destination & Dates */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                          <span>{sanitizeDisplayName(booking.destinationName) || 'Custom Tour'}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            {booking.travelStartDate
                              ? `${formatDate(booking.travelStartDate)} • ${booking.durationNights || 0}N/${(booking.durationNights || 0) + 1}D`
                              : 'Dates pending'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.badgeClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`}
                          />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Financials: Package Total */}
                      <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                        {formatPaiseToRupees(totalPaise)}
                      </td>

                      {/* Financials: Verified Paid */}
                      <td className="py-3.5 px-4 text-right font-medium text-emerald-700">
                        {paidPaise > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            {formatPaiseToRupees(paidPaise)}
                          </span>
                        ) : (
                          <span className="text-slate-400">₹0</span>
                        )}
                      </td>

                      {/* Financials: Balance Pending or Customer Credit */}
                      <td className="py-3.5 px-4 text-right">
                        {hasCredit ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                            title="Excess payment recorded; credit pending commercial policy"
                          >
                            Excess: {formatPaiseToRupees(excessPaidPaise)}
                          </span>
                        ) : isFullyPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Fully Settled
                          </span>
                        ) : (
                          <div className="font-semibold text-slate-900">
                            {formatPaiseToRupees(balancePaise)}
                            {hasPartial && (
                              <div className="text-[10px] text-amber-600 font-normal">
                                Part Paid
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/bookings/${booking.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-700 hover:text-white transition-all shadow-sm"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {bookings.map((booking) => {
              const statusCfg =
                BOOKING_STATUS_CONFIG[booking.status] || {
                  label: booking.status,
                  badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                  dotClass: 'bg-slate-400',
                };

              const totalPaise = booking.financials?.totalAmountInPaise ?? 0;
              const paidPaise = booking.financials?.totalPaidInPaise ?? 0;
              const balancePaise = booking.financials?.balancePendingInPaise ?? 0;
              const excessPaidPaise = booking.financials?.excessPaidInPaise ?? 0;

              const isFullyPaid = balancePaise === 0 && totalPaise > 0;
              const hasCredit = excessPaidPaise > 0;
              const hasPartial = paidPaise > 0 && balancePaise > 0;

              return (
                <div
                  key={booking.id}
                  className="p-4 space-y-3 hover:bg-slate-50/70 transition-colors"
                >
                  {/* Top Row: Booking # and Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="font-mono font-bold text-teal-800 text-sm hover:underline"
                      >
                        {booking.bookingNumber}
                      </Link>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Created {formatDate(booking.createdAt)}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Middle Row: Customer and Destination Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Customer
                      </span>
                      <div className="font-semibold text-slate-800 truncate mt-0.5">
                        {booking.customerName || 'Customer'}
                      </div>
                      {booking.customerPhone ? (
                        <div className="text-slate-500 text-[11px] mt-0.5 truncate">
                          {booking.customerPhone}
                        </div>
                      ) : (
                        <div className="text-slate-400 text-[11px] italic mt-0.5">
                          None on file
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Destination
                      </span>
                      <div className="font-semibold text-slate-800 truncate mt-0.5">
                        {sanitizeDisplayName(booking.destinationName) || 'Custom Tour'}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5 truncate">
                        {booking.travelStartDate
                          ? `${formatDate(booking.travelStartDate)} • ${booking.durationNights || 0}N`
                          : 'Dates pending'}
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics Row */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Package Total
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {formatPaiseToRupees(totalPaise)}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Verified Paid
                      </span>
                      <span className="font-bold text-emerald-700">
                        {paidPaise > 0 ? formatPaiseToRupees(paidPaise) : '₹0'}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Balance Due
                      </span>
                      {hasCredit ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          Excess: {formatPaiseToRupees(excessPaidPaise)}
                        </span>
                      ) : isFullyPaid ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Settled
                        </span>
                      ) : (
                        <span className="font-bold text-slate-900">
                          {formatPaiseToRupees(balancePaise)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-700 hover:text-white transition-all shadow-xs w-full justify-center sm:w-auto"
                    >
                      <span>Manage Booking</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

        {/* Pagination Bar */}
        {totalRecords > 0 && (
          <div className="border-t border-slate-200 p-4">
            <Pagination
              currentPage={currentPage}
              totalItems={totalRecords}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              itemName="bookings"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingsListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
          <div className="flex items-center gap-3 text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
            <span className="font-medium text-sm">Loading bookings ledger...</span>
          </div>
        </div>
      }
    >
      <BookingsContent />
    </Suspense>
  );
}

