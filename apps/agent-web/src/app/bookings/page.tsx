'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CalendarCheck,
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
  CreditCard,
  ChevronRight,
  Sparkles,
  Receipt,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { BookingDto, BookingStatus } from '@chirag/types';
import { bookingsApi } from '@/lib/api';
import { Pagination } from '@/components/Pagination';
import {
  BOOKING_STATUS_CONFIG,
  formatDate,
  formatCurrency,
  formatPaiseToRupees,
  sanitizeDisplayName,
} from '@/lib/labels';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

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

const STATUS_FILTERS: { id: BookingStatus | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All Bookings' },
  { id: 'QUOTE_ACCEPTED', label: 'Quote Accepted' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'OPERATIONAL_PREPARATION', label: 'Operational Prep' },
  { id: 'IN_TRIP', label: 'In Trip' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

function BookingsListContent() {
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get('status') as BookingStatus | string | null;

  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [metrics, setMetrics] = useState<BookingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search State
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL'>(
    (urlStatus as BookingStatus) || 'ALL'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // Sync state if urlStatus changes
  useEffect(() => {
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus as BookingStatus);
      setCurrentPage(1);
    }
  }, [urlStatus]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      const res = await bookingsApi.getMetrics();
      setMetrics(res.data);
    } catch {
      // Non-blocking metrics failure
    }
  };

  // Fetch bookings with server-side pagination & filtering (supports silent background revalidation)
  const fetchBookings = async (background = false) => {
    if (!background) setLoading(true);
    setError(null);
    try {
      const res = await bookingsApi.list({
        page: currentPage,
        limit: pageSize,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: debouncedSearch || undefined,
      });

      setBookings(res.data || []);
      setTotalRecords(res.meta?.total || (res.data ? res.data.length : 0));
    } catch (err: any) {
      if (!background) setError(err?.message || 'Failed to load bookings from travel desk.');
    } finally {
      if (!background) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [currentPage, pageSize, statusFilter, debouncedSearch]);

  // Real-time synchronization via Server-Sent Events (SSE)
  useRealtimeSync({
    eventTypes: ['BOOKING_UPDATE', 'PAYMENT_UPDATE'],
    onRefresh: () => {
      fetchBookings(true);
      fetchMetrics();
    },
  });

  const handleRefresh = () => {
    fetchMetrics();
    fetchBookings();
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(15, 118, 110, 0.3)',
              }}
            >
              <CalendarCheck size={20} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-display)',
                  margin: 0,
                }}
              >
                My Bookings & Travel Desk
              </h1>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Manage customer accepted bookings, monitor operational readiness, and submit payment records.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 15px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'var(--transition-fast)',
            }}
            title="Refresh bookings"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div
          onClick={() => {
            setStatusFilter('ALL');
            setCurrentPage(1);
          }}
          style={{
            padding: '16px 18px',
            borderRadius: 'var(--radius-lg)',
            background: statusFilter === 'ALL' ? '#f0fdfa' : 'var(--bg-surface)',
            border: statusFilter === 'ALL' ? '2px solid #0f766e' : '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-xs)',
            cursor: 'pointer',
            transition: 'var(--transition-fast)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Bookings
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f766e', marginTop: 4 }}>
            {metrics?.total ?? '—'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 2 }}>
            Assigned to your desk
          </div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('QUOTE_ACCEPTED');
            setCurrentPage(1);
          }}
          style={{
            padding: '16px 18px',
            borderRadius: 'var(--radius-lg)',
            background: statusFilter === 'QUOTE_ACCEPTED' ? '#fffbeb' : 'var(--bg-surface)',
            border: statusFilter === 'QUOTE_ACCEPTED' ? '2px solid #d97706' : '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-xs)',
            cursor: 'pointer',
            transition: 'var(--transition-fast)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Quote Accepted
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#d97706', marginTop: 4 }}>
            {metrics?.quoteAccepted ?? '—'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 2 }}>
            Awaiting Admin confirmation
          </div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('CONFIRMED');
            setCurrentPage(1);
          }}
          style={{
            padding: '16px 18px',
            borderRadius: 'var(--radius-lg)',
            background: statusFilter === 'CONFIRMED' ? '#ecfdf5' : 'var(--bg-surface)',
            border: statusFilter === 'CONFIRMED' ? '2px solid #059669' : '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-xs)',
            cursor: 'pointer',
            transition: 'var(--transition-fast)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Confirmed
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#059669', marginTop: 4 }}>
            {metrics?.confirmed ?? '—'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 2 }}>
            Admin confirmed
          </div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('OPERATIONAL_PREPARATION');
            setCurrentPage(1);
          }}
          style={{
            padding: '16px 18px',
            borderRadius: 'var(--radius-lg)',
            background: statusFilter === 'OPERATIONAL_PREPARATION' ? '#eff6ff' : 'var(--bg-surface)',
            border: statusFilter === 'OPERATIONAL_PREPARATION' ? '2px solid #2563eb' : '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-xs)',
            cursor: 'pointer',
            transition: 'var(--transition-fast)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Operational Prep
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#2563eb', marginTop: 4 }}>
            {metrics?.operationalPreparation ?? '—'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 2 }}>
            Hotels & vehicles staging
          </div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('IN_TRIP');
            setCurrentPage(1);
          }}
          style={{
            padding: '16px 18px',
            borderRadius: 'var(--radius-lg)',
            background: statusFilter === 'IN_TRIP' ? '#f5f3ff' : 'var(--bg-surface)',
            border: statusFilter === 'IN_TRIP' ? '2px solid #7c3aed' : '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-xs)',
            cursor: 'pointer',
            transition: 'var(--transition-fast)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#6d28d9', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            In Trip / On Tour
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#7c3aed', marginTop: 4 }}>
            {metrics?.inTrip ?? '—'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 2 }}>
            Active traveling guests
          </div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('COMPLETED');
            setCurrentPage(1);
          }}
          style={{
            padding: '16px 18px',
            borderRadius: 'var(--radius-lg)',
            background: statusFilter === 'COMPLETED' ? '#f0fdfa' : 'var(--bg-surface)',
            border: statusFilter === 'COMPLETED' ? '2px solid #0d9488' : '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-xs)',
            cursor: 'pointer',
            transition: 'var(--transition-fast)',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#0f766e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Completed
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f766e', marginTop: 4 }}>
            {metrics?.completed ?? '—'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 2 }}>
            Trips fulfilled
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: 'var(--bg-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          border: '1px solid var(--border-subtle)',
          borderBottom: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.82rem',
                    fontWeight: active ? 700 : 500,
                    border: active ? '1px solid #0f766e' : '1px solid var(--border-subtle)',
                    background: active ? '#0f766e' : 'var(--bg-surface)',
                    color: active ? '#ffffff' : 'var(--text-main)',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: 280 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-subtle)',
              }}
            />
            <input
              type="text"
              placeholder="Search booking # or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-main)',
                fontSize: '0.85rem',
                color: 'var(--text-main)',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Table / List View */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {error && (
          <div
            style={{
              padding: '16px 20px',
              background: '#fff1f2',
              color: '#9f1239',
              borderBottom: '1px solid #fecdd3',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: '0.88rem',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div
              className="spin"
              style={{
                margin: '0 auto 14px auto',
                width: 32,
                height: 32,
                border: '3px solid var(--border-subtle)',
                borderTopColor: 'var(--primary)',
                borderRadius: '50%',
              }}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Loading authorized bookings from travel desk...
            </p>
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'var(--bg-surface-subtle)',
                color: 'var(--text-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <CalendarCheck size={26} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
              No Bookings Found
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto 16px auto' }}>
              {debouncedSearch || statusFilter !== 'ALL'
                ? 'No bookings match your selected filter or search term. Try resetting your search.'
                : 'When customers accept your issued quotation proposals, they will automatically appear here as booking requests ready for reservation and payment recording.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              {(debouncedSearch || statusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Clear Filters
                </button>
              )}
              <Link
                href="/quotations"
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                View Quotations
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Booking Details
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Customer / Guest
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Destination & Dates
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                    Financial Summary
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const statusConf = BOOKING_STATUS_CONFIG[booking.status] || {
                    label: booking.status,
                    badgeClass: 'badge-pending',
                    dotClass: 'bg-slate-400',
                    description: '',
                  };

                  const totalAmt = booking.financials?.totalAmount ?? 0;
                  const verifiedPaid = booking.financials?.totalPaid ?? 0;
                  const balancePending = booking.financials?.balancePending ?? totalAmt;
                  const excessPaid = booking.financials?.excessPaid ?? 0;

                  const travelers = booking.travelerSummary || {
                    numberOfAdults: 2,
                    numberOfChildren: 0,
                    numberOfInfants: 0,
                  };

                  return (
                    <tr
                      key={booking.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* Booking # & Quotation */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '0.92rem',
                              color: 'var(--primary)',
                            }}
                          >
                            {booking.bookingNumber}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          Created: {formatDate(booking.createdAt)}
                        </div>
                        {booking.quotationVersionUsed && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-subtle)', marginTop: 2 }}>
                            Proposal v{booking.quotationVersionUsed}
                          </div>
                        )}
                      </td>

                      {/* Customer Info */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                          {sanitizeDisplayName(booking.customerName)}
                        </div>
                        {booking.customerPhone && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.78rem',
                              color: 'var(--text-muted)',
                              marginTop: 3,
                            }}
                          >
                            <Phone size={12} />
                            <span>{booking.customerPhone}</span>
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 2 }}>
                          {travelers.numberOfAdults} Adults
                          {travelers.numberOfChildren > 0 ? `, ${travelers.numberOfChildren} Children` : ''}
                          {travelers.numberOfInfants > 0 ? `, ${travelers.numberOfInfants} Infants` : ''}
                        </div>
                      </td>

                      {/* Destination & Dates */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontWeight: 600,
                            color: 'var(--text-main)',
                          }}
                        >
                          <MapPin size={13} style={{ color: '#0f766e' }} />
                          <span>{booking.destinationName || 'Destination'}</span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            marginTop: 4,
                          }}
                        >
                          <Calendar size={12} />
                          <span>
                            {formatDate(booking.travelStartDate)} &rarr; {formatDate(booking.travelEndDate)}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-subtle)', marginTop: 2 }}>
                          {booking.durationNights}N / {booking.durationDays}D
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
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
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: 'currentColor',
                            }}
                          />
                          <span>{statusConf.label}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 4, maxWidth: 180 }}>
                          {statusConf.description}
                        </div>
                      </td>

                      {/* Authoritative Financials */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'top', textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                          {formatCurrency(totalAmt)}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, marginTop: 2 }}>
                          Verified Paid: {formatCurrency(verifiedPaid)}
                        </div>
                        {excessPaid > 0 ? (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: '#7e22ce',
                              fontWeight: 700,
                              marginTop: 1,
                            }}
                          >
                            Excess: {formatCurrency(excessPaid)}
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: '0.78rem',
                              color: balancePending > 0 ? '#d97706' : '#059669',
                              fontWeight: 600,
                              marginTop: 1,
                            }}
                          >
                            Balance: {formatCurrency(balancePending)}
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '16px 18px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <Link
                          href={`/bookings/${booking.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            border: '1px solid var(--primary-border)',
                            transition: 'var(--transition-fast)',
                          }}
                        >
                          <span>Manage</span>
                          <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalRecords}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 50]}
          itemName="bookings"
        />
      </div>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div
            className="spin"
            style={{
              margin: '0 auto 14px auto',
              width: 32,
              height: 32,
              border: '3px solid var(--border-subtle)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
            }}
          />
          <p style={{ color: 'var(--text-muted)' }}>Loading Agent Booking Desk...</p>
        </div>
      }
    >
      <BookingsListContent />
    </Suspense>
  );
}
