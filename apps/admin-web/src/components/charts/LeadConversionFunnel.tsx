'use client';

import React from 'react';
import Link from 'next/link';
import { FunnelMetricsDto } from '@chirag/types';
import { ArrowRight, TrendingUp } from 'lucide-react';

interface Props {
  funnel: FunnelMetricsDto;
  loading?: boolean;
}

export function LeadConversionFunnel({ funnel, loading }: Props) {
  if (loading) {
    return (
      <div className="w-full h-64 bg-slate-100/70 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-xs text-slate-400 font-medium">Loading conversion funnel...</span>
      </div>
    );
  }

  const stages = [
    {
      name: 'Client Inquiries',
      count: funnel.inquiries,
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
      badge: 'Leads Received',
      subtext: 'Unique inquiries logged',
      conversionNext: funnel.conversionRateLeadToQuote,
      nextLabel: 'quoted',
    },
    {
      name: 'Proposals Issued',
      count: funnel.proposalsIssued,
      color: 'bg-teal-600',
      textColor: 'text-teal-700',
      bgColor: 'bg-teal-50',
      badge: 'Custom Quotes Sent',
      subtext: 'Detailed itineraries sent',
      conversionNext: funnel.conversionRateQuoteToAccept,
      nextLabel: 'accepted',
    },
    {
      name: 'Customer Accepted',
      count: funnel.customerAccepted,
      color: 'bg-indigo-600',
      textColor: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
      badge: 'Accepted Proposals',
      subtext: 'Client approved package',
      conversionNext: funnel.conversionRateAcceptToConfirm,
      nextLabel: 'locked',
    },
    {
      name: 'Confirmed Bookings',
      count: funnel.confirmedBookings,
      color: 'bg-emerald-600',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      badge: 'Tours Booked',
      subtext: 'Officially confirmed',
      conversionNext: null,
      nextLabel: null,
    },
  ];

  const maxVal = Math.max(funnel.inquiries, 1);

  return (
    <div className="space-y-4">
      {/* Funnel Header Summary */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-teal-600" />
          <span className="text-xs font-semibold text-slate-700">Pipeline Performance</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Overall Win Rate:</span>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {funnel.overallWinRate}%
          </span>
        </div>
      </div>

      {/* Funnel Bars */}
      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const widthPct = Math.max(Math.round((stage.count / maxVal) * 100), stage.count > 0 ? 8 : 4);

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{stage.name}</span>
                  <span className="text-[11px] text-slate-400 font-normal">({stage.subtext})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 font-mono text-sm">{stage.count}</span>
                  {stage.conversionNext !== null && (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {stage.conversionNext}% {stage.nextLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Drill-down Footer */}
      <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
        <span>Based on actual CRM leads & quote snapshots</span>
        <Link
          href="/leads"
          className="text-teal-700 font-semibold hover:text-teal-800 flex items-center gap-1 transition-colors"
        >
          View Full CRM Pipeline <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
