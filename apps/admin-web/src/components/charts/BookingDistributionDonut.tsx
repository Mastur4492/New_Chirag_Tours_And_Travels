'use client';

import React from 'react';
import Link from 'next/link';

interface Props {
  metrics: {
    quoteAccepted: number;
    pendingConfirmation: number;
    confirmed: number;
    operationalPreparation?: number;
    inTrip?: number;
    completed: number;
    cancelled: number;
    total: number;
  };
  loading?: boolean;
}

export function BookingDistributionDonut({ metrics, loading }: Props) {
  if (loading) {
    return (
      <div className="w-full h-64 bg-slate-100/70 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-xs text-slate-400 font-medium">Loading status distribution...</span>
      </div>
    );
  }

  const items = [
    { label: 'Confirmed', count: metrics.confirmed || 0, color: '#10b981', statusKey: 'CONFIRMED' },
    { label: 'Operational Prep', count: metrics.operationalPreparation || 0, color: '#8b5cf6', statusKey: 'OPERATIONAL_PREPARATION' },
    { label: 'In Trip', count: metrics.inTrip || 0, color: '#06b6d4', statusKey: 'IN_TRIP' },
    { label: 'Completed', count: metrics.completed || 0, color: '#64748b', statusKey: 'COMPLETED' },
    { label: 'Quote Accepted', count: metrics.quoteAccepted || 0, color: '#3b82f6', statusKey: 'QUOTE_ACCEPTED' },
    { label: 'Pending Confirm', count: metrics.pendingConfirmation || 0, color: '#f59e0b', statusKey: 'PENDING_CONFIRMATION' },
    { label: 'Cancelled', count: metrics.cancelled || 0, color: '#f43f5e', statusKey: 'CANCELLED' },
  ].filter((item) => item.count > 0 || metrics.total === 0);

  const total = metrics.total || 0;

  if (total === 0) {
    return (
      <div className="w-full h-64 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-slate-50/50">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-700">No Bookings in this Window</p>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          When customers approve tour quotations, active bookings appear here with status tracking.
        </p>
      </div>
    );
  }

  // Calculate SVG Donut Arcs
  const radius = 64;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
      {/* SVG Donut */}
      <div className="relative w-44 h-44 flex-shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90 transform">
          {/* Base track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {items.map((item, idx) => {
            if (item.count === 0) return null;
            const percentage = item.count / total;
            const strokeDasharray = `${percentage * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedAngle * circumference;
            accumulatedAngle += percentage;

            return (
              <circle
                key={idx}
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500 hover:opacity-80"
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-extrabold text-slate-900 leading-none">{total}</span>
          <span className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">Bookings</span>
        </div>
      </div>

      {/* Legend & Drill-down Links */}
      <div className="flex-1 w-full space-y-2">
        {items.map((item, idx) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <Link
              key={idx}
              href={`/bookings?status=${item.statusKey}`}
              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors group text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-slate-700 group-hover:text-teal-700 transition-colors">
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900">{item.count}</span>
                <span className="text-[11px] text-slate-400 font-mono w-9 text-right">{pct}%</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
