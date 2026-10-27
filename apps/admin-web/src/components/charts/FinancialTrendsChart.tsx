'use client';

import React from 'react';
import { FinancialTrendPointDto } from '@chirag/types';
import { formatCurrency } from '@/lib/labels';

interface Props {
  points: FinancialTrendPointDto[];
  interval: string;
  loading?: boolean;
}

export function FinancialTrendsChart({ points, interval, loading }: Props) {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  if (loading) {
    return (
      <div className="w-full h-64 bg-slate-100/70 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-xs text-slate-400 font-medium">Loading financial trends...</span>
      </div>
    );
  }

  if (!points || points.length === 0) {
    return (
      <div className="w-full h-64 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-slate-50/50">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-700">No Financial Records in this Period</p>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Contracted booking revenue and verified cash receipts will plot here chronologically once transactions are confirmed.
        </p>
      </div>
    );
  }

  // Chart dimensions
  const svgWidth = 640;
  const svgHeight = 220;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Max value calculation
  const maxVal = Math.max(
    ...points.map((p) => Math.max(p.contractedBookingValue || 0, p.verifiedCashCollected || 0)),
    10000
  );

  const getX = (index: number) => {
    if (points.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (points.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return paddingTop + chartHeight - (val / maxVal) * chartHeight;
  };

  // Build SVG polyline paths
  const contractedPath = points.map((p, i) => `${getX(i)},${getY(p.contractedBookingValue || 0)}`).join(' ');
  const verifiedPath = points.map((p, i) => `${getX(i)},${getY(p.verifiedCashCollected || 0)}`).join(' ');

  // Build SVG polygon area paths
  const groundY = paddingTop + chartHeight;
  const firstX = getX(0);
  const lastX = getX(points.length - 1);
  const contractedArea = `${firstX},${groundY} ${contractedPath} ${lastX},${groundY}`;
  const verifiedArea = `${firstX},${groundY} ${verifiedPath} ${lastX},${groundY}`;

  return (
    <div className="w-full">
      {/* Legend with Interactive Visual Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-md bg-teal-600 shadow-xs flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
            <span className="font-bold text-slate-800">Contracted Tour Bookings</span>
            <span className="text-slate-400 text-[11px] font-medium">(Total committed pipeline)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 shadow-xs flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
            <span className="font-bold text-slate-800">Verified Cash Inflow</span>
            <span className="text-slate-400 text-[11px] font-medium">(Bank receipts verified)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interval: {interval}</span>
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden" style={{ height: 210 }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Soft, modern luxury gradients */}
            <linearGradient id="gradContracted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.12" />
              <stop offset="60%" stopColor="#0d9488" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="gradVerified" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.10" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>

            {/* Subtle glow filter */}
            <filter id="chartGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0d9488" floodOpacity="0.18" />
            </filter>
          </defs>

          {/* Background gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingTop + chartHeight * (1 - pct);
            const val = maxVal * pct;
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                  strokeDasharray={pct > 0 && pct < 1 ? "4 4" : undefined}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="9.5"
                  fill="#94a3b8"
                  className="font-mono font-semibold"
                >
                  {val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
                </text>
              </g>
            );
          })}

          {/* Area Polygons under curves */}
          <polygon
            points={contractedArea}
            fill="url(#gradContracted)"
          />
          <polygon
            points={verifiedArea}
            fill="url(#gradVerified)"
          />

          {/* Polyline: Contracted Booking Value */}
          <polyline
            fill="none"
            stroke="#0d9488"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#chartGlow)"
            points={contractedPath}
          />

          {/* Polyline: Verified Cash Collected */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 2.5"
            points={verifiedPath}
          />

          {/* Dots and Tooltips */}
          {points.map((p, i) => {
            const cx = getX(i);
            const cyContracted = getY(p.contractedBookingValue || 0);
            const cyVerified = getY(p.verifiedCashCollected || 0);
            const isHovered = hoveredIdx === i;

            return (
              <g key={i}>
                {/* Invisible hover capture strip */}
                <rect
                  x={cx - 30}
                  y={paddingTop}
                  width={60}
                  height={chartHeight + 20}
                  fill="transparent"
                  pointerEvents="all"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />

                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={paddingTop}
                    x2={cx}
                    y2={paddingTop + chartHeight}
                    stroke="#94a3b8"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                )}

                {/* Contracted point */}
                <circle
                  cx={cx}
                  cy={cyContracted}
                  r={isHovered ? 6 : 4}
                  fill="#0d9488"
                  stroke="#ffffff"
                  strokeWidth={2}
                  style={{ transition: 'all 0.15s ease' }}
                />

                {/* Verified point */}
                <circle
                  cx={cx}
                  cy={cyVerified}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth={2}
                  style={{ transition: 'all 0.15s ease' }}
                />

                {/* X-axis Label */}
                <text
                  x={cx}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill={isHovered ? '#0f172a' : '#64748b'}
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {p.periodLabel}
                </text>

                {/* Sleek, Compact Hover Tooltip Box (Only visible on hover) */}
                {isHovered && (
                  <g style={{ pointerEvents: 'none' }}>
                    <rect
                      x={Math.min(Math.max(cx - 55, 6), svgWidth - 116)}
                      y={Math.max(Math.min(cyContracted, cyVerified) - 44, 6)}
                      width={110}
                      height={36}
                      rx={6}
                      fill="#0f172a"
                      fillOpacity={0.94}
                      stroke="#334155"
                      strokeWidth={1}
                    />
                    <text
                      x={Math.min(Math.max(cx - 55, 6), svgWidth - 116) + 55}
                      y={Math.max(Math.min(cyContracted, cyVerified) - 44, 6) + 12}
                      textAnchor="middle"
                      fontSize="8.5"
                      fontWeight="bold"
                      fill="#ffffff"
                    >
                      {p.periodLabel}
                    </text>
                    <text
                      x={Math.min(Math.max(cx - 55, 6), svgWidth - 116) + 55}
                      y={Math.max(Math.min(cyContracted, cyVerified) - 44, 6) + 22}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="bold"
                      fill="#2dd4bf"
                    >
                      Booked: {formatCurrency(p.contractedBookingValue)}
                    </text>
                    <text
                      x={Math.min(Math.max(cx - 55, 6), svgWidth - 116) + 55}
                      y={Math.max(Math.min(cyContracted, cyVerified) - 44, 6) + 31}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="bold"
                      fill="#34d399"
                    >
                      Cash: {formatCurrency(p.verifiedCashCollected)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
