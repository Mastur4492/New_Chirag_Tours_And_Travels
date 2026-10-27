'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Building2,
  Calendar,
  Car,
  Compass,
  Receipt,
  ArrowRight,
  Users,
  FileSpreadsheet,
  Sparkles,
  Star,
  Clock,
  Phone,
  MessageCircle,
  TrendingUp,
  BookCheck,
  ShieldCheck,
  AlertCircle,
  Zap,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  BarChart3,
  Layers,
  Activity,
  Briefcase,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { apiRequest, ensureAdminToken } from '@/lib/api';
import { COMPANY_BRANDING } from '@/lib/branding';
import {
  LEAD_STATUS_CONFIG,
  QUOTATION_STATUS_CONFIG,
  formatDate,
  formatCurrency,
  isToday,
  isOverdue,
} from '@/lib/labels';
import {
  AnalyticsDateBasis,
  AnalyticsDateRangeOption,
  DashboardSummaryDto,
  FinancialTrendsDto,
  LeadDto,
  QuotationDto,
  TopDestinationAnalyticsDto,
} from '@chirag/types';
import { FinancialTrendsChart } from '@/components/charts/FinancialTrendsChart';
import { BookingDistributionDonut } from '@/components/charts/BookingDistributionDonut';
import { LeadConversionFunnel } from '@/components/charts/LeadConversionFunnel';
import { TopDestinationsCard } from '@/components/charts/TopDestinationsCard';
import { DateRangeSelector } from '@/components/charts/DateRangeSelector';

function cleanDestinationName(name?: string): string {
  if (!name) return 'Custom Destination';
  const cleaned = name.replace(/\s*\d{9,}\b/g, '').trim();
  return cleaned || name;
}

function getInitials(name?: string): string {
  if (!name) return 'NC';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function DashboardPage() {
  // Date filter state
  const [selectedRange, setSelectedRange] = useState<AnalyticsDateRangeOption>('30d');
  const [selectedDateBasis, setSelectedDateBasis] = useState<AnalyticsDateBasis>('bookingDate');

  // Top-level Dashboard Tab View: 'operations' (Daily Command) | 'analytics' (Deep Financial BI) | 'inventory' (Master Catalogs)
  const [dashboardTab, setDashboardTab] = useState<'operations' | 'analytics' | 'inventory'>('operations');

  // Interactive Analytics Tab (Trends vs Funnel)
  const [analyticsTab, setAnalyticsTab] = useState<'trends' | 'funnel'>('trends');

  // Analytics data state
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [trends, setTrends] = useState<FinancialTrendsDto | null>(null);
  const [topDestinations, setTopDestinations] = useState<TopDestinationAnalyticsDto[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Operational feeds and inventory state
  const [recentLeads, setRecentLeads] = useState<LeadDto[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<QuotationDto[]>([]);
  const [dueFollowUps, setDueFollowUps] = useState<LeadDto[]>([]);
  const [inventoryCounts, setInventoryCounts] = useState({
    destinations: 0,
    hotels: 0,
    seasons: 0,
    vehicles: 0,
    packages: 0,
    taxes: 0,
  });
  const [inventoryLoading, setInventoryLoading] = useState(true);

  // Load analytics when date range or basis changes
  const loadAnalytics = useCallback(async (range: AnalyticsDateRangeOption, basis: AnalyticsDateBasis) => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      await ensureAdminToken();

      const [summaryRes, trendsRes, topDestRes] = await Promise.all([
        apiRequest<DashboardSummaryDto>(`/analytics/dashboard-summary?range=${range}&dateBasis=${basis}`),
        apiRequest<FinancialTrendsDto>(`/analytics/financial-trends?range=${range}&dateBasis=${basis}`),
        apiRequest<{ destinations: TopDestinationAnalyticsDto[] }>(`/analytics/top-destinations?range=${range}&dateBasis=${basis}&limit=5`),
      ]);

      setSummary(summaryRes);
      setTrends(trendsRes);
      setTopDestinations(topDestRes?.destinations || []);
    } catch (err: any) {
      console.error('Failed to load dashboard analytics:', err);
      setAnalyticsError(err.message || 'Unable to load analytics data.');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // Load operational feeds once on mount
  const loadOperationalFeeds = async () => {
    setInventoryLoading(true);
    try {
      await ensureAdminToken();

      const [leadsRes, quotesRes, destRes, hotelRes, seasonRes, vehicleRes, pkgRes, taxRes] =
        await Promise.allSettled([
          apiRequest<LeadDto[]>('leads?limit=15'),
          apiRequest<QuotationDto[]>('quotations?limit=6'),
          apiRequest<any[]>('destinations'),
          apiRequest<any[]>('hotels'),
          apiRequest<any[]>('seasons'),
          apiRequest<any[]>('transport/vehicles'),
          apiRequest<any[]>('packages'),
          apiRequest<any[]>('taxes'),
        ]);

      const allLeads = leadsRes.status === 'fulfilled' && Array.isArray(leadsRes.value) ? leadsRes.value : [];
      const allQuotes = quotesRes.status === 'fulfilled' && Array.isArray(quotesRes.value) ? quotesRes.value : [];

      setRecentLeads(allLeads.slice(0, 5));
      setRecentQuotes(allQuotes.slice(0, 5));

      const urgent = allLeads.filter(
        (l) => l.nextFollowUpDate && (isToday(l.nextFollowUpDate) || isOverdue(l.nextFollowUpDate))
      );
      setDueFollowUps(urgent.slice(0, 4));

      setInventoryCounts({
        destinations: destRes.status === 'fulfilled' && Array.isArray(destRes.value) ? destRes.value.length : 0,
        hotels: hotelRes.status === 'fulfilled' && Array.isArray(hotelRes.value) ? hotelRes.value.length : 0,
        seasons: seasonRes.status === 'fulfilled' && Array.isArray(seasonRes.value) ? seasonRes.value.length : 0,
        vehicles: vehicleRes.status === 'fulfilled' && Array.isArray(vehicleRes.value) ? vehicleRes.value.length : 0,
        packages: pkgRes.status === 'fulfilled' && Array.isArray(pkgRes.value) ? pkgRes.value.length : 0,
        taxes: taxRes.status === 'fulfilled' && Array.isArray(taxRes.value) ? taxRes.value.length : 0,
      });
    } catch (err) {
      console.error('Failed to load operational feeds:', err);
    } finally {
      setInventoryLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics(selectedRange, selectedDateBasis);
  }, [selectedRange, selectedDateBasis, loadAnalytics]);

  useEffect(() => {
    loadOperationalFeeds();
  }, []);

  const handleFilterChange = (range: AnalyticsDateRangeOption, basis: AnalyticsDateBasis) => {
    setSelectedRange(range);
    setSelectedDateBasis(basis);
  };

  const resolvedWindowText = summary?.dateRange.startDate && summary?.dateRange.endDate
    ? `${formatDate(summary.dateRange.startDate)} – ${formatDate(summary.dateRange.endDate)}`
    : selectedRange === 'all'
    ? 'All Historical Records'
    : undefined;

  const inventoryGrid = [
    {
      title: 'Destinations',
      desc: 'Tour circuits & scenic regions',
      href: '/destinations',
      icon: MapPin,
      count: inventoryCounts.destinations,
      badge: 'Active Hubs',
    },
    {
      title: 'Hotels & Rooms',
      desc: 'Contracted stays & meal plans',
      href: '/hotels',
      icon: Building2,
      count: inventoryCounts.hotels,
      badge: 'Direct Rates',
    },
    {
      title: 'Seasons & Pricing',
      desc: 'Peak & regular seasonal cards',
      href: '/seasons',
      icon: Calendar,
      count: inventoryCounts.seasons,
      badge: 'Rate Engine',
    },
    {
      title: 'Transport Fleet',
      desc: 'Vendors, cabs & km tariffs',
      href: '/transport',
      icon: Car,
      count: inventoryCounts.vehicles,
      badge: 'Duty Slips',
    },
    {
      title: 'Tour Packages',
      desc: 'Handcrafted holiday catalog',
      href: '/packages',
      icon: Compass,
      count: inventoryCounts.packages,
      badge: 'Catalog',
    },
    {
      title: 'GST & Tax Settings',
      desc: '5% Tour SAC 998555 rules',
      href: '/taxes',
      icon: Receipt,
      count: inventoryCounts.taxes,
      badge: 'Compliant',
    },
  ];

  // Collection completion rate calculation
  const contractedVal = summary?.contractedBookingValue || 0;
  const verifiedCash = summary?.verifiedCashCollected || 0;
  const collectionPercent = contractedVal > 0 ? Math.min(100, Math.round((verifiedCash / contractedVal) * 100)) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', width: '100%' }}>
      {/* =========================================================================
          1. EXECUTIVE COMMAND HERO BAR (SLEEK, COMPACT LUXURY FINISH)
          ========================================================================= */}
      <section
        style={{
          background: 'linear-gradient(135deg, #042f2e 0%, #064e3b 45%, #0f172a 100%)',
          borderRadius: '16px',
          border: '1.5px solid rgba(20, 184, 166, 0.25)',
          padding: '18px 24px',
          boxShadow: '0 8px 25px -5px rgba(6, 40, 45, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          position: 'relative',
          overflow: 'hidden',
          color: '#ffffff',
        }}
      >
        {/* Subtle Ambient Radial Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '8%',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(20, 184, 166, 0.2) 0%, transparent 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
          {/* Identity & Status */}
          <div className="flex items-center gap-4 min-w-0">
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: '#ffffff',
                padding: 7,
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.25), 0 0 0 2px rgba(52, 211, 153, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <img
                src={COMPANY_BRANDING.logos.main}
                alt={COMPANY_BRANDING.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {COMPANY_BRANDING.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 text-xs text-teal-100/90 font-medium">
                <span>Managing Director: <strong className="text-white font-bold">{COMPANY_BRANDING.owner}</strong></span>
                <span className="text-teal-400">•</span>
                <span>Danilimda, Ahmedabad</span>
                <span className="text-teal-400">•</span>
                <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                  <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                  <span>5.0 Rating (40 Reviews)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Middle: Live Telemetry Micro-Pills (Eliminates Empty Space) */}
          <div className="hidden xl:flex items-center gap-3">
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: 12,
                padding: '7px 14px',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ fontSize: '10px', color: '#99f6e4', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Season
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#ffffff', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                <span>{summary?.activeBookingsCount || 0} Confirmed Tour</span>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: 12,
                padding: '7px 14px',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ fontSize: '10px', color: '#99f6e4', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Collection Rate
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#34d399', marginTop: 1 }}>
                {collectionPercent}% in Bank
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: 12,
                padding: '7px 14px',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ fontSize: '10px', color: '#99f6e4', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pipeline Proposals
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#ffffff', marginTop: 1 }}>
                {summary?.totalQuotationsCount || 0} Live Quotes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. SINGLE EXECUTIVE FINANCIAL KPI STRIP (ZERO DUPLICATION)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Contracted Bookings */}
        <Link
          href="/bookings"
          className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-teal-500 hover:shadow-md transition-all group block relative overflow-hidden"
          style={{ borderTop: '4px solid #0f766e' }}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11.5px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-600" />
              <span>Contracted Bookings</span>
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <BookCheck className="w-4 h-4" />
            </div>
          </div>
          {analyticsLoading ? (
            <div className="h-8 w-28 bg-slate-100 rounded-lg animate-pulse my-2" />
          ) : (
            <div className="text-2xl font-black text-slate-900 my-1.5 tracking-tight">
              {formatCurrency(summary?.contractedBookingValue || 0)}
            </div>
          )}
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between pt-1 border-t border-slate-100">
            <span>{summary?.activeBookingsCount || 0} active tour commitments</span>
            <span className="text-teal-700 font-semibold group-hover:underline flex items-center gap-0.5">
              Ledger <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        {/* Card 2: Verified Cash In Bank */}
        <Link
          href="/bookings"
          className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-500 hover:shadow-md transition-all group block relative overflow-hidden"
          style={{ borderTop: '4px solid #059669' }}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11.5px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Verified Cash</span>
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          {analyticsLoading ? (
            <div className="h-8 w-28 bg-slate-100 rounded-lg animate-pulse my-2" />
          ) : (
            <div className="text-2xl font-black text-emerald-700 my-1.5 tracking-tight">
              {formatCurrency(summary?.verifiedCashCollected || 0)}
            </div>
          )}
          {/* Mini Progress Bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden my-1">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${collectionPercent}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between pt-1">
            <span>{collectionPercent}% collected</span>
            <span className="text-emerald-700 font-semibold group-hover:underline flex items-center gap-0.5">
              Verified <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        {/* Card 3: Pending Receivables */}
        <Link
          href="/bookings"
          className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-amber-500 hover:shadow-md transition-all group block relative overflow-hidden"
          style={{ borderTop: '4px solid #d97706' }}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11.5px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Pending Receivables</span>
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          {analyticsLoading ? (
            <div className="h-8 w-28 bg-slate-100 rounded-lg animate-pulse my-2" />
          ) : (
            <div className="text-2xl font-black text-amber-800 my-1.5 tracking-tight">
              {formatCurrency(summary?.outstandingReceivables || 0)}
            </div>
          )}
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Zero overdue default risk</span>
            <span className="text-amber-700 font-semibold group-hover:underline flex items-center gap-0.5">
              Collect <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        {/* Card 4: Quoted Pipeline */}
        <Link
          href="/quotations"
          className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-500 hover:shadow-md transition-all group block relative overflow-hidden"
          style={{ borderTop: '4px solid #2563eb' }}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11.5px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Quoted Pipeline</span>
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          {analyticsLoading ? (
            <div className="h-8 w-28 bg-slate-100 rounded-lg animate-pulse my-2" />
          ) : (
            <div className="text-2xl font-black text-blue-900 my-1.5 tracking-tight">
              {formatCurrency(summary?.totalQuotedPipelineValue || 0)}
            </div>
          )}
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between pt-1 border-t border-slate-100">
            <span>{summary?.totalQuotationsCount || 0} active client proposals</span>
            <span className="text-blue-700 font-semibold group-hover:underline flex items-center gap-0.5">
              Quotes <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
      </div>

      {/* =========================================================================
          3. DASHBOARD VIEW SWITCHER (STREAMLINED & ELEGANT)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setDashboardTab('operations')}
            style={{
              background: dashboardTab === 'operations' ? '#0f766e' : 'transparent',
              color: dashboardTab === 'operations' ? '#ffffff' : '#475569',
              boxShadow: dashboardTab === 'operations' ? '0 3px 10px rgba(15, 118, 110, 0.28)' : 'none',
              border: dashboardTab === 'operations' ? '1px solid #0d9488' : '1px solid transparent',
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <Clock className={`w-3.5 h-3.5 ${dashboardTab === 'operations' ? 'text-teal-200' : 'text-teal-600'}`} />
            <span>Daily Operations</span>
            {dueFollowUps.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${dashboardTab === 'operations' ? 'bg-amber-400 text-slate-900' : 'bg-amber-500 text-white'}`}>
                {dueFollowUps.length} Due
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setDashboardTab('analytics')}
            style={{
              background: dashboardTab === 'analytics' ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : 'transparent',
              color: dashboardTab === 'analytics' ? '#ffffff' : '#475569',
              boxShadow: dashboardTab === 'analytics' ? '0 3px 12px rgba(15, 23, 42, 0.3)' : 'none',
              border: dashboardTab === 'analytics' ? '1px solid #334155' : '1px solid transparent',
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <TrendingUp className={`w-3.5 h-3.5 ${dashboardTab === 'analytics' ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span>Financial Analytics & BI</span>
            <span
              style={{
                fontSize: '9.5px',
                padding: '1px 6px',
                borderRadius: '4px',
                background: dashboardTab === 'analytics' ? 'rgba(45, 212, 191, 0.2)' : '#e2e8f0',
                color: dashboardTab === 'analytics' ? '#2dd4bf' : '#64748b',
                fontWeight: 800,
              }}
            >
              LIVE BI
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardTab('inventory')}
            style={{
              background: dashboardTab === 'inventory' ? '#0f766e' : 'transparent',
              color: dashboardTab === 'inventory' ? '#ffffff' : '#475569',
              boxShadow: dashboardTab === 'inventory' ? '0 3px 10px rgba(15, 118, 110, 0.28)' : 'none',
              border: dashboardTab === 'inventory' ? '1px solid #0d9488' : '1px solid transparent',
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <Building2 className={`w-3.5 h-3.5 ${dashboardTab === 'inventory' ? 'text-teal-200' : 'text-blue-600'}`} />
            <span>Master Catalogs</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${dashboardTab === 'inventory' ? 'bg-teal-800 text-teal-100' : 'bg-slate-200 text-slate-700'}`}>
              6
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 text-xs text-slate-500 font-semibold bg-slate-50 rounded-xl border border-slate-200/70">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-700 font-bold">Safe Paise Verified Ledger</span>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: DAILY OPERATIONS & COMMAND (INTEGRATED COMPLETE WORKSPACE)
          ========================================================================= */}
      {dashboardTab === 'operations' && (
        <div className="space-y-6">
          {/* Urgent Follow-Ups Alert Ribbon (If Any Due) */}
          {dueFollowUps.length > 0 && (
            <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm sm:text-base font-bold text-amber-900">
                    Action Required: {dueFollowUps.length} Client Follow-Up(s) Due Today
                  </h3>
                </div>
                <Link
                  href="/leads"
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1"
                >
                  Open CRM Pipeline <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {dueFollowUps.map((l) => (
                  <div
                    key={l.id}
                    className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">{l.customerName || 'Customer'}</span>
                        <span className="font-mono text-[10px] text-teal-700 font-semibold px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200">{l.leadNumber}</span>
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{l.customerMobile}</span>
                      </div>
                      <div className="text-[11px] text-amber-700 font-medium pt-1.5 mt-1.5 border-t border-slate-100 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600 flex-shrink-0" />
                        <span>{formatDate(l.nextFollowUpDate)}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <a
                        href={`tel:${l.customerMobile}`}
                        className="font-semibold text-slate-700 hover:text-teal-700 flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-teal-600" /> Call
                      </a>
                      <a
                        href={`https://wa.me/91${(l.customerMobile || '').replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" /> WhatsApp
                      </a>
                      <Link
                        href="/leads"
                        className="font-bold text-teal-700 hover:text-teal-800"
                      >
                        CRM
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BALANCED 2-COLUMN COMMAND CENTER (7 COLS / 5 COLS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN: Financial Velocity + CRM Enquiries + Quotations (7/12) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Card A: Financial Velocity & Trend Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-teal-600" />
                      <span>{analyticsTab === 'trends' ? 'Revenue vs. Verified Cash Flow' : 'Lead-to-Booking Funnel'}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {analyticsTab === 'trends'
                        ? 'Contracted commitments plotted against bank verified receipts'
                        : 'Conversion velocity from initial inquiry to confirmed departure'}
                    </p>
                  </div>

                  <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 self-start sm:self-auto gap-1">
                    <button
                      type="button"
                      onClick={() => setAnalyticsTab('trends')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        analyticsTab === 'trends'
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Revenue Trend</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnalyticsTab('funnel')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        analyticsTab === 'funnel'
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Funnel</span>
                    </button>
                  </div>
                </div>

                {/* View Content */}
                {analyticsTab === 'trends' ? (
                  <FinancialTrendsChart
                    points={trends?.points || []}
                    interval={trends?.interval || 'day'}
                    loading={analyticsLoading}
                  />
                ) : (
                  <LeadConversionFunnel
                    funnel={
                      summary?.funnel || {
                        inquiries: 0,
                        proposalsIssued: 0,
                        customerAccepted: 0,
                        confirmedBookings: 0,
                        conversionRateLeadToQuote: 0,
                        conversionRateQuoteToAccept: 0,
                        conversionRateAcceptToConfirm: 0,
                        overallWinRate: 0,
                      }
                    }
                    loading={analyticsLoading}
                  />
                )}
              </div>

              {/* Card B: Recent Customer Enquiries (CRM Pipeline) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex justify-between items-center pb-3.5 mb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-600" />
                      <span>Recent Customer Enquiries</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Latest travel inquiries logged by sales agents & travelers.</p>
                  </div>
                  <Link
                    href="/leads"
                    className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 px-3 py-1 rounded-lg bg-teal-50 border border-teal-200"
                  >
                    <span>All Leads ({summary?.totalLeadsCount || 0})</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {inventoryLoading ? (
                  <div className="space-y-2.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : recentLeads.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs italic">
                    No leads recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recentLeads.map((l) => {
                      const statusCfg = LEAD_STATUS_CONFIG[l.status] || {
                        label: l.status,
                        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                        dotClass: 'bg-slate-400',
                      };
                      const initials = getInitials(l.customerName);

                      return (
                        <div
                          key={l.id}
                          className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-teal-300 hover:shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Initials Avatar */}
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #0f766e, #0d9488)',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>

                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                  {l.customerName || 'Customer'}
                                </span>
                                <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800">
                                  {l.leadNumber}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                  <MapPin className="w-2.5 h-2.5 text-teal-600 flex-shrink-0" />
                                  <span>{cleanDestinationName(l.destinationName)}</span>
                                </span>
                                <span className="text-slate-300">•</span>
                                <span>{l.durationNights}N / {l.durationNights ? l.durationNights + 1 : 1}D</span>
                                <span className="text-slate-300">•</span>
                                <span>{l.numberOfAdults} Adults</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${statusCfg.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass} flex-shrink-0`} />
                              <span>{statusCfg.label}</span>
                            </span>

                            {l.customerMobile && (
                              <a
                                href={`https://wa.me/91${l.customerMobile.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 transition-colors"
                                title="WhatsApp Client"
                              >
                                <MessageCircle size={13} />
                              </a>
                            )}

                            <Link
                              href="/leads"
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs hover:border-teal-400 transition-all flex items-center gap-1"
                            >
                              <span>CRM</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card C: Recent Tour Quotations */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex justify-between items-center pb-3.5 mb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                      <span>Recent Tour Proposals</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Commercial custom itineraries & verified pricing.</p>
                  </div>
                  <Link
                    href="/quotations"
                    className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200"
                  >
                    <span>All Quotes</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {inventoryLoading ? (
                  <div className="space-y-2.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : recentQuotes.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs italic">
                    No quotations generated yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recentQuotes.map((q) => {
                      const statusCfg = QUOTATION_STATUS_CONFIG[q.status] || {
                        label: q.status,
                        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                        dotClass: 'bg-slate-400',
                      };
                      const price = q.pricingSummary?.finalSellingPrice || (q as any).totalPrice || 0;
                      const initials = getInitials(q.customerName || (q as any).lead?.customerName);

                      return (
                        <div
                          key={q.id}
                          className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Avatar */}
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>

                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                  {q.customerName || (q as any).lead?.customerName || 'Client Proposal'}
                                </span>
                                <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800">
                                  {q.quoteNumber || (q as any).quotationNumber}
                                </span>
                                {price > 0 && (
                                  <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {formatCurrency(price)}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                  <MapPin className="w-2.5 h-2.5 text-blue-600 flex-shrink-0" />
                                  <span>{cleanDestinationName(q.destinationName || (q as any).destination?.name)}</span>
                                </span>
                                <span className="text-slate-300">•</span>
                                <span>{q.durationNights || 5}N Itinerary</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${statusCfg.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass} flex-shrink-0`} />
                              <span>{statusCfg.label}</span>
                            </span>

                            <Link
                              href="/quotations"
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs hover:border-blue-400 transition-all flex items-center gap-1"
                            >
                              <span>View</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: Operational Health + Destinations + Catalogs (5/12) */}
            <div className="lg:col-span-5 space-y-6">

              {/* Card 1: Booking Status Distribution */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Booking Status Stages</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Current active bookings distribution.</p>
                  </div>
                  <Link href="/bookings" className="text-xs font-bold text-teal-700 hover:text-teal-800 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200">
                    All ({summary?.bookingMetrics.total || 0})
                  </Link>
                </div>
                <BookingDistributionDonut
                  metrics={
                    summary?.bookingMetrics || {
                      quoteAccepted: 0,
                      pendingConfirmation: 0,
                      confirmed: 0,
                      completed: 0,
                      cancelled: 0,
                      total: 0,
                    }
                  }
                  loading={analyticsLoading}
                />
              </div>

              {/* Card 2: Top Destinations by Booking Volume */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Top Destinations</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Ranked by contracted booking volume.</p>
                  </div>
                  <Link href="/destinations" className="text-xs font-bold text-teal-700 hover:text-teal-800 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200">
                    Manage Places
                  </Link>
                </div>
                <TopDestinationsCard
                  destinations={topDestinations}
                  loading={analyticsLoading}
                />
              </div>

              {/* Card 3: Agency Master Inventory Quick Access */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-teal-600" />
                      <span>Master Catalogs</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Hotels, transport fleet, packages & tax settings.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDashboardTab('inventory')}
                    className="text-xs font-bold text-teal-700 hover:text-teal-800 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200"
                  >
                    View All (6)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {inventoryGrid.map((inv) => {
                    const Icon = inv.icon;
                    return (
                      <Link
                        key={inv.title}
                        href={inv.href}
                        className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-teal-400 hover:shadow-2xs transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                            <Icon size={15} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate group-hover:text-teal-700">
                              {inv.title}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {inv.desc.split('&')[0]}
                            </div>
                          </div>
                        </div>
                        <span className="font-black text-slate-900 text-sm font-mono ml-1">
                          {inv.count}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: FINANCIAL ANALYTICS & DEEP BI
          ========================================================================= */}
      {dashboardTab === 'analytics' && (
        <div className="space-y-6">
          {/* Date Range Selector Toolbar */}
          <DateRangeSelector
            selectedRange={selectedRange}
            selectedDateBasis={selectedDateBasis}
            resolvedWindowText={resolvedWindowText}
            onChange={handleFilterChange}
            loading={analyticsLoading}
          />

          {/* Analytics Error Notification */}
          {analyticsError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>{analyticsError}</span>
            </div>
          )}

          {/* Side-by-Side Deep Analysis Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (7/12): Financial Trends & Conversion Funnel */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {analyticsTab === 'trends' ? 'Revenue vs. Verified Cash Flow' : 'Lead-to-Booking Conversion Funnel'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {analyticsTab === 'trends'
                        ? 'Contracted commitments plotted against verified bank receipts.'
                        : 'End-to-end client journey from inquiry to confirmed departure.'}
                    </p>
                  </div>

                  <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 self-start sm:self-auto gap-1">
                    <button
                      type="button"
                      onClick={() => setAnalyticsTab('trends')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        analyticsTab === 'trends'
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Revenue Flow</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnalyticsTab('funnel')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        analyticsTab === 'funnel'
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Funnel Velocity</span>
                    </button>
                  </div>
                </div>

                {/* View 1: Financial Trends Chart */}
                {analyticsTab === 'trends' && (
                  <FinancialTrendsChart
                    points={trends?.points || []}
                    interval={trends?.interval || 'day'}
                    loading={analyticsLoading}
                  />
                )}

                {/* View 2: Lead Conversion Funnel */}
                {analyticsTab === 'funnel' && (
                  <LeadConversionFunnel
                    funnel={
                      summary?.funnel || {
                        inquiries: 0,
                        proposalsIssued: 0,
                        customerAccepted: 0,
                        confirmedBookings: 0,
                        conversionRateLeadToQuote: 0,
                        conversionRateQuoteToAccept: 0,
                        conversionRateAcceptToConfirm: 0,
                        overallWinRate: 0,
                      }
                    }
                    loading={analyticsLoading}
                  />
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-700">Safe Paise Verified Ledger</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500">5% GST Tour SAC 998555 Compliant</span>
                </div>
                <div className="flex items-center gap-3 font-semibold text-teal-700">
                  <Link href="/bookings" className="hover:underline flex items-center gap-1">
                    <span>Tour Ledger</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column (5/12): Booking Status Distribution & Top Destinations */}
            <div className="lg:col-span-5 space-y-6">
              {/* Chart 3: Booking Status Distribution */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Booking Status Breakdown</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Distribution across operational stages.</p>
                  </div>
                  <Link href="/bookings" className="text-xs font-bold text-teal-700 hover:text-teal-800 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200">
                    All ({summary?.bookingMetrics.total || 0})
                  </Link>
                </div>
                <BookingDistributionDonut
                  metrics={
                    summary?.bookingMetrics || {
                      quoteAccepted: 0,
                      pendingConfirmation: 0,
                      confirmed: 0,
                      completed: 0,
                      cancelled: 0,
                      total: 0,
                    }
                  }
                  loading={analyticsLoading}
                />
              </div>

              {/* Chart 4: Top Destinations by Booking Volume */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Top Destinations</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Ranked by contracted booking volume.</p>
                  </div>
                  <Link href="/destinations" className="text-xs font-bold text-teal-700 hover:text-teal-800 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200">
                    Manage Places
                  </Link>
                </div>
                <TopDestinationsCard
                  destinations={topDestinations}
                  loading={analyticsLoading}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: MASTER CATALOGS & INVENTORY
          ========================================================================= */}
      {dashboardTab === 'inventory' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>Travel Inventory & Master Catalogs</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">Contracted properties, rates & fleet</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventoryLoading ? (
              <>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs"
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    <div className="h-10 w-10 bg-slate-100 rounded-xl mb-1 animate-pulse" />
                    <div className="h-8 w-12 bg-slate-100 rounded-md animate-pulse" />
                    <div className="h-4 w-24 bg-slate-100 rounded-md animate-pulse" />
                  </div>
                ))}
              </>
            ) : (
              inventoryGrid.map((inv) => {
                const Icon = inv.icon;
                return (
                  <Link
                    key={inv.title}
                    href={inv.href}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-teal-400 transition-all block group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 12,
                          background: '#f0fdfa',
                          border: '1px solid #ccfbf1',
                          color: '#0f766e',
                        }}
                      >
                        <Icon size={20} />
                      </div>
                      <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                        {inv.badge}
                      </span>
                    </div>

                    <div className="text-2xl font-black text-slate-900 tracking-tight font-mono mb-1">
                      {inv.count}
                    </div>

                    <div className="font-bold text-sm text-slate-800 group-hover:text-teal-700 transition-colors">
                      {inv.title}
                    </div>

                    <div className="text-xs text-slate-500 mt-0.5">
                      {inv.desc}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-700">
                      <span>Manage Catalog</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}
