'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  CreditCard,
  Building2,
  Car,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  X,
  Calendar,
  Lock,
  Tag,
  ChevronRight,
  Database,
  ArrowRight,
  Info,
} from 'lucide-react';
import { AuditAction, AuditEntityType, AuditLogDto } from '@chirag/types';
import { apiRequest } from '@/lib/api';
import { Pagination } from '@/components/Pagination';
import { formatDateTime } from '@/lib/labels';

const ENTITY_TYPE_OPTIONS: { id: AuditEntityType | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All Entities' },
  { id: 'BOOKING', label: 'Bookings' },
  { id: 'PAYMENT', label: 'Payments & Refunds' },
  { id: 'QUOTATION', label: 'Quotations' },
  { id: 'HOTEL_RESERVATION', label: 'Hotel Reservations' },
  { id: 'TRANSPORT_ASSIGNMENT', label: 'Transport Dispatches' },
  { id: 'USER', label: 'Users & Admins' },
  { id: 'CUSTOMER', label: 'Customers' },
  { id: 'LEAD', label: 'Enquiries / CRM' },
  { id: 'HOTEL', label: 'Hotels' },
  { id: 'DESTINATION', label: 'Destinations' },
  { id: 'TAX_CONFIG', label: 'Tax Rules' },
];

const ACTION_OPTIONS: { id: AuditAction | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All Actions' },
  { id: 'PAYMENT_VERIFIED', label: 'Payment Verified' },
  { id: 'PAYMENT_REJECTED', label: 'Payment Rejected' },
  { id: 'PAYMENT_SUBMITTED', label: 'Payment Submitted' },
  { id: 'BOOKING_CONFIRMED', label: 'Booking Confirmed' },
  { id: 'BOOKING_CREATED', label: 'Booking Created' },
  { id: 'QUOTATION_STATUS_UPDATED', label: 'Quotation Status Updated' },
  { id: 'QUOTATION_PRICE_OVERRIDE_APPROVED', label: 'Price Override Approved' },
  { id: 'HOTEL_VOUCHER_GENERATED', label: 'Hotel Voucher Generated' },
  { id: 'HOTEL_VOUCHER_REISSUED', label: 'Hotel Voucher Reissued' },
  { id: 'DUTY_SLIP_GENERATED', label: 'Duty Slip Generated' },
  { id: 'DUTY_SLIP_REISSUED', label: 'Duty Slip Reissued' },
  { id: 'DRIVER_DISPATCHED', label: 'Driver Dispatched' },
  { id: 'AGENT_CREATED', label: 'Agent Created' },
  { id: 'AGENT_PASSWORD_RESET', label: 'Agent Password Reset' },
  { id: 'AGENT_PERMISSIONS_UPDATED', label: 'Agent Permissions Updated' },
  { id: 'CUSTOMER_CREATED', label: 'Customer Created' },
  { id: 'CUSTOMER_UPDATED', label: 'Customer Updated' },
];

function getActionBadge(action: string) {
  if (action.includes('VERIFIED') || action.includes('APPROVED') || action.includes('CONFIRMED')) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  }
  if (action.includes('REJECTED') || action.includes('CANCELLED')) {
    return 'bg-rose-50 text-rose-800 border-rose-200';
  }
  if (action.includes('DISPATCHED') || action.includes('VOUCHER') || action.includes('DUTY_SLIP')) {
    return 'bg-blue-50 text-blue-800 border-blue-200';
  }
  if (action.includes('RESET') || action.includes('PERMISSIONS') || action.includes('STATUS')) {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }
  return 'bg-slate-100 text-slate-800 border-slate-200';
}

function getEntityIcon(entityType: string) {
  switch (entityType) {
    case 'PAYMENT':
      return <CreditCard className="w-3.5 h-3.5 text-emerald-600" />;
    case 'BOOKING':
      return <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />;
    case 'QUOTATION':
      return <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />;
    case 'HOTEL_RESERVATION':
    case 'HOTEL':
      return <Building2 className="w-3.5 h-3.5 text-purple-600" />;
    case 'TRANSPORT_ASSIGNMENT':
    case 'VEHICLE':
    case 'DRIVER':
      return <Car className="w-3.5 h-3.5 text-indigo-600" />;
    case 'USER':
    case 'CUSTOMER':
    case 'LEAD':
      return <User className="w-3.5 h-3.5 text-slate-600" />;
    default:
      return <Tag className="w-3.5 h-3.5 text-slate-500" />;
  }
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchEntityId, setSearchEntityId] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalRecords, setTotalRecords] = useState(0);

  // Detail Modal
  const [inspectLog, setInspectLog] = useState<AuditLogDto | null>(null);

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', currentPage.toString());
      queryParams.set('limit', pageSize.toString());

      if (selectedEntityType !== 'ALL') {
        queryParams.set('entityType', selectedEntityType);
      }
      if (selectedAction !== 'ALL') {
        queryParams.set('action', selectedAction);
      }
      if (searchEntityId.trim()) {
        queryParams.set('entityId', searchEntityId.trim());
      }

      const res = await apiRequest<{ logs: AuditLogDto[]; total: number }>(
        `/audit-logs?${queryParams.toString()}`
      );

      // In case api returns res.data directly or wrapped
      const logList = Array.isArray(res) ? res : (res as any).data || (res as any).logs || [];
      const total = (res as any).meta?.total ?? (res as any).total ?? logList.length;

      setLogs(logList);
      setTotalRecords(total);
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve audit log records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, pageSize, selectedEntityType, selectedAction]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearchEntityId('');
    setSelectedEntityType('ALL');
    setSelectedAction('ALL');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            System Event & Governance Logs
          </h1>
          <p className="text-xs text-slate-500">
            Authoritative, tamper-evident record of all payments, quotations, operational dispatches, and user management actions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search by Entity ID */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              type="text"
              value={searchEntityId}
              onChange={(e) => setSearchEntityId(e.target.value)}
              placeholder="Search Entity / Target ID..."
              style={{
                width: '100%',
                paddingLeft: 36,
                paddingRight: 12,
                paddingTop: 8,
                paddingBottom: 8,
                fontSize: '12.5px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Entity Type Filter */}
          <div>
            <select
              value={selectedEntityType}
              onChange={(e) => {
                setSelectedEntityType(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '12.5px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '12.5px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: '#0f766e',
                color: '#ffffff',
                borderRadius: 10,
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(15, 118, 110, 0.2)',
                transition: 'all 0.15s ease',
              }}
            >
              Apply Filter
            </button>
            {(selectedEntityType !== 'ALL' || selectedAction !== 'ALL' || searchEntityId) && (
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Main Content Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-slate-200 mx-auto" />
            <div className="h-4 bg-slate-200 rounded w-1/4 mx-auto" />
            <div className="h-3 bg-slate-100 rounded w-1/3 mx-auto" />
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3 text-rose-700 bg-rose-50/50">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
            <h4 className="text-sm font-bold">Failed to load audit logs</h4>
            <p className="text-xs text-rose-600">{error}</p>
            <button
              onClick={() => fetchLogs()}
              className="px-4 py-2 bg-rose-700 text-white rounded-xl text-xs font-semibold hover:bg-rose-800 shadow-sm"
            >
              Retry
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No audit events match your filter</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              System events recorded during quotation issuance, payment verification, hotel vouchers, and transport dispatch will appear here.
            </p>
            {(selectedEntityType !== 'ALL' || selectedAction !== 'ALL' || searchEntityId) && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition mt-2"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Notes / Reason</th>
                  <th className="py-3 px-4 text-center">Audit Inspector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{formatDateTime(log.timestamp)}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            flexShrink: 0,
                            background:
                              log.actorRole === 'ADMIN'
                                ? '#ecfdf5'
                                : log.actorRole === 'AGENT'
                                ? '#eff6ff'
                                : '#f1f5f9',
                            color:
                              log.actorRole === 'ADMIN'
                                ? '#065f46'
                                : log.actorRole === 'AGENT'
                                ? '#1e40af'
                                : '#475569',
                            border:
                              log.actorRole === 'ADMIN'
                                ? '1px solid #a7f3d0'
                                : log.actorRole === 'AGENT'
                                ? '1px solid #bfdbfe'
                                : '1px solid #cbd5e1',
                          }}
                        >
                          {log.actorRole ? log.actorRole.slice(0, 2) : 'SY'}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {log.actorRole || log.actorType || 'SYSTEM'}
                          </div>
                          {log.actorId && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {log.actorId.slice(-6)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        {getEntityIcon(log.entityType)}
                        <span>{log.entityType}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-800">
                      {log.entityType === 'BOOKING' ? (
                        <Link
                          href={`/bookings/${log.entityId}`}
                          className="text-teal-700 hover:underline font-semibold"
                        >
                          {log.entityId}
                        </Link>
                      ) : (
                        <span>{log.entityId}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {log.notes ? (
                        <span className="italic">&quot;{log.notes}&quot;</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setInspectLog(log)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 12px',
                          color: '#0f766e',
                          backgroundColor: '#f0fdfa',
                          border: '1px solid #99f6e4',
                          borderRadius: 8,
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Eye style={{ width: 13, height: 13 }} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200">
          <Pagination
            currentPage={currentPage}
            totalItems={totalRecords}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Audit Log Inspection Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-slate-900 text-amber-400 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Audit Event Inspection
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">Log ID: {inspectLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Event Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Action
                  </span>
                  <span className="font-semibold text-slate-900 block mt-0.5">
                    {inspectLog.action}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Target Entity
                  </span>
                  <span className="font-semibold text-slate-900 block mt-0.5">
                    {inspectLog.entityType}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Actor Role
                  </span>
                  <span className="font-semibold text-slate-900 block mt-0.5">
                    {inspectLog.actorRole || inspectLog.actorType || 'SYSTEM'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Timestamp
                  </span>
                  <span className="font-semibold text-slate-900 block mt-0.5">
                    {formatDateTime(inspectLog.timestamp)}
                  </span>
                </div>
              </div>

              {/* Technical / Network Audit Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Entity Identifier
                  </span>
                  <span className="font-mono text-slate-800 break-all">{inspectLog.entityId}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Origin IP Address
                  </span>
                  <span className="font-mono text-slate-800">
                    {inspectLog.ipAddress || '127.0.0.1 (Local)'}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {inspectLog.notes && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
                    Recorded Reason / Justification
                  </span>
                  <p className="text-slate-800 leading-relaxed italic">
                    &quot;{inspectLog.notes}&quot;
                  </p>
                </div>
              )}

              {/* State Transition Diff */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900 block">
                  State Snapshot Payload
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Previous State
                    </span>
                    <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto max-h-52">
                      {inspectLog.previousState
                        ? JSON.stringify(inspectLog.previousState, null, 2)
                        : '// No prior state recorded (New entity creation)'}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                      New State Snapshot
                    </span>
                    <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-52">
                      {inspectLog.newState
                        ? JSON.stringify(inspectLog.newState, null, 2)
                        : '// State snapshot null'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50">
              <button
                onClick={() => setInspectLog(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-sm"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
