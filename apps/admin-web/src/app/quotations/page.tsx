'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Link as LinkIcon,
  Copy,
  Clock,
  History,
  Check,
  X,
  RefreshCw,
  Calculator,
  Building2,
  Car,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Users,
  Percent,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Printer,
} from 'lucide-react';
import {
  DestinationDto,
  HotelDto,
  LeadDto,
  MealPlan,
  QuotationDto,
  QuotationStatus,
  QuotationVersionDto,
  RoomCategoryDto,
  TransportTariffDto,
} from '@chirag/types';
import { apiRequest, getApiBaseUrl, getPublicApiUrl } from '@/lib/api';
import { Pagination } from '@/components/Pagination';
import { InfoBadge } from '@/components/InfoBadge';
import { QUOTATION_STATUS_CONFIG, formatDate, formatCurrency, sanitizeDisplayName } from '@/lib/labels';
import { resolvePublicQuoteUrl } from '@/lib/publicQuoteUrl';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { ConfirmModal } from '@/components/ConfirmModal';
import { SearchableSelect } from '@/components/SearchableSelect';

const STATUS_FILTERS: (QuotationStatus | 'ALL')[] = [
  'ALL',
  'PENDING_ADMIN_APPROVAL',
  'DRAFT',
  'APPROVED',
  'ISSUED',
  'REVISED',
];

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<QuotationDto[]>([]);
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);
  const [hotels, setHotels] = useState<HotelDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedDestinationId, setSelectedDestinationId] = useState('');
  const [travelStartDate, setTravelStartDate] = useState('');
  const [travelEndDate, setTravelEndDate] = useState('');
  const [numberOfAdults, setNumberOfAdults] = useState<number>(2);
  const [numberOfChildren, setNumberOfChildren] = useState<number>(0);
  const [markupType, setMarkupType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [markupPercent, setMarkupPercent] = useState<number>(10);
  const [markupAmount, setMarkupAmount] = useState<number>(0);

  const [discountType, setDiscountType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isTaxApplicable, setIsTaxApplicable] = useState(true);

  // Hotel Line State
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [selectedRoomCatId, setSelectedRoomCatId] = useState('');
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan>('CP');
  const [hotelRoomsCount, setHotelRoomsCount] = useState<number>(1);
  const [roomCategories, setRoomCategories] = useState<RoomCategoryDto[]>([]);

  // Calculation Preview State
  const [calculatedSummary, setCalculatedSummary] = useState<any | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Modals for actions
  const [reviewQuote, setReviewQuote] = useState<QuotationDto | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [reviseQuote, setReviseQuote] = useState<QuotationDto | null>(null);
  const [reviseReason, setReviseReason] = useState('');
  const [reviseStartDate, setReviseStartDate] = useState('');
  const [reviseEndDate, setReviseEndDate] = useState('');
  const [reviseAdults, setReviseAdults] = useState<number>(2);
  const [reviseChildren, setReviseChildren] = useState<number>(0);
  const [reviseRooms, setReviseRooms] = useState<number>(1);
  const [reviseMealPlan, setReviseMealPlan] = useState<MealPlan>('CP');
  const [reviseNotes, setReviseNotes] = useState('');
  const [reviseMarkupType, setReviseMarkupType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [reviseMarkup, setReviseMarkup] = useState<number>(10);
  const [reviseMarkupAmount, setReviseMarkupAmount] = useState<number>(0);
  const [reviseDiscountType, setReviseDiscountType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [reviseDiscount, setReviseDiscount] = useState<number>(0);
  const [reviseDiscountAmount, setReviseDiscountAmount] = useState<number>(0);
  const [revising, setRevising] = useState(false);

  const [shareableModal, setShareableModal] = useState<{ quoteNumber: string; token: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [versionHistoryQuote, setVersionHistoryQuote] = useState<QuotationDto | null>(null);
  const [versionList, setVersionList] = useState<QuotationVersionDto[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchData = async (background = false) => {
    if (!background) setLoading(true);
    setError(null);
    try {
      const [quotesRes, leadsRes, destsRes, hotelsRes] = await Promise.all([
        apiRequest<QuotationDto[]>('quotations'),
        apiRequest<LeadDto[]>('leads'),
        apiRequest<DestinationDto[]>('destinations'),
        apiRequest<HotelDto[]>('hotels'),
      ]);

      setQuotations(Array.isArray(quotesRes) ? quotesRes : []);
      setLeads(Array.isArray(leadsRes) ? leadsRes : []);
      setDestinations(Array.isArray(destsRes) ? destsRes : []);
      setHotels(Array.isArray(hotelsRes) ? hotelsRes : []);
    } catch (err: any) {
      if (!background) setError(err.message || 'Failed to load quotations');
    } finally {
      if (!background) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time synchronization via Server-Sent Events (SSE)
  useRealtimeSync({
    eventTypes: ['QUOTATION_UPDATE', 'BOOKING_UPDATE'],
    onRefresh: () => {
      fetchData(true);
    },
    onEvent: (msg) => {
      if (msg.message || msg.title) {
        showToast(msg.message || msg.title || 'Quotation updated in real time');
      }
    },
  });

  // When hotel changes, load room categories
  useEffect(() => {
    if (!selectedHotelId) {
      setRoomCategories([]);
      setSelectedRoomCatId('');
      return;
    }
    const hotel = hotels.find((h) => h.id === selectedHotelId);
    if (hotel && hotel.roomCategories) {
      setRoomCategories(hotel.roomCategories);
      if (hotel.roomCategories.length > 0) {
        setSelectedRoomCatId(hotel.roomCategories[0].id);
      }
    } else {
      setRoomCategories([]);
    }
  }, [selectedHotelId, hotels]);

  // When lead is selected, auto-populate destination and travel dates
  const handleLeadChange = (leadIdVal: string) => {
    setSelectedLeadId(leadIdVal);
    const lead = leads.find((l) => l.id === leadIdVal);
    if (lead) {
      setSelectedDestinationId(lead.destinationId);
      if (lead.tentativeTravelDate) {
        const start = lead.tentativeTravelDate.split('T')[0];
        setTravelStartDate(start);
        const nights = lead.durationNights || 3;
        const d = new Date(start);
        d.setDate(d.getDate() + nights);
        setTravelEndDate(d.toISOString().split('T')[0]);
      }
      setNumberOfAdults(lead.numberOfAdults || 2);
      setNumberOfChildren(lead.numberOfChildren || 0);
    }
  };

  const calculatedDuration = useMemo(() => {
    if (!travelStartDate || !travelEndDate) return null;
    const start = new Date(travelStartDate);
    const end = new Date(travelEndDate);
    const diffTime = end.getTime() - start.getTime();
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (nights > 0) {
      return { nights, days: nights + 1 };
    }
    return null;
  }, [travelStartDate, travelEndDate]);

  const handleCalculatePreview = async () => {
    if (!selectedLeadId || !selectedDestinationId || !travelStartDate || !travelEndDate) return;
    if (selectedHotelId && !selectedRoomCatId) return;

    setCalculating(true);
    setCalcError(null);

    try {
      const payload = {
        leadId: selectedLeadId,
        destinationId: selectedDestinationId,
        travelStartDate,
        travelEndDate,
        numberOfAdults: Number(numberOfAdults),
        numberOfChildren: Number(numberOfChildren),
        hotels: selectedHotelId
          ? [
              {
                hotelId: selectedHotelId,
                roomCategoryId: selectedRoomCatId,
                checkInDate: travelStartDate,
                checkOutDate: travelEndDate,
                numberOfRooms: Number(hotelRoomsCount),
                adultsCount: Number(numberOfAdults),
                childrenWithBedCount: Number(numberOfChildren),
                mealPlan: selectedMealPlan,
              },
            ]
          : [],
        transports: [],
        markupType,
        markupPercent: markupType === 'PERCENT' ? Number(markupPercent) : undefined,
        markupAmount: markupType === 'FLAT' ? Number(markupAmount) : undefined,
        discountType,
        discountPercent: discountType === 'PERCENT' ? Number(discountPercent) : undefined,
        discountAmount: discountType === 'FLAT' ? Number(discountAmount) : undefined,
        isTaxApplicable,
      };

      const result = await apiRequest<{ pricingSummary: any }>('quotations/calculate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCalculatedSummary(result.pricingSummary);
    } catch (err: any) {
      setCalcError(err.message || 'Pricing calculation failed');
      setCalculatedSummary(null);
    } finally {
      setCalculating(false);
    }
  };

  // Auto-calculate live estimate preview whenever key pricing parameters change
  useEffect(() => {
    if (!isCreateModalOpen) return;
    if (!selectedLeadId || !selectedDestinationId || !travelStartDate || !travelEndDate) {
      setCalculatedSummary(null);
      return;
    }
    if (selectedHotelId && !selectedRoomCatId) {
      return;
    }

    const timer = setTimeout(() => {
      handleCalculatePreview();
    }, 350);

    return () => clearTimeout(timer);
  }, [
    isCreateModalOpen,
    selectedLeadId,
    selectedDestinationId,
    travelStartDate,
    travelEndDate,
    numberOfAdults,
    numberOfChildren,
    selectedHotelId,
    selectedRoomCatId,
    selectedMealPlan,
    hotelRoomsCount,
    markupType,
    markupPercent,
    markupAmount,
    discountType,
    discountPercent,
    discountAmount,
    isTaxApplicable,
  ]);

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalculating(true);
    setCalcError(null);

    try {
      const payload = {
        leadId: selectedLeadId,
        destinationId: selectedDestinationId,
        travelStartDate,
        travelEndDate,
        numberOfAdults: Number(numberOfAdults),
        numberOfChildren: Number(numberOfChildren),
        hotels: selectedHotelId
          ? [
              {
                hotelId: selectedHotelId,
                roomCategoryId: selectedRoomCatId,
                checkInDate: travelStartDate,
                checkOutDate: travelEndDate,
                numberOfRooms: Number(hotelRoomsCount),
                adultsCount: Number(numberOfAdults),
                childrenWithBedCount: Number(numberOfChildren),
                mealPlan: selectedMealPlan,
              },
            ]
          : [],
        transports: [],
        markupType,
        markupPercent: markupType === 'PERCENT' ? Number(markupPercent) : undefined,
        markupAmount: markupType === 'FLAT' ? Number(markupAmount) : undefined,
        discountType,
        discountPercent: discountType === 'PERCENT' ? Number(discountPercent) : undefined,
        discountAmount: discountType === 'FLAT' ? Number(discountAmount) : undefined,
        isTaxApplicable,
      };

      const created = await apiRequest<QuotationDto>('quotations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showToast(`Quotation ${created.quoteNumber} created successfully! (Status: ${created.status})`);
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      setCalcError(err.message || 'Failed to create quotation');
    } finally {
      setCalculating(false);
    }
  };

  const handleIssueQuotation = async (quote: QuotationDto) => {
    try {
      const result = await apiRequest<{ quotation: QuotationDto; shareableToken: string }>(
        `quotations/${quote.id}/issue`,
        { method: 'POST' }
      );

      setShareableModal({
        quoteNumber: quote.quoteNumber,
        token: result.shareableToken,
      });
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to issue quotation', 'error');
    }
  };

  const [quoteToAccept, setQuoteToAccept] = useState<QuotationDto | null>(null);
  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null);

  const handleAcceptQuotation = (quote: QuotationDto) => {
    if (!quote.shareableToken) {
      showToast('Quotation does not have an active public token. Please issue first.', 'error');
      return;
    }
    setQuoteToAccept(quote);
  };

  const executeAcceptQuotation = async () => {
    if (!quoteToAccept || !quoteToAccept.shareableToken) return;
    const quote = quoteToAccept;
    setAcceptingQuoteId(quote.id);
    try {
      const res = await fetch(`/api/proxy/quotations/public/${encodeURIComponent(quote.shareableToken || '')}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreedToTerms: true, notes: 'Accepted by Admin on client confirmation' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to accept quotation');
      }

      showToast(`Quotation ${quote.quoteNumber} marked as ACCEPTED! Booking request created.`, 'success');
      setQuoteToAccept(null);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error accepting quotation', 'error');
    } finally {
      setAcceptingQuoteId(null);
    }
  };

  const handleReviewDecision = async (decision: 'APPROVE' | 'REJECT') => {
    if (!reviewQuote) return;
    setReviewSubmitting(true);
    try {
      await apiRequest(`quotations/${reviewQuote.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ decision, notes: reviewNotes || undefined }),
      });

      showToast(`Quotation ${decision === 'APPROVE' ? 'Approved' : 'Rejected'} successfully`);
      setReviewQuote(null);
      setReviewNotes('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleReviseQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviseQuote || !reviseReason.trim()) return;

    setRevising(true);
    try {
      const start = new Date(reviseStartDate);
      const end = new Date(reviseEndDate);
      const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const days = nights + 1;

      await apiRequest(`quotations/${reviseQuote.id}/revise`, {
        method: 'POST',
        body: JSON.stringify({
          leadId: reviseQuote.leadId,
          destinationId: reviseQuote.destinationId,
          travelStartDate: reviseStartDate,
          travelEndDate: reviseEndDate,
          durationNights: nights,
          durationDays: days,
          numberOfAdults: Number(reviseAdults) || 1,
          numberOfChildren: Number(reviseChildren) || 0,
          hotels: reviseQuote.hotels.map((h) => ({
            hotelId: h.hotelId,
            roomCategoryId: h.roomCategoryId,
            checkInDate: reviseStartDate,
            checkOutDate: reviseEndDate,
            numberOfNights: nights,
            numberOfRooms: Number(reviseRooms) || h.numberOfRooms || 1,
            adultsCount: Number(reviseAdults) || h.adultsCount || 1,
            childrenWithBedCount: Number(reviseChildren) || 0,
            childrenWithoutBedCount: 0,
            mealPlan: reviseMealPlan || h.mealPlan,
          })),
          transports: reviseQuote.transports.map((t) => ({
            tariffId: t.tariffId,
            pricingBasis: t.pricingBasis,
            numberOfDays: days,
            estimatedKm: t.estimatedKm,
          })),
          markupType: reviseMarkupType,
          markupPercent: reviseMarkupType === 'PERCENT' ? Number(reviseMarkup) : undefined,
          markupAmount: reviseMarkupType === 'FLAT' ? Number(reviseMarkupAmount) : undefined,
          discountType: reviseDiscountType,
          discountPercent: reviseDiscountType === 'PERCENT' ? Number(reviseDiscount) : undefined,
          discountAmount: reviseDiscountType === 'FLAT' ? Number(reviseDiscountAmount) : undefined,
          notes: reviseNotes,
          changeReason: reviseReason.trim(),
        }),
      });

      showToast(`Quotation revised. New version archived.`);
      setReviseQuote(null);
      setReviseReason('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Revision failed', 'error');
    } finally {
      setRevising(false);
    }
  };

  const handleViewVersions = async (quote: QuotationDto) => {
    setVersionHistoryQuote(quote);
    setLoadingVersions(true);
    try {
      const versions = await apiRequest<QuotationVersionDto[]>(`quotations/${quote.id}/versions`);
      setVersionList(Array.isArray(versions) ? versions : []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load versions', 'error');
    } finally {
      setLoadingVersions(false);
    }
  };

  const filteredQuotes = quotations.filter((q) => {
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    const matchesSearch =
      !search ||
      q.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      (q.customerName && q.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (q.destinationName && q.destinationName.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  const paginatedQuotes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuotes.slice(start, start + pageSize);
  }, [filteredQuotes, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`flex items-center gap-2 p-4 rounded-lg shadow-sm border ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-teal-600" />
            Tour Quotations & Client Proposals
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Build price quotes, customize hotel & cab packages, and send official branded proposals to customers.
          </p>
        </div>
        <button
          onClick={() => {
            setCalculatedSummary(null);
            setCalcError(null);
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Create New Tour Quote
        </button>
      </div>

      {/* Search & Status Filter — Responsive Wrapping to prevent clipping at 1280px/1366px */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center">
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px', flexShrink: 0 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quote #, customer, destination..."
            style={{
              width: '100%',
              paddingLeft: 38,
              paddingRight: 14,
              paddingTop: 8,
              paddingBottom: 8,
              fontSize: '13px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {STATUS_FILTERS.map((st) => {
            const label = st === 'ALL' ? `All Proposals (${quotations.length})` : QUOTATION_STATUS_CONFIG[st]?.label || st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4">Quote #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Destination & Dates</th>
                  <th className="py-3.5 px-4">Selling Price</th>
                  <th className="py-3.5 px-4">Status & Ver.</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <tr key={idx} className="skeleton-table-row">
                    <td className="py-3.5 px-4">
                      <div className="skeleton" style={{ width: '85px', height: '15px', borderRadius: '4px' }} />
                    </td>
                    <td className="py-3.5 px-4">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div className="skeleton" style={{ width: '130px', height: '16px', borderRadius: '4px' }} />
                        <div className="skeleton" style={{ width: '95px', height: '12px', borderRadius: '4px' }} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div className="skeleton" style={{ width: '115px', height: '15px', borderRadius: '4px' }} />
                        <div className="skeleton" style={{ width: '145px', height: '12px', borderRadius: '4px' }} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div className="skeleton" style={{ width: '100px', height: '20px', borderRadius: '5px' }} />
                        <div className="skeleton" style={{ width: '75px', height: '11px', borderRadius: '4px' }} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="skeleton skeleton-pill" style={{ width: '85px', height: '22px' }} />
                        <div className="skeleton" style={{ width: '28px', height: '18px', borderRadius: '4px' }} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="skeleton" style={{ width: '95px', height: '28px', borderRadius: '8px' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">{error}</div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No quotations found matching your criteria.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4">Quote #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Destination & Dates</th>
                  <th className="py-3.5 px-4">Selling Price</th>
                  <th className="py-3.5 px-4">Status & Ver.</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedQuotes.map((quote) => {
                  const statusCfg = QUOTATION_STATUS_CONFIG[quote.status] || {
                    label: quote.status,
                    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                  };

                  return (
                    <tr key={quote.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-800 text-xs">
                        {quote.quoteNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{quote.customerName || 'Customer'}</div>
                        <div className="text-xs text-slate-500">{quote.customerMobile || ''}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{sanitizeDisplayName(quote.destinationName)}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {formatDate(quote.travelStartDate)} to {formatDate(quote.travelEndDate)} ({quote.durationNights}N/{quote.durationDays}D)
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {quote.status === 'DRAFT' && (!quote.pricingSummary?.finalSellingPrice || quote.pricingSummary?.finalSellingPrice === 0) ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" /> Draft — Estimate Pending
                            </span>
                            <div className="text-[11px] text-slate-400 mt-0.5">Line items or tariff pending</div>
                          </div>
                        ) : (
                          <>
                            <div className="font-extrabold text-slate-900 text-base">
                              {formatCurrency(quote.pricingSummary.finalSellingPrice)}
                            </div>
                            <div className="text-xs text-slate-400">
                              {quote.pricingSummary.isTaxApplicable ? `Incl. ${quote.pricingSummary.taxRatePercent}% GST` : 'Tax Exempt'}
                            </div>
                            {quote.pricingSummary.isTaxApplicable && quote.pricingSummary.isTaxConfirmed === false && (
                              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-1" title="GST rate is provisional pending Faisal/CA confirmation. Cannot be issued until confirmed.">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                <span>Pending CA Sign-off</span>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.badgeClass}`}
                          >
                            {statusCfg.label}
                          </span>
                          <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            v{quote.currentVersion}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {quote.shareableToken && (
                          <>
                            <a
                              href={resolvePublicQuoteUrl(quote.shareableToken).url || `/quote/${quote.shareableToken}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs px-2.5 py-1 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg font-semibold border border-teal-200 transition-colors inline-flex items-center gap-1"
                            >
                              <LinkIcon className="w-3 h-3" />
                              View Proposal
                            </a>
                            <a
                              href={`${getPublicApiUrl()}/quotations/public/${quote.shareableToken}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg font-semibold border border-emerald-200 transition-colors inline-flex items-center gap-1"
                              title="Download / View Printable PDF"
                            >
                              <Printer className="w-3 h-3" />
                              PDF
                            </a>
                            {quote.status === 'ISSUED' && (
                              <button
                                onClick={() => handleAcceptQuotation(quote)}
                                disabled={acceptingQuoteId === quote.id}
                                className="text-xs px-2.5 py-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg font-bold border border-emerald-300 transition-colors inline-flex items-center gap-1"
                                title="Mark proposal as Accepted (Client agreed via Phone / WhatsApp)"
                              >
                                <Check className="w-3 h-3" />
                                {acceptingQuoteId === quote.id ? 'Accepting...' : 'Mark Accepted'}
                              </button>
                            )}
                          </>
                        )}

                        {quote.status === 'PENDING_ADMIN_APPROVAL' && (
                          <button
                            onClick={() => setReviewQuote(quote)}
                            className="text-xs px-2.5 py-1 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg font-semibold border border-amber-200 transition-colors"
                          >
                            Review Override
                          </button>
                        )}

                        {quote.status !== 'PENDING_ADMIN_APPROVAL' && quote.status !== 'REJECTED' && !quote.shareableToken && (
                          <button
                            onClick={() => handleIssueQuotation(quote)}
                            className="text-xs px-2.5 py-1 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg font-semibold border border-teal-200 transition-colors inline-flex items-center gap-1"
                          >
                            <LinkIcon className="w-3 h-3" />
                            Issue Link
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setReviseQuote(quote);
                            setReviseStartDate(quote.travelStartDate ? quote.travelStartDate.split('T')[0] : '');
                            setReviseEndDate(quote.travelEndDate ? quote.travelEndDate.split('T')[0] : '');
                            setReviseAdults(quote.numberOfAdults || 2);
                            setReviseChildren(quote.numberOfChildren || 0);
                            setReviseRooms(quote.hotels?.[0]?.numberOfRooms || 1);
                            setReviseMealPlan((quote.hotels?.[0]?.mealPlan as MealPlan) || 'CP');
                            setReviseNotes(quote.notes || '');
                            setReviseMarkupType(quote.pricingSummary.markupType || 'PERCENT');
                            setReviseMarkup(quote.pricingSummary.markupPercent ?? 10);
                            setReviseMarkupAmount(quote.pricingSummary.totalMarkupAmount ?? 0);
                            setReviseDiscountType(quote.pricingSummary.discountType || 'PERCENT');
                            setReviseDiscount(quote.pricingSummary.discountPercent ?? 0);
                            setReviseDiscountAmount(quote.pricingSummary.discountAmount ?? 0);
                            setReviseReason('');
                          }}
                          className="text-xs px-2.5 py-1 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold transition-colors"
                        >
                          Revise
                        </button>

                        <button
                          onClick={() => handleViewVersions(quote)}
                          className="text-xs px-2 py-1 text-slate-500 hover:text-slate-800 transition-colors"
                          title="Version History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Luxury Pagination Controls */}
          {filteredQuotes.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredQuotes.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemName="quotations"
            />
          )}
          </>
        )}
      </div>

      {/* Modal: Generate New Quotation — LUXURY PRICING STUDIO */}
      {isCreateModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1000 }}>
          <div
            className="modal-container"
            style={{
              maxWidth: '860px',
              width: '95%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35)',
              border: '1.5px solid #cbd5e1',
              overflow: 'hidden',
              background: '#ffffff',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 28px',
                borderBottom: '1.5px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #0f766e, #0d9488)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(15, 118, 110, 0.28)',
                    flexShrink: 0,
                  }}
                >
                  <Calculator size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                    Build Tour Quotation & Estimate
                  </h2>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', margin: 0 }}>
                    Select customer enquiry, hotel accommodation, and configure agency margins
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="modal-close"
                title="Close modal"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Live Pricing Summary Banner (Always visible while configuring) */}
            <div
              style={{
                padding: '12px 28px',
                background: calculatedSummary ? '#f0fdfa' : '#f8fafc',
                borderBottom: '1.5px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Live Estimate:
                </span>
                {calculating ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f766e', fontSize: '13px', fontWeight: 600 }}>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Computing live total...</span>
                  </div>
                ) : calculatedSummary ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f766e', letterSpacing: '-0.02em' }}>
                      ₹{Math.round(calculatedSummary.finalSellingPrice)?.toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize: '11px', background: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #ccfbf1', color: '#0f766e', fontWeight: 600 }}>
                      Base: ₹{Math.round(calculatedSummary.baseCost ?? calculatedSummary.totalBaseSupplierCost ?? calculatedSummary.netSupplierCost ?? 0)?.toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize: '11px', background: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #ccfbf1', color: '#0f766e', fontWeight: 600 }}>
                      Margin: +{calculatedSummary.markupPercent}% (₹{Math.round(calculatedSummary.totalMarkupAmount ?? calculatedSummary.markupAmount ?? 0)?.toLocaleString('en-IN')})
                    </span>
                    {calculatedSummary.isTaxApplicable && (
                      <span style={{ fontSize: '11px', background: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #ccfbf1', color: '#0f766e', fontWeight: 600 }}>
                        GST 5%: +₹{Math.round(calculatedSummary.taxAmount ?? calculatedSummary.gstAmount ?? 0)?.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                    Select dates & accommodation to compute live total
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleCalculatePreview}
                disabled={!selectedLeadId || !selectedDestinationId || !travelStartDate || !travelEndDate || calculating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  background: '#0f766e',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: (!selectedLeadId || !selectedDestinationId || !travelStartDate || !travelEndDate || calculating) ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                <RefreshCw size={12} className={calculating ? 'animate-spin' : ''} />
                <span>{calculating ? 'Calculating...' : 'Recalculate Estimate'}</span>
              </button>
            </div>

            {calcError && (
              <div
                style={{
                  margin: '16px 28px 0 28px',
                  padding: '12px 16px',
                  background: '#fff1f2',
                  border: '1.5px solid #fecdd3',
                  borderRadius: '12px',
                  color: '#be123c',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{calcError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form
              onSubmit={handleCreateQuotation}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              {/* Scrollable Form Body */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '22px',
                }}
              >
                {/* STEP 1: Customer Enquiry & Travel Dates */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 1px 4px rgba(15, 23, 42, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '9999px', background: '#f0fdfa', border: '1px solid #ccfbf1', color: '#0f766e', fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <Calendar size={14} />
                      <span>1. Customer Enquiry & Travel Dates</span>
                    </div>
                    {calculatedDuration && (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f766e', background: '#ccfbf1', padding: '3px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={13} />
                        {calculatedDuration.nights} Nights / {calculatedDuration.days} Days Tour
                      </span>
                    )}
                  </div>

                  {/* Enquiry & Destination Selectors */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Customer Enquiry (Lead) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <SearchableSelect
                        options={[
                          { value: '', label: 'Select Enquiry' },
                          ...leads.map((l) => ({
                            value: l.id,
                            label: `${l.leadNumber} — ${l.customerName || 'Customer'}`,
                            subLabel: `${l.customerMobile || 'No mobile'} • ${sanitizeDisplayName(l.destinationName) || 'Custom'}`,
                            badge: l.status,
                          })),
                        ]}
                        value={selectedLeadId}
                        onChange={(val) => handleLeadChange(val)}
                        placeholder="Select Customer Enquiry..."
                        searchPlaceholder="Type customer name, mobile, or ID..."
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Holiday Destination <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <SearchableSelect
                        options={[
                          { value: '', label: 'Select Destination' },
                          ...destinations.map((d) => ({
                            value: d.id,
                            label: sanitizeDisplayName(d.name),
                            subLabel: `${d.region} • ${d.state}`,
                          })),
                        ]}
                        value={selectedDestinationId}
                        onChange={(val) => setSelectedDestinationId(val)}
                        placeholder="Select Destination..."
                        searchPlaceholder="Type destination or state name..."
                      />
                    </div>
                  </div>

                  {/* Dates & Travelers Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Travel Start Date <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={travelStartDate}
                        onChange={(e) => setTravelStartDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          background: '#f8fafc',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '10px',
                          fontSize: '13px',
                          color: '#0f172a',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Travel End Date <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={travelEndDate}
                        onChange={(e) => setTravelEndDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          background: '#f8fafc',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '10px',
                          fontSize: '13px',
                          color: '#0f172a',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Adults (12+ Yrs) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={numberOfAdults === 0 ? '' : numberOfAdults}
                        placeholder="2"
                        onChange={(e) => setNumberOfAdults(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          background: '#f8fafc',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '10px',
                          fontSize: '13.5px',
                          color: '#0f172a',
                          fontWeight: 600,
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Kids (Below 12 Yrs)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={numberOfChildren === 0 ? '' : numberOfChildren}
                        placeholder="0"
                        onChange={(e) => setNumberOfChildren(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          background: '#f8fafc',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '10px',
                          fontSize: '13.5px',
                          color: '#0f172a',
                          fontWeight: 600,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* STEP 2: Hotel Accommodation & Meal Plan */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 1px 4px rgba(15, 23, 42, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '9999px', background: '#f0f9ff', border: '1px solid #e0f2fe', color: '#0284c7', fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 'fit-content' }}>
                    <Building2 size={14} />
                    <span>2. Hotel Accommodation & Meal Plan</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Choose Hotel Property
                      </label>
                      <SearchableSelect
                        options={[
                          { value: '', label: 'No Hotel (Transport Only)' },
                          ...hotels
                            .filter((h) => !selectedDestinationId || h.destinationId === selectedDestinationId)
                            .map((h) => {
                              const details = [h.city, h.starRating ? `${h.starRating}★` : null].filter(Boolean).join(' • ');
                              return {
                                value: h.id,
                                label: h.name,
                                subLabel: details,
                                badge: h.propertyType,
                              };
                            }),
                        ]}
                        value={selectedHotelId}
                        onChange={(val) => setSelectedHotelId(val)}
                        placeholder="Choose Hotel Property..."
                        searchPlaceholder="Type hotel name or star rating..."
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Room Category
                      </label>
                      <SearchableSelect
                        options={[
                          { value: '', label: 'Select Category' },
                          ...roomCategories.map((rc) => ({
                            value: rc.id,
                            label: rc.name,
                            subLabel: `Base Occupancy: ${rc.baseOccupancy}`,
                            badge: rc.extraBedSupported ? '+Extra Bed' : undefined,
                          })),
                        ]}
                        value={selectedRoomCatId}
                        onChange={(val) => setSelectedRoomCatId(val)}
                        disabled={!selectedHotelId || roomCategories.length === 0}
                        placeholder={!selectedHotelId ? 'Select a hotel first' : roomCategories.length === 0 ? 'No room categories' : 'Select Category...'}
                        searchPlaceholder="Search room category..."
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Meal Plan (Food)
                      </label>
                      <SearchableSelect
                        options={[
                          { value: 'EP', label: 'EP (Room Only — European Plan)', subLabel: 'No Meals Included' },
                          { value: 'CP', label: 'CP (Bed & Breakfast Included)', subLabel: 'Daily Breakfast' },
                          { value: 'MAP', label: 'MAP (Breakfast + Dinner Included)', subLabel: 'Daily Breakfast & Dinner' },
                          { value: 'AP', label: 'AP (All Meals — B, L, D)', subLabel: 'Daily Breakfast, Lunch & Dinner' },
                        ]}
                        value={selectedMealPlan}
                        onChange={(val) => setSelectedMealPlan(val as MealPlan)}
                        placeholder="Select Meal Plan..."
                        searchPlaceholder="Search EP, CP, MAP, AP..."
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Number of Hotel Rooms
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={hotelRoomsCount === 0 ? '' : hotelRoomsCount}
                        placeholder="1"
                        onChange={(e) => setHotelRoomsCount(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: '#f8fafc',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '10px',
                          fontSize: '13.5px',
                          color: '#0f172a',
                          fontWeight: 600,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* STEP 3: Agency Commercials & Live Quotation Calculation */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 1px 4px rgba(15, 23, 42, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '9999px', background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 'fit-content' }}>
                    <Percent size={14} />
                    <span>3. Agency Margin & Statutory Tax</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', alignItems: 'end' }}>
                    {/* Agency Margin with % / ₹ Toggle */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>Agency Margin {markupType === 'PERCENT' ? '(%)' : '(₹ Flat)'}</span>
                          <InfoBadge text="Profit margin added on top of base supplier costs (hotels, transport, tolls) before GST." />
                        </label>
                        <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '8px', padding: '2px', gap: '2px' }}>
                          <button
                            type="button"
                            onClick={() => setMarkupType('PERCENT')}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              border: 'none',
                              cursor: 'pointer',
                              background: markupType === 'PERCENT' ? '#0f766e' : 'transparent',
                              color: markupType === 'PERCENT' ? '#ffffff' : '#64748b',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => setMarkupType('FLAT')}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              border: 'none',
                              cursor: 'pointer',
                              background: markupType === 'FLAT' ? '#0f766e' : 'transparent',
                              color: markupType === 'FLAT' ? '#ffffff' : '#64748b',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            ₹
                          </button>
                        </div>
                      </div>
                      <div style={{ position: 'relative' }}>
                        {markupType === 'PERCENT' ? (
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={markupPercent === 0 ? '' : markupPercent}
                            onChange={(e) => setMarkupPercent(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            placeholder="10"
                            style={{
                              width: '100%',
                              padding: '10px 34px 10px 14px',
                              background: '#f8fafc',
                              border: '1.5px solid #cbd5e1',
                              borderRadius: '10px',
                              fontSize: '13.5px',
                              color: '#0f172a',
                              fontWeight: 700,
                            }}
                          />
                        ) : (
                          <input
                            type="number"
                            min={0}
                            value={markupAmount === 0 ? '' : markupAmount}
                            onChange={(e) => setMarkupAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            style={{
                              width: '100%',
                              padding: '10px 34px 10px 14px',
                              background: '#f8fafc',
                              border: '1.5px solid #cbd5e1',
                              borderRadius: '10px',
                              fontSize: '13.5px',
                              color: '#0f172a',
                              fontWeight: 700,
                            }}
                          />
                        )}
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700, fontSize: '13px' }}>
                          {markupType === 'PERCENT' ? '%' : '₹'}
                        </span>
                      </div>
                    </div>

                    {/* Special Discount with % / ₹ Toggle */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                          <span>Special Discount {discountType === 'PERCENT' ? '(%)' : '(₹ Flat)'}</span>
                          <InfoBadge text="Direct customer promotional discount deducted from total selling price." />
                        </label>
                        <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '8px', padding: '2px', gap: '2px' }}>
                          <button
                            type="button"
                            onClick={() => setDiscountType('PERCENT')}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              border: 'none',
                              cursor: 'pointer',
                              background: discountType === 'PERCENT' ? '#0f766e' : 'transparent',
                              color: discountType === 'PERCENT' ? '#ffffff' : '#64748b',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscountType('FLAT')}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              border: 'none',
                              cursor: 'pointer',
                              background: discountType === 'FLAT' ? '#0f766e' : 'transparent',
                              color: discountType === 'FLAT' ? '#ffffff' : '#64748b',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            ₹
                          </button>
                        </div>
                      </div>
                      <div style={{ position: 'relative' }}>
                        {discountType === 'PERCENT' ? (
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={discountPercent === 0 ? '' : discountPercent}
                            onChange={(e) => setDiscountPercent(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            style={{
                              width: '100%',
                              padding: '10px 34px 10px 14px',
                              background: '#f8fafc',
                              border: '1.5px solid #cbd5e1',
                              borderRadius: '10px',
                              fontSize: '13.5px',
                              color: '#0f172a',
                              fontWeight: 700,
                            }}
                          />
                        ) : (
                          <input
                            type="number"
                            min={0}
                            value={discountAmount === 0 ? '' : discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            style={{
                              width: '100%',
                              padding: '10px 34px 10px 14px',
                              background: '#f8fafc',
                              border: '1.5px solid #cbd5e1',
                              borderRadius: '10px',
                              fontSize: '13.5px',
                              color: '#0f172a',
                              fontWeight: 700,
                            }}
                          />
                        )}
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700, fontSize: '13px' }}>
                          {discountType === 'PERCENT' ? '%' : '₹'}
                        </span>
                      </div>
                    </div>

                    {/* Statutory GST (Always strictly %) */}
                    <div>
                      <label
                        htmlFor="taxApp"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          background: isTaxApplicable ? '#f0fdf4' : '#f8fafc',
                          border: isTaxApplicable ? '1.5px solid #86efac' : '1.5px solid #cbd5e1',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          height: '42px',
                        }}
                      >
                        <input
                          type="checkbox"
                          id="taxApp"
                          checked={isTaxApplicable}
                          onChange={(e) => setIsTaxApplicable(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: isTaxApplicable ? '#166534' : '#334155', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>Include Tour GST (5%)</span>
                          <InfoBadge text="Statutory 5% GST under SAC 998555 for Tour Operator services (non-negotiable government tax)." />
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Live Calculation & Executive Profit Studio */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                      border: '1.5px solid #ccfbf1',
                      borderRadius: '16px',
                      padding: '18px 20px',
                      boxShadow: '0 4px 16px -2px rgba(15, 118, 110, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    {/* Header: Title & Recalculate Button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: calculatedSummary ? '#10b981' : '#94a3b8' }} />
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Live Commercials & Net Profit Breakdown
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleCalculatePreview}
                        disabled={!selectedLeadId || !travelStartDate || !travelEndDate || calculating}
                        className="btn btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          padding: '6px 14px',
                          background: '#ffffff',
                          fontWeight: 700,
                          color: '#0f766e',
                          borderColor: '#99f6e4',
                          borderRadius: '8px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        }}
                      >
                        <RefreshCw size={13} className={calculating ? 'animate-spin' : ''} />
                        <span>{calculating ? 'Computing...' : 'Refresh Estimate'}</span>
                      </button>
                    </div>

                    {/* Breakdown 4-Metric Responsive Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      
                      {/* Metric 1: Total Supplier Expenses */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>Supplier Expenses</span>
                          <InfoBadge text="Total vendor cost: Hotels, Vehicle hire, Driver allowance, Tolls & Parking." />
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>
                          {calculatedSummary
                            ? `₹${Math.round(calculatedSummary.baseCost ?? calculatedSummary.totalBaseSupplierCost ?? 0).toLocaleString('en-IN')}`
                            : '—'}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                          Hotels, vehicle & tolls
                        </div>
                      </div>

                      {/* Metric 2: Markup & Discount */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>Margin & Discount</span>
                          <InfoBadge text="Agency commission earned minus any customer discount applied." />
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f766e', marginTop: '3px' }}>
                          {calculatedSummary
                            ? `+₹${Math.round(calculatedSummary.totalMarkupAmount ?? 0).toLocaleString('en-IN')}`
                            : '—'}
                          {calculatedSummary && (
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#0d9488', marginLeft: '4px' }}>
                              ({calculatedSummary.markupPercent}%)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '10.5px', color: calculatedSummary?.discountAmount ? '#be123c' : '#94a3b8', marginTop: '2px' }}>
                          {calculatedSummary?.discountAmount && calculatedSummary.discountAmount > 0
                            ? `Discount: -₹${Math.round(calculatedSummary.discountAmount).toLocaleString('en-IN')} (${calculatedSummary.discountPercent}%)`
                            : 'No special discount'}
                        </div>
                      </div>

                      {/* Metric 3: Tour GST (5%) */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>Govt GST (5%)</span>
                          <InfoBadge text="Statutory 5% GST (2.5% CGST + 2.5% SGST) under SAC 998555 for Govt tax liability. Not company profit." />
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#475569', marginTop: '3px' }}>
                          {calculatedSummary?.isTaxApplicable
                            ? `+₹${Math.round(calculatedSummary.taxAmount ?? calculatedSummary.gstAmount ?? 0).toLocaleString('en-IN')}`
                            : '₹0 (Exempt)'}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                          SAC 998555 Tax Liability
                        </div>
                      </div>

                    </div>

                    {/* Final Customer Quotation Amount Banner */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #0f766e 0%, #134e4a 100%)',
                        borderRadius: '12px',
                        padding: '14px 20px',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        boxShadow: '0 4px 14px rgba(15, 118, 110, 0.22)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', fontWeight: 800, color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          <CheckCircle size={13} />
                          <span>Total Customer Proposal Price</span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#ccfbf1', marginTop: '2px' }}>
                          Final customer selling price (Inclusive of all stays, transport, margins & 5% GST)
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                          {calculating ? (
                            <span style={{ fontSize: '17px', color: '#a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <RefreshCw size={15} className="animate-spin" /> Computing...
                            </span>
                          ) : calculatedSummary ? (
                            `₹${Math.round(calculatedSummary.finalSellingPrice).toLocaleString('en-IN')}`
                          ) : (
                            <span style={{ fontSize: '13px', color: '#99f6e4', fontWeight: 600 }}>
                              Fill dates & hotel to calculate
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer — PERMANENTLY DOCKED, ZERO OVERLAPPING */}
              <div
                style={{
                  padding: '16px 28px',
                  background: '#f8fafc',
                  borderTop: '1.5px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  flexShrink: 0,
                }}
              >
                <div>
                  {calculatedSummary ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                        <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f766e' }}>
                          ₹{Math.round(calculatedSummary.finalSellingPrice).toLocaleString('en-IN')} Total Cost
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '2px 9px', borderRadius: '6px', border: '1px solid #86efac', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <TrendingUp size={12} color="#15803d" />
                        Apna Profit: ₹{Math.round(calculatedSummary.projectedGrossProfit !== undefined ? calculatedSummary.projectedGrossProfit : Math.max(0, (calculatedSummary.totalMarkupAmount || 0) - (calculatedSummary.discountAmount || 0))).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Ready to generate formal proposal
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="btn btn-secondary"
                    style={{ fontSize: '13.5px', padding: '9px 18px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedLeadId || !travelStartDate || !travelEndDate || calculating}
                    className="btn btn-primary"
                    style={{
                      fontSize: '13.5px',
                      padding: '9px 22px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(15, 118, 110, 0.28)',
                    }}
                  >
                    <FileSpreadsheet size={16} />
                    <span>{calculating ? 'Generating...' : 'Save & Generate Quotation'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Shareable Proposal Link */}
      {shareableModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <LinkIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Quotation Proposal Issued!</h2>
            <p className="text-xs text-slate-500 mb-4">
              Official branded customer proposal is ready for quote <strong className="text-slate-700">{shareableModal.quoteNumber}</strong>. Share this link on WhatsApp or email.
            </p>

            {(() => {
              const urlInfo = resolvePublicQuoteUrl(shareableModal.token);
              return (
                <>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-left text-xs font-mono text-teal-800 break-all mb-4">
                    {urlInfo.url}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(urlInfo.url);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedLink ? 'Copied Proposal Link!' : 'Copy Proposal Link'}
                    </button>
                    <a
                      href={urlInfo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                    >
                      Open Proposal
                    </a>
                    <button
                      onClick={() => setShareableModal(null)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal: Review Override (Admin Approval) */}
      {reviewQuote && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center gap-2 text-amber-600 font-semibold mb-1">
              <ShieldAlert className="w-5 h-5" />
              <span>Review Price Override</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Quotation <span className="font-mono font-bold">{reviewQuote.quoteNumber}</span> requested a discount of{' '}
              <span className="font-semibold text-slate-900">{reviewQuote.pricingSummary.discountPercent}%</span> and markup of{' '}
              <span className="font-semibold text-slate-900">{reviewQuote.pricingSummary.markupPercent}%</span>.
            </p>

            {reviewQuote.approvalReason && (
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-xs text-amber-800 mb-4">
                <strong>Reason:</strong> {reviewQuote.approvalReason}
              </div>
            )}

            <div className="space-y-3 mb-4">
              <label className="block text-xs font-medium text-slate-700">
                Decision Notes / Comments
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Approved discount for repeat client"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewQuote(null)}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewSubmitting}
                onClick={() => handleReviewDecision('REJECT')}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg disabled:opacity-50"
              >
                Reject Override
              </button>
              <button
                type="button"
                disabled={reviewSubmitting}
                onClick={() => handleReviewDecision('APPROVE')}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg disabled:opacity-50"
              >
                Approve Quotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Revise Quotation (Comprehensive Edit) */}
      {reviseQuote && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-slate-100">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">Revise Quotation {reviseQuote.quoteNumber}</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200">
                    Creating v{(reviseQuote.currentVersion || 1) + 1}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust travel dates, travelers, meal plan, or pricing. Version v{reviseQuote.currentVersion} will be immutably snapshotted into version history.
                </p>
              </div>
              <button onClick={() => setReviseQuote(null)} className="btn-icon text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviseQuotation} className="space-y-4">
              {/* Section 1: Reason for Revision */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Change Reason (Audit Trail) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reviseReason}
                  onChange={(e) => setReviseReason(e.target.value)}
                  placeholder="e.g. Upgraded meal plan to MAP, extended 1 night per customer request"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Section 2: Travel Dates */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  1. Travel Dates & Duration
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Travel Start Date</label>
                    <input
                      type="date"
                      required
                      value={reviseStartDate}
                      onChange={(e) => setReviseStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Travel End Date</label>
                    <input
                      type="date"
                      required
                      value={reviseEndDate}
                      onChange={(e) => setReviseEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Travelers, Rooms & Meal Plan */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  2. Travelers, Rooms & Meal Plan
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Adults (12+)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      required
                      value={reviseAdults}
                      onChange={(e) => setReviseAdults(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Children</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={reviseChildren}
                      onChange={(e) => setReviseChildren(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Rooms</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={reviseRooms}
                      onChange={(e) => setReviseRooms(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Meal Plan</label>
                    <select
                      value={reviseMealPlan}
                      onChange={(e) => setReviseMealPlan(e.target.value as MealPlan)}
                      className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="CP">CP (Breakfast)</option>
                      <option value="MAP">MAP (Breakfast+Dinner)</option>
                      <option value="AP">AP (All Meals)</option>
                      <option value="EP">EP (Room Only)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: Pricing & Margin */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  3. Pricing & Discounts
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700 inline-flex items-center gap-1">
                        <span>Markup {reviseMarkupType === 'PERCENT' ? '(%)' : '(₹)'}</span>
                        <InfoBadge text="Margin added above net supplier cost for this version." />
                      </label>
                      <div className="inline-flex bg-slate-200 rounded p-0.5 gap-0.5">
                        <button
                          type="button"
                          onClick={() => setReviseMarkupType('PERCENT')}
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${reviseMarkupType === 'PERCENT' ? 'bg-teal-700 text-white' : 'text-slate-600'}`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviseMarkupType('FLAT')}
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${reviseMarkupType === 'FLAT' ? 'bg-teal-700 text-white' : 'text-slate-600'}`}
                        >
                          ₹
                        </button>
                      </div>
                    </div>
                    {reviseMarkupType === 'PERCENT' ? (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={reviseMarkup === 0 ? '' : reviseMarkup}
                        placeholder="0"
                        onChange={(e) => setReviseMarkup(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                      />
                    ) : (
                      <input
                        type="number"
                        min={0}
                        value={reviseMarkupAmount === 0 ? '' : reviseMarkupAmount}
                        placeholder="0"
                        onChange={(e) => setReviseMarkupAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                      />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700 inline-flex items-center gap-1">
                        <span>Discount {reviseDiscountType === 'PERCENT' ? '(%)' : '(₹)'}</span>
                        <InfoBadge text="Special discount offered to traveler for this revision." />
                      </label>
                      <div className="inline-flex bg-slate-200 rounded p-0.5 gap-0.5">
                        <button
                          type="button"
                          onClick={() => setReviseDiscountType('PERCENT')}
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${reviseDiscountType === 'PERCENT' ? 'bg-teal-700 text-white' : 'text-slate-600'}`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviseDiscountType('FLAT')}
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${reviseDiscountType === 'FLAT' ? 'bg-teal-700 text-white' : 'text-slate-600'}`}
                        >
                          ₹
                        </button>
                      </div>
                    </div>
                    {reviseDiscountType === 'PERCENT' ? (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={reviseDiscount === 0 ? '' : reviseDiscount}
                        placeholder="0"
                        onChange={(e) => setReviseDiscount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                      />
                    ) : (
                      <input
                        type="number"
                        min={0}
                        value={reviseDiscountAmount === 0 ? '' : reviseDiscountAmount}
                        placeholder="0"
                        onChange={(e) => setReviseDiscountAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Section 5: Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Special Remarks / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reviseNotes}
                  onChange={(e) => setReviseNotes(e.target.value)}
                  placeholder="Special instructions, dietary preferences, or room view notes..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviseQuote(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revising || !reviseReason.trim()}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {revising ? 'Saving Revision...' : `Save Revision v${(reviseQuote.currentVersion || 1) + 1}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer / Modal: Version History */}
      {versionHistoryQuote && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-teal-600" />
                Version History: {versionHistoryQuote.quoteNumber}
              </h2>
              <button
                onClick={() => setVersionHistoryQuote(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingVersions ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading history...</div>
            ) : versionList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No archived previous versions. Current version is v{versionHistoryQuote.currentVersion}.
              </div>
            ) : (
              <div className="space-y-3">
                {versionList.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 bg-slate-200 px-2 py-0.5 rounded font-mono">
                        Version {ver.versionNumber}
                      </span>
                      <span className="text-slate-400">
                        {new Date(ver.createdAt).toLocaleDateString()} {new Date(ver.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {ver.changeReason && (
                      <div className="text-slate-700">
                        <strong>Reason:</strong> {ver.changeReason}
                      </div>
                    )}
                    <div className="text-slate-600">
                      <strong>Archived Selling Price:</strong> ₹
                      {ver.snapshot.pricingSummary.finalSellingPrice.toLocaleString('en-IN')} (Markup: {ver.snapshot.pricingSummary.markupPercent}%, Discount: {ver.snapshot.pricingSummary.discountPercent}%)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Shareable Customer Quotation Link */}
      {shareableModal && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-teal-600" />
                Customer Quotation Link Issued
              </h3>
              <button
                onClick={() => setShareableModal(null)}
                className="btn-icon"
              >
                ✕
              </button>
            </div>

            <div className="modal-body space-y-4">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>
                  Quotation <strong>{shareableModal.quoteNumber}</strong> is now officially issued. Share this secure token link with the client.
                </span>
              </div>

              {(() => {
                const urlInfo = resolvePublicQuoteUrl(shareableModal.token);
                return (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Customer Public Portal URL
                      </label>
                      {urlInfo.isDevelopmentOrLocalhost ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                          Local Development Only
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                          Production Domain Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={urlInfo.url}
                        className="w-full text-xs font-mono bg-slate-50 border border-slate-200 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(urlInfo.url);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 3000);
                        }}
                        className="btn btn-secondary btn-sm flex items-center gap-1 flex-shrink-0"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>

                    {urlInfo.isDevelopmentOrLocalhost && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 leading-tight">
                        ⚠️ <strong>Development Notice:</strong> Public customer domain is not configured via <code>NEXT_PUBLIC_PUBLIC_QUOTE_BASE_URL</code>. This link uses <code>{urlInfo.baseUrl || 'localhost'}</code> and will only work on this machine. External travelers on mobile devices cannot open localhost URLs.
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <span className="font-semibold text-slate-800 block">Security & Privacy:</span>
                <p>• Internal supplier costs, markup percent, and profit margins are completely stripped.</p>
                <p>• Customer can accept the quote or submit revision notes directly from this link.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShareableModal(null)}
                className="btn btn-secondary"
              >
                Done
              </button>
              {(() => {
                const urlInfo = resolvePublicQuoteUrl(shareableModal.token);
                return (
                  <div className="flex items-center gap-2">
                    <a
                      href={urlInfo.url || `/quote/${shareableModal.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                    >
                      Open Customer Portal
                    </a>
                    <a
                      href={`${getPublicApiUrl()}/quotations/public/${shareableModal.token}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                    >
                      <Printer className="w-4 h-4 mr-1.5" />
                      View / Download PDF
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modern Acceptance Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(quoteToAccept)}
        title="Confirm Proposal Acceptance"
        variant="primary"
        confirmLabel="Accept & Create Booking"
        cancelLabel="Cancel"
        isLoading={Boolean(acceptingQuoteId)}
        onCancel={() => {
          if (!acceptingQuoteId) setQuoteToAccept(null);
        }}
        onConfirm={executeAcceptQuotation}
        message={
          quoteToAccept && (
            <div className="space-y-3">
              <p className="text-slate-700 text-sm">
                Mark proposal <strong>{quoteToAccept.quoteNumber}</strong> as <strong>ACCEPTED</strong> on traveler&apos;s behalf?
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-semibold text-slate-800">{quoteToAccept.customerName || 'Traveler'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Destination:</span>
                  <span className="font-semibold text-slate-800">{quoteToAccept.destinationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-semibold text-slate-800">
                    {quoteToAccept.durationNights}N / {quoteToAccept.durationDays}D
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <span className="text-slate-500">Total Price:</span>
                  <span className="font-bold text-teal-700">
                    {formatCurrency(quoteToAccept.pricingSummary?.finalSellingPrice)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                This will automatically generate a new official booking in the Bookings &amp; Payment Ledger.
              </p>
            </div>
          )
        }
      />
    </div>
  );
}
