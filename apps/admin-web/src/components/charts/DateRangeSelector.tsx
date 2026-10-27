'use client';

import React from 'react';
import { AnalyticsDateBasis, AnalyticsDateRangeOption } from '@chirag/types';
import { Calendar, Filter } from 'lucide-react';

interface Props {
  selectedRange: AnalyticsDateRangeOption;
  selectedDateBasis: AnalyticsDateBasis;
  resolvedWindowText?: string;
  onChange: (range: AnalyticsDateRangeOption, dateBasis: AnalyticsDateBasis) => void;
  loading?: boolean;
}

export function DateRangeSelector({
  selectedRange,
  selectedDateBasis,
  resolvedWindowText,
  onChange,
  loading,
}: Props) {
  const rangeOptions: Array<{ id: AnalyticsDateRangeOption; label: string }> = [
    { id: '30d', label: 'Last 30 Days' },
    { id: '90d', label: 'Last 90 Days' },
    { id: 'ytd', label: 'Current FY (2026-27)' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14,
        padding: '12px 18px',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Range Pills */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 700, color: '#334155', marginRight: 4 }}>
          <Calendar style={{ width: 15, height: 15, color: '#0f766e' }} />
          <span>Timeline:</span>
        </span>
        {rangeOptions.map((opt) => {
          const isActive = selectedRange === opt.id;
          return (
            <button
              key={opt.id}
              disabled={loading}
              onClick={() => onChange(opt.id, selectedDateBasis)}
              style={{
                padding: '6px 14px',
                borderRadius: 10,
                fontSize: '12px',
                fontWeight: isActive ? 800 : 600,
                border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: isActive ? '#0f172a' : '#f8fafc',
                color: isActive ? '#ffffff' : '#475569',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: isActive ? '0 2px 8px rgba(15, 23, 42, 0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Date Basis & Active Window Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {resolvedWindowText && (
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#0f766e',
              background: '#f0fdfa',
              padding: '5px 10px',
              borderRadius: 8,
              border: '1px solid #ccfbf1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0d9488' }} />
            {resolvedWindowText}
          </span>
        )}

        {/* Date Basis Toggle */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: '#f1f5f9',
            padding: '3px 4px',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
          }}
        >
          <button
            disabled={loading}
            onClick={() => onChange(selectedRange, 'bookingDate')}
            title="Aggregates by Booking Creation Date"
            style={{
              padding: '5px 12px',
              borderRadius: 8,
              fontSize: '11.5px',
              fontWeight: selectedDateBasis === 'bookingDate' ? 800 : 600,
              border: 'none',
              background: selectedDateBasis === 'bookingDate' ? '#ffffff' : 'transparent',
              color: selectedDateBasis === 'bookingDate' ? '#0f172a' : '#64748b',
              boxShadow: selectedDateBasis === 'bookingDate' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Booking Date
          </button>
          <button
            disabled={loading}
            onClick={() => onChange(selectedRange, 'travelDate')}
            title="Aggregates by Customer Travel Departure Date"
            style={{
              padding: '5px 12px',
              borderRadius: 8,
              fontSize: '11.5px',
              fontWeight: selectedDateBasis === 'travelDate' ? 800 : 600,
              border: 'none',
              background: selectedDateBasis === 'travelDate' ? '#ffffff' : 'transparent',
              color: selectedDateBasis === 'travelDate' ? '#0f172a' : '#64748b',
              boxShadow: selectedDateBasis === 'travelDate' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Departure Date
          </button>
        </div>
      </div>
    </div>
  );
}
