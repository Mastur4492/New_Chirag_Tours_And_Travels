'use client';

import React from 'react';
import Link from 'next/link';
import { TopDestinationAnalyticsDto } from '@chirag/types';
import { formatCurrency } from '@/lib/labels';
import { MapPin, ArrowRight } from 'lucide-react';

interface Props {
  destinations: TopDestinationAnalyticsDto[];
  loading?: boolean;
}

export function TopDestinationsCard({ destinations, loading }: Props) {
  if (loading) {
    return (
      <div className="w-full h-64 bg-slate-100/70 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-xs text-slate-400 font-medium">Loading destination rankings...</span>
      </div>
    );
  }

  if (!destinations || destinations.length === 0) {
    return (
      <div className="w-full h-64 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-slate-50/50">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
          <MapPin className="w-5 h-5" />
        </div>
        <p className="text-sm font-semibold text-slate-700">No Destination Bookings Yet</p>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          As bookings are created for tour hubs like Kashmir, Goa, Himachal, or Kerala, volume rankings will populate here.
        </p>
        <Link
          href="/destinations"
          className="mt-3 text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
        >
          View Destination Catalog <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  const maxVal = Math.max(...destinations.map((d) => d.contractedValue || 0), 1);

  return (
    <div className="space-y-3">
      {destinations.slice(0, 5).map((dest, idx) => {
        const pct = Math.max(Math.round((dest.contractedValue / maxVal) * 100), 5);
        const rankColors = [
          { bg: '#fef3c7', border: '#fde68a', text: '#b45309' }, // #1 Gold
          { bg: '#f1f5f9', border: '#e2e8f0', text: '#334155' }, // #2 Silver
          { bg: '#ffedd5', border: '#fed7aa', text: '#c2410c' }, // #3 Bronze
        ];
        const rankStyle = rankColors[idx] || { bg: '#f0fdfa', border: '#ccfbf1', text: '#0f766e' };

        return (
          <div
            key={dest.destinationId || idx}
            className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-teal-300 hover:shadow-xs transition-all"
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2.5">
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    background: rankStyle.bg,
                    border: `1px solid ${rankStyle.border}`,
                    color: rankStyle.text,
                    fontWeight: 800,
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  #{idx + 1}
                </span>
                <div>
                  <span className="font-bold text-slate-900 text-sm">{dest.destinationName}</span>
                  {dest.state && (
                    <span className="text-[11px] text-slate-400 ml-1.5 font-medium">
                      ({dest.state})
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="font-black text-slate-900 font-mono text-sm">
                  {formatCurrency(dest.contractedValue)}
                </span>
                <span className="text-[11px] text-slate-400 block font-medium">
                  {dest.bookingCount} {dest.bookingCount === 1 ? 'booking' : 'bookings'}
                </span>
              </div>
            </div>

            {/* Proportion bar */}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #0d9488 0%, #10b981 100%)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
