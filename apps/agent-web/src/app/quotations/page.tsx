'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Send,
  Share2,
  Copy,
  Check,
  History,
  AlertTriangle,
  Clock,
  Calendar,
  Users,
  MapPin,
  Building2,
  Car,
  ChevronRight,
  X,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  DestinationDto,
  LeadDto,
  QuotationDto,
  QuotationStatus,
  QuotationVersionDto,
} from '@chirag/types';
import { quotationsApi, getAgentUser } from '@/lib/api';
import {
  QUOTATION_STATUS_CONFIG,
  MEAL_PLAN_LABELS,
  formatCurrency,
  formatDate,
  sanitizeDisplayName,
} from '@/lib/labels';
import { InfoBadge } from '@/components/InfoBadge';
import { resolvePublicQuoteUrl } from '@/lib/publicQuoteUrl';

const STATUS_FILTERS: (QuotationStatus | 'ALL')[] = [
  'ALL',
  'DRAFT',
  'PENDING_ADMIN_APPROVAL',
  'APPROVED',
  'ISSUED',
  'ACCEPTED',
  'REVISED',
  'EXPIRED',
  'REJECTED',
];

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<QuotationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'ALL'>('ALL');

  // Selected for Details Drawer
  const [selectedQuote, setSelectedQuote] = useState<QuotationDto | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Selected for Share Modal
  const [shareQuote, setShareQuote] = useState<QuotationDto | null>(null);
  const [shareToken, setShareToken] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Selected for Revision Modal
  const [reviseQuote, setReviseQuote] = useState<QuotationDto | null>(null);
  const [reviseReason, setReviseReason] = useState('');
  const [reviseMarkupType, setReviseMarkupType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [reviseMarkup, setReviseMarkup] = useState<number>(10);
  const [reviseMarkupAmount, setReviseMarkupAmount] = useState<number>(0);
  const [reviseDiscountType, setReviseDiscountType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [reviseDiscount, setReviseDiscount] = useState<number>(0);
  const [reviseDiscountAmount, setReviseDiscountAmount] = useState<number>(0);
  const [revising, setRevising] = useState(false);
  const [reviseError, setReviseError] = useState<string | null>(null);

  // Selected for Version History
  const [historyQuote, setHistoryQuote] = useState<QuotationDto | null>(null);
  const [versions, setVersions] = useState<QuotationVersionDto[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Action status
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Agent policy info
  const agentUser = getAgentUser();
  const maxDiscountPercent = agentUser?.agentProfile?.maxDiscountPercent ?? 5;

  const loadQuotations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await quotationsApi.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
        limit: 50,
      });
      setQuotations(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, [statusFilter]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadQuotations();
  };

  // Open Details Drawer
  const handleOpenDetails = async (quote: QuotationDto) => {
    try {
      const full = await quotationsApi.getById(quote.id);
      setSelectedQuote(full.data);
    } catch {
      setSelectedQuote(quote);
    }
    setDrawerOpen(true);
  };

  // Handle Issue Quotation
  const handleIssueQuotation = async (quoteId: string) => {
    setIssuingId(quoteId);
    setError(null);
    try {
      const res = await quotationsApi.issue(quoteId);
      const updatedQuote = res.data.quotation;
      const rawToken = res.data.shareableToken;

      setActionSuccess(`Quotation ${updatedQuote.quoteNumber} issued successfully! Public link is now active.`);
      setTimeout(() => setActionSuccess(null), 6000);

      // Update state
      setQuotations((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: 'ISSUED', shareableToken: rawToken } : q))
      );

      if (selectedQuote?.id === quoteId) {
        setSelectedQuote({ ...selectedQuote, status: 'ISSUED', shareableToken: rawToken });
      }

      // Automatically open share dialog
      setShareQuote(updatedQuote);
      setShareToken(rawToken);
    } catch (err: any) {
      setError(err?.message || 'Failed to issue quotation');
    } finally {
      setIssuingId(null);
    }
  };

  // Open Share Modal
  const handleOpenShare = (quote: QuotationDto) => {
    setShareQuote(quote);
    // If the token is available on quote or placeholder
    setShareToken(quote.shareableToken || '');
    setCopiedLink(false);
  };

  // Open Version History Drawer
  const handleOpenHistory = async (quote: QuotationDto) => {
    setHistoryQuote(quote);
    setLoadingVersions(true);
    try {
      const res = await quotationsApi.getVersions(quote.id);
      setVersions(res.data || []);
    } catch {
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  // Open Revise Modal
  const handleOpenRevise = (quote: QuotationDto) => {
    setReviseQuote(quote);
    setReviseReason('');
    setReviseMarkupType(quote.pricingSummary?.markupType || 'PERCENT');
    setReviseMarkup(quote.pricingSummary?.markupPercent ?? 10);
    setReviseMarkupAmount(quote.pricingSummary?.totalMarkupAmount ?? 0);
    setReviseDiscountType(quote.pricingSummary?.discountType || 'PERCENT');
    setReviseDiscount(quote.pricingSummary?.discountPercent ?? 0);
    setReviseDiscountAmount(quote.pricingSummary?.discountAmount ?? 0);
    setReviseError(null);
  };

  // Submit Revision
  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviseQuote) return;
    if (!reviseReason.trim() || reviseReason.trim().length < 3) {
      setReviseError('Please provide a reason for this revision (min 3 characters).');
      return;
    }

    setRevising(true);
    setReviseError(null);

    try {
      const revisionPayload = {
        leadId: reviseQuote.leadId,
        destinationId: reviseQuote.destinationId,
        packageId: reviseQuote.packageId,
        travelStartDate: reviseQuote.travelStartDate,
        travelEndDate: reviseQuote.travelEndDate,
        numberOfAdults: reviseQuote.numberOfAdults,
        numberOfChildren: reviseQuote.numberOfChildren,
        numberOfInfants: reviseQuote.numberOfInfants,
        hotels: (reviseQuote.hotels || []).map((h) => ({
          hotelId: h.hotelId,
          roomCategoryId: h.roomCategoryId,
          checkInDate: h.checkInDate,
          checkOutDate: h.checkOutDate,
          numberOfRooms: h.numberOfRooms,
          adultsCount: h.adultsCount,
          childrenWithBedCount: h.childrenWithBedCount || 0,
          childrenWithoutBedCount: h.childrenWithoutBedCount || 0,
          mealPlan: h.mealPlan,
        })),
        transports: (reviseQuote.transports || []).map((t) => ({
          vehicleId: t.vehicleId,
          tariffId: t.tariffId,
          pricingBasis: t.pricingBasis,
          numberOfDays: t.numberOfDays,
          estimatedKm: t.estimatedKm,
          driverAllowanceDays: t.driverAllowanceDays,
          nightHaltDays: t.nightHaltDays,
          tollsAndParking: t.tollsAndParking,
          notes: t.notes,
        })),
        markupType: reviseMarkupType,
        markupPercent: reviseMarkupType === 'PERCENT' ? reviseMarkup : undefined,
        markupAmount: reviseMarkupType === 'FLAT' ? reviseMarkupAmount : undefined,
        discountType: reviseDiscountType,
        discountPercent: reviseDiscountType === 'PERCENT' ? reviseDiscount : undefined,
        discountAmount: reviseDiscountType === 'FLAT' ? reviseDiscountAmount : undefined,
        isTaxApplicable: reviseQuote.pricingSummary?.isTaxApplicable ?? true,
        changeReason: reviseReason.trim(),
        inclusions: reviseQuote.inclusions,
        exclusions: reviseQuote.exclusions,
        terms: reviseQuote.terms,
        notes: reviseQuote.notes,
      };

      const res = await quotationsApi.revise(reviseQuote.id, revisionPayload);
      setActionSuccess(`Quotation revised to version v${res.data.currentVersion}!`);
      setTimeout(() => setActionSuccess(null), 5000);

      setReviseQuote(null);
      loadQuotations();
    } catch (err: any) {
      setReviseError(err?.message || 'Failed to submit revision');
    } finally {
      setRevising(false);
    }
  };

  // Copy share URL
  const getPublicShareUrl = (token: string) => {
    return resolvePublicQuoteUrl(token).url;
  };

  const handleCopyLink = (token: string) => {
    const url = getPublicShareUrl(token);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Filtered in memory for instant feedback
  const filteredQuotations = useMemo(() => {
    if (!search.trim()) return quotations;
    const term = search.toLowerCase();
    return quotations.filter(
      (q) =>
        q.quoteNumber?.toLowerCase().includes(term) ||
        q.customerName?.toLowerCase().includes(term) ||
        q.destinationName?.toLowerCase().includes(term) ||
        q.customerMobile?.includes(term)
    );
  }, [quotations, search]);

  // Metrics count
  const metrics = useMemo(() => {
    const total = quotations.length;
    const pendingApproval = quotations.filter((q) => q.status === 'PENDING_ADMIN_APPROVAL').length;
    const issued = quotations.filter((q) => q.status === 'ISSUED' || q.status === 'SENT').length;
    const accepted = quotations.filter((q) => q.status === 'ACCEPTED').length;
    return { total, pendingApproval, issued, accepted };
  }, [quotations]);

  return (
    <div style={{ width: '100%', minWidth: 0 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary)', background: '#f0fdf4', padding: '3px 10px', borderRadius: 9999 }}>
              Travel Desk Quotations
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Authorized Max Discount: <strong>{maxDiscountPercent}%</strong>
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Tour Proposals & Itinerary Quotations
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: 4 }}>
            Create custom proposals, configure itinerary rate cards, request manager approvals, and share interactive links with travelers.
          </p>
        </div>

        <Link
          href="/quotations/new"
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}
        >
          <Plus size={18} />
          <span>Create New Quotation</span>
        </Link>
      </div>

      {/* Action Notification */}
      {actionSuccess && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, color: '#065f46', marginBottom: 20 }}>
          <CheckCircle2 size={20} color="#059669" />
          <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{actionSuccess}</span>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, color: '#be123c', marginBottom: 20 }}>
          <AlertCircle size={20} />
          <span style={{ fontSize: '0.95rem' }}>{error}</span>
        </div>
      )}

      {/* Metric Cards Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>{metrics.total}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>Total Quotations</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309', lineHeight: 1.1 }}>{metrics.pendingApproval}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>Pending Owner Approval</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid var(--primary)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Send size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>{metrics.issued}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>Active / Issued to Clients</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid #10b981' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', lineHeight: 1.1 }}>{metrics.accepted}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>Accepted Proposals</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top row: search & refresh */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: 260, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by quote number (e.g. NCT-QT-2026), customer name, or destination..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
                style={{ paddingLeft: 42, width: '100%' }}
              />
            </form>

            <button
              onClick={loadQuotations}
              disabled={loading}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40 }}
              title="Refresh list"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Bottom row: status pill tabs */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            {STATUS_FILTERS.map((s) => {
              const active = statusFilter === s;
              const count = s === 'ALL' ? quotations.length : quotations.filter((q) => q.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 9999,
                    fontSize: '0.82rem',
                    fontWeight: active ? 700 : 500,
                    border: '1px solid',
                    borderColor: active ? 'var(--primary)' : 'var(--border-subtle)',
                    background: active ? 'var(--primary)' : '#ffffff',
                    color: active ? '#ffffff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{s === 'ALL' ? 'All Proposals' : QUOTATION_STATUS_CONFIG[s]?.label || s}</span>
                  <span
                    style={{
                      background: active ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                      color: active ? '#ffffff' : 'var(--text-main)',
                      fontSize: '0.72rem',
                      padding: '1px 6px',
                      borderRadius: 10,
                      fontWeight: 700,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quotations Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ width: '100%', overflowX: 'auto' }}>
          <table className="table" style={{ margin: 0, width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>Proposal & Ver</th>
                <th style={{ padding: '12px 10px' }}>Traveler / Customer</th>
                <th style={{ padding: '12px 10px' }}>Destination & Duration</th>
                <th style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>Travel Dates</th>
                <th style={{ padding: '12px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>Total Price</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ padding: '12px 12px 12px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px auto', width: 28, height: 28, border: '3px solid var(--border-subtle)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Loading quotations...
                  </td>
                </tr>
              ) : filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    <FileText size={40} style={{ margin: '0 auto 12px auto', opacity: 0.35 }} />
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>No quotations found</div>
                    <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
                      {search ? `No quotations match "${search}". Try clearing your search.` : 'Create your first tour proposal to get started.'}
                    </div>
                    {!search && (
                      <Link
                        href="/quotations/new"
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, padding: '8px 16px', borderRadius: 6, textDecoration: 'none', fontSize: '0.88rem' }}
                      >
                        <Plus size={16} />
                        <span>Create Quotation</span>
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((q) => {
                  const statusConfig = QUOTATION_STATUS_CONFIG[q.status] || {
                    label: q.status,
                    badgeClass: 'badge-draft',
                    description: '',
                  };
                  const isIssued = q.status === 'ISSUED' || q.status === 'SENT';
                  const isAccepted = q.status === 'ACCEPTED';
                  const isPendingApproval = q.status === 'PENDING_ADMIN_APPROVAL';
                  const canIssue = q.status === 'APPROVED' || q.status === 'DRAFT';
                  const canRevise = q.status !== 'ACCEPTED' && q.status !== 'EXPIRED';

                  return (
                    <tr key={q.id}>
                      {/* Quote Number & Version */}
                      <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                            {q.quoteNumber}
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: '#f1f5f9',
                              color: '#475569',
                              padding: '2px 5px',
                              borderRadius: 4,
                            }}
                          >
                            v{q.currentVersion || 1}
                          </span>
                        </div>
                        {q.customerModificationRequest && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#b45309', fontSize: '0.72rem', marginTop: 4, fontWeight: 600 }}>
                            <AlertTriangle size={12} />
                            <span>Client requested changes</span>
                          </div>
                        )}
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.86rem' }}>
                          {sanitizeDisplayName(q.customerName)}
                        </div>
                        {q.customerMobile && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            {q.customerMobile}
                          </div>
                        )}
                      </td>

                      {/* Destination & Duration */}
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: '0.86rem' }}>
                          <MapPin size={13} color="var(--primary)" />
                          <span>{q.destinationName || 'Tour Package'}</span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {q.durationNights} Nights / {q.durationDays} Days · {q.numberOfAdults} Adults {q.numberOfChildren ? `, ${q.numberOfChildren} Ch` : ''}
                        </div>
                      </td>

                      {/* Travel Dates */}
                      <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                          {formatDate(q.travelStartDate)}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          to {formatDate(q.travelEndDate)}
                        </div>
                      </td>

                      {/* Selling Price */}
                      <td style={{ padding: '12px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          {formatCurrency(q.pricingSummary?.finalSellingPrice)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: q.pricingSummary?.isTaxConfirmed ? '#059669' : '#d97706', fontWeight: 600 }}>
                          {q.pricingSummary?.isTaxConfirmed ? 'GST Confirmed' : 'GST Pending'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span className={`badge ${statusConfig.badgeClass}`} style={{ padding: '3px 8px', fontSize: '0.74rem' }} title={statusConfig.description}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                          {q.status === 'ISSUED' || q.status === 'SENT' ? 'Issued' : q.status === 'ACCEPTED' ? 'Accepted' : statusConfig.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 12px 12px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
                          {/* Details Drawer */}
                          <button
                            onClick={() => handleOpenDetails(q)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', height: 28, fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                            title="View Itinerary & Pricing Breakdown"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>

                          {/* Share Modal (if issued or accepted) */}
                          {(isIssued || isAccepted) && (
                            <button
                              onClick={() => handleOpenShare(q)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', height: 28, fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--primary)', borderColor: 'var(--primary)' }}
                              title="Share Proposal Link & WhatsApp"
                            >
                              <Share2 size={12} />
                              <span>Share</span>
                            </button>
                          )}

                          {/* Issue Button (if approved or draft within limits) */}
                          {canIssue && !isPendingApproval && (
                            <button
                              onClick={() => handleIssueQuotation(q.id)}
                              disabled={issuingId === q.id}
                              className="btn btn-primary"
                              style={{ padding: '4px 10px', height: 28, fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                              title="Issue proposal to traveler & generate public link"
                            >
                              {issuingId === q.id ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <Send size={12} />
                              )}
                              <span>Issue</span>
                            </button>
                          )}

                          {/* Revision Button */}
                          {canRevise && (
                            <button
                              onClick={() => handleOpenRevise(q)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', height: 28, fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                              title="Revise Itinerary & Rates"
                            >
                              <History size={12} />
                              <span>Revise</span>
                            </button>
                          )}

                          {/* Version History Button */}
                          <button
                            onClick={() => handleOpenHistory(q)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 6px', height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            title="View Version History"
                          >
                            <Clock size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          DRAWER: QUOTATION PROPOSAL DETAILS & CUSTOMER BREAKDOWN
          ========================================================================= */}
      {drawerOpen && selectedQuote && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end', background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)' }}>
          <div
            style={{
              width: '100%',
              maxWidth: 680,
              background: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
              overflowY: 'auto',
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                    {selectedQuote.quoteNumber}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: 4 }}>
                    Version {selectedQuote.currentVersion || 1}
                  </span>
                  <span className={`badge ${QUOTATION_STATUS_CONFIG[selectedQuote.status]?.badgeClass}`}>
                    {QUOTATION_STATUS_CONFIG[selectedQuote.status]?.label}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Customer: <strong>{sanitizeDisplayName(selectedQuote.customerName)}</strong> ({selectedQuote.customerMobile || 'No mobile'})
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: '24px', flex: 1 }}>
              {/* Client Change Request Alert */}
              {selectedQuote.customerModificationRequest && (
                <div style={{ padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b45309', fontWeight: 700, fontSize: '0.9rem' }}>
                    <AlertTriangle size={18} />
                    <span>Customer Change Request</span>
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.88rem', color: '#78350f', fontStyle: 'italic' }}>
                    "{selectedQuote.customerModificationRequest.message}"
                  </p>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: 6 }}>
                    Received: {formatDate(selectedQuote.customerModificationRequest.requestedAt)}
                  </div>
                </div>
              )}

              {/* Pending Approval Notice */}
              {selectedQuote.status === 'PENDING_ADMIN_APPROVAL' && (
                <div style={{ padding: '16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c2410c', fontWeight: 700, fontSize: '0.9rem' }}>
                    <ShieldCheck size={18} />
                    <span>Pending Faisal Bikanerwala (Admin) Approval</span>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#9a3412' }}>
                    {selectedQuote.approvalReason || 'Discount or markup limits exceed the standard agent contract policy.'}
                  </p>
                </div>
              )}

              {/* Itinerary Summary */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={16} color="var(--primary)" />
                  <span>Tour & Itinerary Parameters</span>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, background: '#f8fafc', padding: 14, borderRadius: 8, fontSize: '0.88rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Destination</div>
                    <div style={{ fontWeight: 600 }}>{selectedQuote.destinationName || 'Custom Route'}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Duration</div>
                    <div style={{ fontWeight: 600 }}>{selectedQuote.durationNights} Nights / {selectedQuote.durationDays} Days</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Travel Dates</div>
                    <div style={{ fontWeight: 600 }}>{formatDate(selectedQuote.travelStartDate)} to {formatDate(selectedQuote.travelEndDate)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Guests</div>
                    <div style={{ fontWeight: 600 }}>{selectedQuote.numberOfAdults} Adults {selectedQuote.numberOfChildren ? `, ${selectedQuote.numberOfChildren} Children` : ''}</div>
                  </div>
                </div>
              </div>

              {/* Hotel Stays */}
              {selectedQuote.hotels && selectedQuote.hotels.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Building2 size={16} color="var(--primary)" />
                    <span>Accommodations & Hotel Stays</span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedQuote.hotels.map((h, i) => (
                      <div key={i} style={{ padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{h.hotelName || 'Selected Hotel'}</span>
                          <span style={{ fontSize: '0.78rem', background: '#f0fdf4', color: 'var(--primary)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                            {MEAL_PLAN_LABELS[h.mealPlan]?.name || h.mealPlan}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          Category: <strong>{h.roomCategoryName || 'Standard'}</strong> · {h.numberOfRooms} Room(s) · {h.numberOfNights} Night(s)
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          Stay: {formatDate(h.checkInDate)} to {formatDate(h.checkOutDate)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transport Logistics */}
              {selectedQuote.transports && selectedQuote.transports.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Car size={16} color="var(--primary)" />
                    <span>Transport Logistics & Sightseeing Vehicle</span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedQuote.transports.map((t, i) => (
                      <div key={i} style={{ padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{t.vehicleName || 'Private Transport'}</span>
                          <span style={{ fontSize: '0.78rem', background: '#f8fafc', color: '#475569', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                            {t.pricingBasis}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          {t.numberOfDays ? `${t.numberOfDays} Days` : ''} {t.estimatedKm ? `· ${t.estimatedKm} km estimated` : ''}
                          {t.tollsAndParking ? ` · Tolls & Parking ₹${t.tollsAndParking}` : ''}
                        </div>
                        {t.notes && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>{t.notes}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Pricing Breakdown (Authoritative & Protected) */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} color="var(--primary)" />
                  <span>Customer Pricing Breakdown (Tax & Totals)</span>
                </h3>

                <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Itinerary Services Base Total</span>
                    <span style={{ fontWeight: 600 }}>
                      {formatCurrency(
                        (selectedQuote.pricingSummary?.taxableAmount || 0) +
                          (selectedQuote.pricingSummary?.discountAmount || 0) -
                          (selectedQuote.pricingSummary?.totalMarkupAmount || 0)
                      )}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Markup ({selectedQuote.pricingSummary?.markupPercent || 0}%)
                    </span>
                    <span style={{ fontWeight: 600, color: '#0f766e' }}>
                      +{formatCurrency(selectedQuote.pricingSummary?.totalMarkupAmount)}
                    </span>
                  </div>

                  {(selectedQuote.pricingSummary?.discountAmount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.88rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Discount Applied ({selectedQuote.pricingSummary?.discountPercent || 0}%)
                      </span>
                      <span style={{ fontWeight: 600, color: '#b91c1c' }}>
                        -{formatCurrency(selectedQuote.pricingSummary?.discountAmount)}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px dashed var(--border-subtle)', fontSize: '0.88rem', fontWeight: 600 }}>
                    <span>Taxable Value</span>
                    <span>{formatCurrency(selectedQuote.pricingSummary?.taxableAmount)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        GST / Taxes ({selectedQuote.pricingSummary?.taxRatePercent || 0}%)
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontWeight: 700,
                          background: selectedQuote.pricingSummary?.isTaxConfirmed ? '#ecfdf5' : '#fffbeb',
                          color: selectedQuote.pricingSummary?.isTaxConfirmed ? '#047857' : '#b45309',
                        }}
                      >
                        {selectedQuote.pricingSummary?.isTaxConfirmed ? 'Verified GST' : 'Pending CA Sign-off'}
                      </span>
                    </div>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(selectedQuote.pricingSummary?.taxAmount)}</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0 4px 0',
                      borderTop: '2px solid var(--border-subtle)',
                      marginTop: 6,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>Total Customer Price</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inclusive of GST & all listed services</div>
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--primary)' }}>
                      {formatCurrency(selectedQuote.pricingSummary?.finalSellingPrice)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inclusions & Terms */}
              {(selectedQuote.inclusions?.length > 0 || selectedQuote.exclusions?.length > 0) && (
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
                    Inclusions & Exclusions
                  </h3>
                  {selectedQuote.inclusions?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857' }}>Inclusions:</div>
                      <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '0.82rem', color: '#334155' }}>
                        {selectedQuote.inclusions.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedQuote.exclusions?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#be123c' }}>Exclusions:</div>
                      <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '0.82rem', color: '#64748b' }}>
                        {selectedQuote.exclusions.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f8fafc' }}>
              <button onClick={() => setDrawerOpen(false)} className="btn btn-secondary">
                Close
              </button>

              {(selectedQuote.status === 'ISSUED' || selectedQuote.status === 'SENT' || selectedQuote.status === 'ACCEPTED') && (
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    handleOpenShare(selectedQuote);
                  }}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Share2 size={16} />
                  <span>Share Proposal</span>
                </button>
              )}

              {(selectedQuote.status === 'APPROVED' || selectedQuote.status === 'DRAFT') && (
                <button
                  onClick={() => handleIssueQuotation(selectedQuote.id)}
                  disabled={issuingId === selectedQuote.id}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Send size={16} />
                  <span>Issue Proposal</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REVISE QUOTATION
          ========================================================================= */}
      {reviseQuote && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.5)', padding: 16 }}>
          <div className="card" style={{ maxWidth: 520, width: '100%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  Revise Quotation {reviseQuote.quoteNumber}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Creating revision <strong>v{(reviseQuote.currentVersion || 1) + 1}</strong>. Previous version will be archived.
                </p>
              </div>
              <button onClick={() => setReviseQuote(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {reviseError && (
              <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 6, color: '#be123c', fontSize: '0.85rem', marginBottom: 16 }}>
                {reviseError}
              </div>
            )}

            <form onSubmit={handleSubmitRevision}>
              <div style={{ marginBottom: 16 }}>
                <label className="label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Reason for Revision <span style={{ color: '#be123c' }}>*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reviseReason}
                  onChange={(e) => setReviseReason(e.target.value)}
                  placeholder="e.g., Client requested upgraded room category, adjusted travel dates, or negotiated discount..."
                  className="input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  This reason will be recorded immutably in the quotation audit log.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="label" style={{ fontWeight: 600, margin: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span>Markup {reviseMarkupType === 'PERCENT' ? `(%)` : `(₹)`}</span>
                      <InfoBadge text="Margin added above supplier base cost for this revision." />
                    </label>
                    <div style={{ display: 'inline-flex', background: 'var(--border-subtle)', borderRadius: 6, padding: 2, gap: 2 }}>
                      <button
                        type="button"
                        onClick={() => setReviseMarkupType('PERCENT')}
                        style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: '11px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          background: reviseMarkupType === 'PERCENT' ? 'var(--primary)' : 'transparent',
                          color: reviseMarkupType === 'PERCENT' ? '#ffffff' : 'var(--text-muted)',
                        }}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviseMarkupType('FLAT')}
                        style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: '11px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          background: reviseMarkupType === 'FLAT' ? 'var(--primary)' : 'transparent',
                          color: reviseMarkupType === 'FLAT' ? '#ffffff' : 'var(--text-muted)',
                        }}
                      >
                        ₹
                      </button>
                    </div>
                  </div>
                  {reviseMarkupType === 'PERCENT' ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={reviseMarkup === 0 ? '' : reviseMarkup}
                      placeholder="0"
                      onChange={(e) => setReviseMarkup(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                      className="input"
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <input
                      type="number"
                      min="0"
                      value={reviseMarkupAmount === 0 ? '' : reviseMarkupAmount}
                      placeholder="0"
                      onChange={(e) => setReviseMarkupAmount(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                      className="input"
                      style={{ width: '100%' }}
                    />
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="label" style={{ fontWeight: 600, margin: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span>Discount {reviseDiscountType === 'PERCENT' ? `(%)` : `(₹)`}</span>
                      <InfoBadge text="Concession given to traveler for this quotation version." />
                    </label>
                    <div style={{ display: 'inline-flex', background: 'var(--border-subtle)', borderRadius: 6, padding: 2, gap: 2 }}>
                      <button
                        type="button"
                        onClick={() => setReviseDiscountType('PERCENT')}
                        style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: '11px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          background: reviseDiscountType === 'PERCENT' ? 'var(--primary)' : 'transparent',
                          color: reviseDiscountType === 'PERCENT' ? '#ffffff' : 'var(--text-muted)',
                        }}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviseDiscountType('FLAT')}
                        style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: '11px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          background: reviseDiscountType === 'FLAT' ? 'var(--primary)' : 'transparent',
                          color: reviseDiscountType === 'FLAT' ? '#ffffff' : 'var(--text-muted)',
                        }}
                      >
                        ₹
                      </button>
                    </div>
                  </div>
                  {reviseDiscountType === 'PERCENT' ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={reviseDiscount === 0 ? '' : reviseDiscount}
                      placeholder="0"
                      onChange={(e) => setReviseDiscount(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                      className="input"
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <input
                      type="number"
                      min="0"
                      value={reviseDiscountAmount === 0 ? '' : reviseDiscountAmount}
                      placeholder="0"
                      onChange={(e) => setReviseDiscountAmount(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                      className="input"
                      style={{ width: '100%' }}
                    />
                  )}
                </div>
              </div>

              {reviseDiscountType === 'PERCENT' && reviseDiscount > maxDiscountPercent && (
                <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, color: '#b45309', fontSize: '0.8rem', marginBottom: 16 }}>
                  ⚠️ <strong>Notice:</strong> Your discount of {reviseDiscount}% exceeds your contract cap of {maxDiscountPercent}%. This revision will be submitted as <strong>PENDING ADMIN APPROVAL</strong>.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setReviseQuote(null)} className="btn btn-secondary" disabled={revising}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={revising}>
                  {revising ? 'Saving Revision...' : 'Create Revision v' + ((reviseQuote.currentVersion || 1) + 1)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CUSTOMER SHARE & WHATSAPP DISPATCH
          ========================================================================= */}
      {shareQuote && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.5)', padding: 16 }}>
          <div className="card" style={{ maxWidth: 540, width: '100%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  Share Tour Proposal
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  {shareQuote.quoteNumber} · {shareQuote.destinationName}
                </p>
              </div>
              <button onClick={() => setShareQuote(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Public Link Card with Environment Domain Indicator */}
            {(() => {
              const urlInfo = resolvePublicQuoteUrl(shareToken || shareQuote.shareableToken || '');
              return (
                <div style={{ padding: 16, background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 8, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Secure Public Traveler Link
                    </div>
                    {urlInfo.isDevelopmentOrLocalhost ? (
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontWeight: 700, border: '1px solid #fde68a' }}>
                        Local Development Only
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: '#ecfdf5', color: '#065f46', fontWeight: 700, border: '1px solid #a7f3d0' }}>
                        Production Domain Active
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      readOnly
                      value={urlInfo.url || 'Generating secure link...'}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-main)', fontFamily: 'monospace' }}
                    />
                    <button
                      onClick={() => handleCopyLink(shareToken || shareQuote.shareableToken || '')}
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38 }}
                    >
                      {copiedLink ? <Check size={16} color="#059669" /> : <Copy size={16} />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  {urlInfo.isDevelopmentOrLocalhost ? (
                    <div style={{ fontSize: '0.75rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 6, padding: '8px 10px', marginTop: 10, lineHeight: 1.4 }}>
                      ⚠️ <strong>Development Notice:</strong> Public customer domain is not configured via <code>NEXT_PUBLIC_PUBLIC_QUOTE_BASE_URL</code>. This link points to <code>{urlInfo.baseUrl || 'localhost'}</code> and will only work on this machine. External travelers on mobile devices cannot open localhost URLs.
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                      No login required. Traveler can view itinerary, rate card details, and accept online.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* WhatsApp Share Button */}
            {(() => {
              const urlInfo = resolvePublicQuoteUrl(shareToken || shareQuote.shareableToken || '');
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <a
                    href={`https://wa.me/${shareQuote.customerMobile ? shareQuote.customerMobile.replace(/\D/g, '') : ''}?text=${encodeURIComponent(
                      `Hello ${sanitizeDisplayName(shareQuote.customerName)},\n\nHere is your customized holiday proposal for ${shareQuote.destinationName || 'your upcoming trip'} from New Chirag Tours & Travels (${shareQuote.durationNights} Nights / ${shareQuote.durationDays} Days):\n\nProposal Link: ${urlInfo.url}\nTotal Package Price: ${formatCurrency(shareQuote.pricingSummary?.finalSellingPrice)}\nValid Until: ${formatDate(shareQuote.validUntil)}\n\nPlease review your day-wise itinerary, accommodations, and terms. You can accept directly or let us know if any adjustments are desired!\n\nWarm regards,\nNew Chirag Tours & Travels`
                    )}`}
                    onClick={(e) => {
                      if (urlInfo.isDevelopmentOrLocalhost) {
                        const proceed = window.confirm(
                          `⚠️ Development Link Notice:\n\nThis proposal link (${urlInfo.url}) uses localhost/development because NEXT_PUBLIC_PUBLIC_QUOTE_BASE_URL is not configured with a public customer domain.\n\nExternal travelers cannot open localhost links on their mobile phones. Proceed anyway for local test dispatch?`
                        );
                        if (!proceed) e.preventDefault();
                      }
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      padding: '12px 20px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      background: '#25D366',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                    }}
                  >
                    <MessageCircle size={20} />
                    <span>Share via WhatsApp to {shareQuote.customerMobile || 'Client'}</span>
                  </a>

                  <a
                    href={urlInfo.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, textDecoration: 'none' }}
                  >
                    <ExternalLink size={16} />
                    <span>Open Public Traveler Preview</span>
                  </a>
                </div>
              );
            })()}

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={() => setShareQuote(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DRAWER: VERSION HISTORY
          ========================================================================= */}
      {historyQuote && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end', background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(3px)' }}>
          <div
            style={{
              width: '100%',
              maxWidth: 500,
              background: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
              overflowY: 'auto',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Version History</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {historyQuote.quoteNumber} · Current: v{historyQuote.currentVersion || 1}
                </div>
              </div>
              <button onClick={() => setHistoryQuote(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24, flex: 1 }}>
              {loadingVersions ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                  Loading version history...
                </div>
              ) : versions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <Clock size={36} style={{ margin: '0 auto 8px auto', opacity: 0.3 }} />
                  <div style={{ fontWeight: 600 }}>No prior archived versions</div>
                  <div style={{ fontSize: '0.82rem', marginTop: 4 }}>This quotation is currently on its initial version (v1).</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {versions.map((ver) => (
                    <div key={ver.id || ver.versionNumber} style={{ padding: 14, border: '1px solid var(--border-subtle)', borderRadius: 8, background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                          Version {ver.versionNumber}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatDate(ver.createdAt)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#334155', fontStyle: 'italic', marginBottom: 8 }}>
                        "{ver.changeReason || 'No change reason recorded'}"
                      </div>
                      {ver.snapshot?.pricingSummary && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-subtle)', paddingTop: 6 }}>
                          <span>Archived Selling Price:</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {formatCurrency(ver.snapshot.pricingSummary.finalSellingPrice)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button onClick={() => setHistoryQuote(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
