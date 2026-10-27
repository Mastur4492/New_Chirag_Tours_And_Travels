'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  BookCheck,
  Building2,
  Calendar,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  FileCheck,
  FileSpreadsheet,
  Filter,
  History,
  Layers,
  LayoutDashboard,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { BookingDto, BookingStatus } from '@chirag/types';
import { apiRequest, getUserRole } from '@/lib/api';
import {
  BOOKING_STATUS_CONFIG,
  formatDate,
  formatPaiseToRupees,
} from '@/lib/labels';
import { OperationsManagementView } from '@/components/operations/OperationsManagementView';

type ReadinessFilter =
  | 'ALL'
  | 'NEEDS_HOTEL'
  | 'NEEDS_TRANSPORT'
  | 'DISPATCHED'
  | 'PENDING_CANCELLATION';

const SAMPLE_PREVIEW_BOOKING: BookingDto = {
  id: 'demo-booking-kashmir',
  bookingNumber: 'NCT-BK-2026-0042',
  quotationId: 'quote-sample-01',
  quotationVersionUsed: 2,
  leadId: 'lead-sample-01',
  customerId: {
    fullName: 'Aarav Patel & Family',
    phone: '+91 98250 11223',
    email: 'aarav.patel@example.com',
  } as any,
  assignedAgentId: 'agent-sample-01',
  destinationId: {
    name: 'Kashmir (Srinagar - Gulmarg - Pahalgam)',
  } as any,
  travelStartDate: '2026-11-01',
  travelEndDate: '2026-11-06',
  durationNights: 5,
  durationDays: 6,
  travelerSummary: {
    numberOfAdults: 2,
    numberOfChildren: 1,
    numberOfInfants: 0,
  },
  status: 'CONFIRMED',
  financials: {
    totalAmount: 99750,
    totalAmountInPaise: 9975000,
    currency: 'INR',
    advanceRequired: 50000,
    advanceRequiredInPaise: 5000000,
    totalPaid: 50000,
    totalPaidInPaise: 5000000,
    balancePending: 49750,
    balancePendingInPaise: 4975000,
  },
  hotelVoucherGenerated: true,
  driverDutySlipGenerated: true,
  createdAt: '2026-10-14T09:00:00.000Z',
  updatedAt: '2026-10-14T10:50:00.000Z',
};

export default function OperationsDashboardPage() {
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string>('ADMIN');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ReadinessFilter>('ALL');

  // Active Selected Booking for Operations Drawer / Console
  const [activeConsoleBooking, setActiveConsoleBooking] = useState<BookingDto | null>(null);

  useEffect(() => {
    const role = getUserRole();
    if (role) setUserRole(role);
    loadBookings();
  }, []);

  const loadBookings = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      // Fetch operational bookings (both OPERATIONAL_PREPARATION and IN_TRIP)
      const res = await apiRequest<{ bookings: BookingDto[]; total: number }>(
        '/bookings?limit=100'
      );
      setBookings(res.bookings || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load operational bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const effectiveBookings = bookings;

  // Filter Bookings
  const filteredBookings = useMemo(() => {
    let result = effectiveBookings.filter((b) =>
      ['CONFIRMED', 'OPERATIONAL_PREPARATION', 'IN_TRIP', 'CANCELLED'].includes(b.status)
    );

    // Filter by Readiness / Status
    if (activeFilter === 'NEEDS_HOTEL') {
      result = result.filter((b) => b.status !== 'CANCELLED' && !b.hotelVoucherGenerated);
    } else if (activeFilter === 'NEEDS_TRANSPORT') {
      result = result.filter((b) => b.status !== 'CANCELLED' && !b.driverDutySlipGenerated);
    } else if (activeFilter === 'DISPATCHED') {
      result = result.filter((b) => b.status === 'IN_TRIP' || (b.hotelVoucherGenerated && b.driverDutySlipGenerated));
    } else if (activeFilter === 'PENDING_CANCELLATION') {
      result = result.filter((b) => b.status === 'CANCELLED');
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.bookingNumber.toLowerCase().includes(q) ||
          (b.customerId as any)?.fullName?.toLowerCase().includes(q) ||
          (b.destinationId as any)?.name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [effectiveBookings, activeFilter, searchQuery]);

  // Aggregate KPI Metrics
  const metrics = useMemo(() => {
    const active = effectiveBookings.filter((b) =>
      ['CONFIRMED', 'OPERATIONAL_PREPARATION', 'IN_TRIP'].includes(b.status)
    );
    const pendingCancellation = effectiveBookings.filter((b) => b.status === 'CANCELLED').length;
    const missingVouchers = active.filter((b) => !b.hotelVoucherGenerated).length;
    const missingDutySlips = active.filter((b) => !b.driverDutySlipGenerated).length;
    const readyForTrip = active.filter((b) => b.hotelVoucherGenerated && b.driverDutySlipGenerated).length;

    return {
      totalActive: active.length,
      missingVouchers,
      missingDutySlips,
      readyForTrip,
      pendingCancellation,
    };
  }, [effectiveBookings]);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Tour Operations & Dispatch Console
          </h1>
          <p className="text-xs text-slate-500">
            Hotel confirmation references, immutable vouchers, cab schedule locks and chauffeur duty slips
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadBookings(true)}
            disabled={refreshing}
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
            className="hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Operations</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Operations</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.totalActive}</div>
          <div className="text-[11px] text-slate-500">Confirmed tour bookings</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Voucher Needed</span>
            <Building2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{metrics.missingVouchers}</div>
          <div className="text-[11px] text-slate-500">Awaiting hotel confirmation</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Duty Slip Needed</span>
            <Car className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600">{metrics.missingDutySlips}</div>
          <div className="text-[11px] text-slate-500">Awaiting fleet assignment</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">100% Trip Ready</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{metrics.readyForTrip}</div>
          <div className="text-[11px] text-slate-500">Vouchers & slips generated</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Cancel</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">{metrics.pendingCancellation}</div>
          <div className="text-[11px] text-slate-500">Awaiting supplier signoff</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {[
            { key: 'ALL' as const, label: `All In Operations (${bookings.length})`, activeBg: '#0F172A', activeColor: '#FFFFFF' },
            { key: 'NEEDS_HOTEL' as const, label: `Vouchers Needed (${metrics.missingVouchers})`, activeBg: '#D97706', activeColor: '#FFFFFF' },
            { key: 'NEEDS_TRANSPORT' as const, label: `Cabs / Drivers Needed (${metrics.missingDutySlips})`, activeBg: '#2563EB', activeColor: '#FFFFFF' },
            { key: 'DISPATCHED' as const, label: `Trip Ready (${metrics.readyForTrip})`, activeBg: '#059669', activeColor: '#FFFFFF' },
            { key: 'PENDING_CANCELLATION' as const, label: `Pending Supplier Cancel (${metrics.pendingCancellation})`, activeBg: '#E11D48', activeColor: '#FFFFFF' },
          ].map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 10,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: isActive ? 'none' : '1px solid #E2E8F0',
                  background: isActive ? tab.activeBg : '#FFFFFF',
                  color: isActive ? tab.activeColor : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search booking #, guest, destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 36,
              paddingRight: 12,
              paddingTop: 7,
              paddingBottom: 7,
              fontSize: '12px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Bookings Operations Table */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">
            Loading Operations Pipeline...
          </h4>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div
          style={{
            maxWidth: '640px',
            margin: '28px auto',
            padding: '44px 28px',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              color: '#059669',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <ShieldCheck size={28} />
          </div>
          {bookings.length === 0 ? (
            <>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
                No Bookings Currently in Operations
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.55 }}>
                Confirmed tour bookings automatically enter operations for hotel vouchers, vehicle scheduling, and chauffeur duty slips.
              </p>
              <Link
                href="/bookings"
                prefetch={true}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 20px',
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <span>View Bookings Registry</span>
                <ChevronRight size={15} />
              </Link>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
                No Bookings Match Selected Filter
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '440px', margin: '0 auto 18px', lineHeight: 1.55 }}>
                Try selecting a different readiness tab or clearing the search query.
              </p>
              <button
                onClick={() => {
                  setActiveFilter('ALL');
                  setSearchQuery('');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                }}
              >
                Reset Operational Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Booking #</th>
                  <th className="py-2.5 px-3">Guest Party</th>
                  <th className="py-2.5 px-3">Destination & Dates</th>
                  <th className="py-2.5 px-2 text-center">Vouchers</th>
                  <th className="py-2.5 px-2 text-center">Duty Slips</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {filteredBookings.map((b) => {
                  const statusCfg = BOOKING_STATUS_CONFIG[b.status];
                  const customer = b.customerId as any;
                  const destination = b.destinationId as any;

                  return (
                    <tr
                      key={b.id || (b as any)._id || b.bookingNumber}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                      onClick={() => setActiveConsoleBooking(b)}
                    >
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900 font-mono text-xs">
                          {b.bookingNumber}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {b.durationNights}N/{b.durationDays}D
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 text-xs">
                          {customer?.fullName || 'Guest Customer'}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          <span>{customer?.phone || customer?.mobile || '+91 98250 11223'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{destination?.name || 'Kashmir Circuit'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formatDate(b.travelStartDate)} ➔ {formatDate(b.travelEndDate)}
                        </div>
                      </td>

                      {/* Hotel Voucher Indicator */}
                      <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        {b.status === 'CANCELLED' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            CANCELLED
                          </span>
                        ) : b.hotelVoucherGenerated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ISSUED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            PENDING
                          </span>
                        )}
                      </td>

                      {/* Driver Duty Slip Indicator */}
                      <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        {b.status === 'CANCELLED' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            CANCELLED
                          </span>
                        ) : b.driverDutySlipGenerated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" />
                            ISSUED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            PENDING
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg?.badgeClass || 'bg-slate-100'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg?.dotClass || 'bg-slate-400'}`} />
                          {statusCfg?.label || b.status}
                        </span>
                      </td>

                      {/* Operations Action */}
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveConsoleBooking(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shadow-sm transition"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                            Manage Operations
                          </button>
                          <Link
                            href={`/bookings/${b.id || (b as any)._id}?tab=operations`}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                            title="Open full booking record"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* OPERATIONS CONSOLE DRAWER / MODAL                                   */}
      {/* =================================================================== */}
      {activeConsoleBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6">
          <div className="relative w-full max-w-5xl bg-slate-50 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      Operations Management Console
                    </h3>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                      {activeConsoleBooking.bookingNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Hotel supplier reservations, fleet schedule locks and immutable document issuance
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/bookings/${activeConsoleBooking.id || (activeConsoleBooking as any)._id}?tab=operations`}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                >
                  Full Booking View
                </Link>
                <button
                  id="close-operations-drawer-btn"
                  onClick={() => {
                    setActiveConsoleBooking(null);
                    loadBookings(true);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  aria-label="Close operations drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <OperationsManagementView
                bookingId={activeConsoleBooking.id || (activeConsoleBooking as any)._id || ''}
                onRefreshParent={() => loadBookings(true)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
