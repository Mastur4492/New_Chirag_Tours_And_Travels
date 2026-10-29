'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { FinancialTrendPointDto } from '@chirag/types';
import { formatCurrency } from '@/lib/labels';

interface Props {
  points: FinancialTrendPointDto[];
  interval: string;
  loading?: boolean;
}

/**
 * Generates a smooth Catmull-Rom cubic Bezier spline path through data coordinates.
 * Eliminates jagged saw-tooth edges and unnatural zero-drops on wide displays.
 */
function getSmoothSplinePath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  if (pts.length === 2) {
    const cp1x = pts[0].x + (pts[1].x - pts[0].x) * 0.45;
    const cp2x = pts[0].x + (pts[1].x - pts[0].x) * 0.55;
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} C ${cp1x.toFixed(1)} ${pts[0].y.toFixed(1)}, ${cp2x.toFixed(1)} ${pts[1].y.toFixed(1)}, ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }

  let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

export function FinancialTrendsChart({ points, interval, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Dynamically observe container width for 100% distortion-free SVG rendering
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerWidth(Math.max(380, containerRef.current.clientWidth));
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-72 bg-slate-100/70 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-xs text-slate-400 font-medium">Loading financial trends...</span>
      </div>
    );
  }

  if (!points || points.length === 0) {
    return (
      <div className="w-full h-72 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-slate-50/50">
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

  // Responsive Canvas Coordinates (Proportional to actual physical screen width)
  const svgWidth = containerWidth;
  const svgHeight = 280;
  const paddingLeft = 58;
  const paddingRight = 28;
  const paddingTop = 26;
  const paddingBottom = 48;

  const chartWidth = Math.max(100, svgWidth - paddingLeft - paddingRight);
  const chartHeight = Math.max(50, svgHeight - paddingTop - paddingBottom);
  const groundY = paddingTop + chartHeight;

  // Max value calculation with round ceiling
  const rawMax = Math.max(
    ...points.map((p) => Math.max(p.contractedBookingValue || 0, p.verifiedCashCollected || 0)),
    10000
  );
  // Round up to clean visual ceiling
  const maxVal = Math.ceil(rawMax * 1.08);

  const getX = (index: number) => {
    if (points.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (points.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(0, val);
    return paddingTop + chartHeight - (clamped / maxVal) * chartHeight;
  };

  // Pre-calculate coordinate points for curves
  const contractedPts = points.map((p, i) => ({
    x: getX(i),
    y: getY(p.contractedBookingValue || 0),
  }));

  const verifiedPts = points.map((p, i) => ({
    x: getX(i),
    y: getY(p.verifiedCashCollected || 0),
  }));

  // Smooth spline curve paths
  const contractedCurvePath = getSmoothSplinePath(contractedPts);
  const verifiedCurvePath = getSmoothSplinePath(verifiedPts);

  // Closed area gradient fills
  const firstX = getX(0);
  const lastX = getX(points.length - 1);
  const contractedAreaPath = `${contractedCurvePath} L ${lastX.toFixed(1)} ${groundY} L ${firstX.toFixed(1)} ${groundY} Z`;
  const verifiedAreaPath = `${verifiedCurvePath} L ${lastX.toFixed(1)} ${groundY} L ${firstX.toFixed(1)} ${groundY} Z`;

  // Dynamic X-axis label decimation to prevent overlapping dates
  const maxLabels = svgWidth > 1100 ? 9 : svgWidth > 700 ? 6 : 4;
  const labelStep = Math.max(1, Math.ceil(points.length / maxLabels));

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
            <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">(Total committed pipeline)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 shadow-xs flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
            <span className="font-bold text-slate-800">Verified Cash Inflow</span>
            <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">(Bank receipts verified)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interval: {interval}</span>
          </span>
        </div>
      </div>

      {/* Responsive SVG Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full h-[270px] sm:h-[280px]"
        style={{ minHeight: 260 }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          height="100%"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Smooth luxury gradient fills */}
            <linearGradient id="gradContractedNew" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#0d9488" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="gradVerifiedNew" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>

            {/* Subtle drop shadow filter for line clarity */}
            <filter id="chartGlowNew" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0d9488" floodOpacity="0.16" />
            </filter>
          </defs>

          {/* Background horizontal gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingTop + chartHeight * (1 - pct);
            const val = Math.round(maxVal * pct);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                  strokeDasharray={pct > 0 && pct < 1 ? '4 4' : undefined}
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                  className="font-mono font-semibold"
                >
                  {val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
                </text>
              </g>
            );
          })}

          {/* Distinct X-axis Baseline */}
          <line
            x1={paddingLeft}
            y1={groundY}
            x2={svgWidth - paddingRight}
            y2={groundY}
            stroke="#e2e8f0"
            strokeWidth={1.5}
          />

          {/* Area Gradients under Smooth Spline Curves */}
          <path d={contractedAreaPath} fill="url(#gradContractedNew)" />
          <path d={verifiedAreaPath} fill="url(#gradVerifiedNew)" />

          {/* Smooth Curve: Contracted Booking Value */}
          <path
            d={contractedCurvePath}
            fill="none"
            stroke="#0d9488"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#chartGlowNew)"
          />

          {/* Smooth Curve: Verified Cash Collected */}
          <path
            d={verifiedCurvePath}
            fill="none"
            stroke="#10b981"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 2.5"
          />

          {/* Interactive Dots, Date Ticks, and Hover Tooltips */}
          {points.map((p, i) => {
            const cx = getX(i);
            const cyContracted = getY(p.contractedBookingValue || 0);
            const cyVerified = getY(p.verifiedCashCollected || 0);
            const isHovered = hoveredIdx === i;

            // Show label if start, end, or matched step
            const isLabelVisible =
              i === 0 ||
              i === points.length - 1 ||
              (i % labelStep === 0 && i < points.length - Math.ceil(labelStep * 0.6));

            return (
              <g key={i}>
                {/* Invisible hover capture column */}
                <rect
                  x={cx - Math.max(16, chartWidth / points.length / 2)}
                  y={paddingTop}
                  width={Math.max(32, chartWidth / points.length)}
                  height={chartHeight + 30}
                  fill="transparent"
                  pointerEvents="all"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />

                {/* Vertical hover crosshair guide */}
                {isHovered && (
                  <line
                    x1={cx}
                    y1={paddingTop}
                    x2={cx}
                    y2={groundY}
                    stroke="#94a3b8"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                )}

                {/* Contracted point circle (Always true 1:1 circular diameter) */}
                <circle
                  cx={cx}
                  cy={cyContracted}
                  r={isHovered ? 6 : 4}
                  fill="#0d9488"
                  stroke="#ffffff"
                  strokeWidth={2}
                  style={{ transition: 'r 0.15s ease' }}
                />

                {/* Verified cash point circle */}
                <circle
                  cx={cx}
                  cy={cyVerified}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth={2}
                  style={{ transition: 'r 0.15s ease' }}
                />

                {/* X-axis Date Label (Positioned clearly with 24px vertical clearance) */}
                {isLabelVisible && (
                  <text
                    x={cx}
                    y={groundY + 24}
                    textAnchor="middle"
                    fontSize="10.5"
                    fill={isHovered ? '#0f172a' : '#64748b'}
                    fontWeight={isHovered ? 'bold' : '500'}
                  >
                    {p.periodLabel}
                  </text>
                )}

                {/* Interactive Tooltip Box on Hover */}
                {isHovered && (
                  <g style={{ pointerEvents: 'none' }}>
                    {(() => {
                      const tipW = 140;
                      const tipH = 46;
                      const tipX = Math.min(
                        Math.max(cx - tipW / 2, paddingLeft),
                        svgWidth - paddingRight - tipW
                      );
                      const topY = Math.min(cyContracted, cyVerified);
                      const tipY = topY - tipH - 12 < 10 ? topY + 14 : topY - tipH - 12;

                      return (
                        <>
                          <rect
                            x={tipX}
                            y={tipY}
                            width={tipW}
                            height={tipH}
                            rx={8}
                            fill="#0f172a"
                            fillOpacity={0.96}
                            stroke="#334155"
                            strokeWidth={1}
                            filter="drop-shadow(0 4px 12px rgba(0,0,0,0.25))"
                          />
                          <text
                            x={tipX + tipW / 2}
                            y={tipY + 14}
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight="bold"
                            fill="#f8fafc"
                          >
                            {p.periodLabel}
                          </text>
                          <text
                            x={tipX + tipW / 2}
                            y={tipY + 27}
                            textAnchor="middle"
                            fontSize="8.5"
                            fontWeight="bold"
                            fill="#2dd4bf"
                          >
                            Booked: {formatCurrency(p.contractedBookingValue)}
                          </text>
                          <text
                            x={tipX + tipW / 2}
                            y={tipY + 39}
                            textAnchor="middle"
                            fontSize="8.5"
                            fontWeight="bold"
                            fill="#34d399"
                          >
                            Cash: {formatCurrency(p.verifiedCashCollected)}
                          </text>
                        </>
                      );
                    })()}
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
