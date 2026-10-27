'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  UserCheck,
  FileText,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { leadsApi, bookingsApi, authApi, getAgentUser } from '@/lib/api';

export default function AgentPerformancePage() {
  const [user, setUser] = useState<any>(null);
  const [leadMetrics, setLeadMetrics] = useState<any>(null);
  const [bookingMetrics, setBookingMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        const [userData, leadRes, bookingRes] = await Promise.all([
          authApi.getMe().catch(() => getAgentUser()),
          leadsApi.getMetrics().catch(() => ({ data: null })),
          bookingsApi.getMetrics().catch(() => ({ data: null })),
        ]);

        setUser(userData);
        setLeadMetrics(leadRes?.data || null);
        setBookingMetrics(bookingRes?.data || null);
      } catch (err: any) {
        setError(err?.message || 'Failed to load performance metrics');
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  const agentProfile = user?.agentProfile || {};
  const statusBreakdown = leadMetrics?.statusBreakdown || {};
  const bookingStatusBreakdown = bookingMetrics?.statusBreakdown || {};

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
            Authoritative Analytics
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>•</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Real-Time CRM & Booking Metrics
          </span>
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
          Agent Performance & Sales Conversion
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Aggregated live metrics for {user?.fullName || 'Partner Agent'} ({agentProfile.agencyName || 'Travel Desk'})
        </p>
      </div>

      {error && (
        <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-rose-light)', border: '1px solid var(--accent-rose-border)', color: 'var(--accent-rose-dark)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Contract & Commission Terms Card */}
      <div
        className="card"
        style={{
          padding: '24px',
          marginBottom: 24,
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Sparkles size={18} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Commercial Agreement & Commission Rate
              </h2>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 640 }}>
              Your commission percentage is authoritatively configured by Administration in your partner contract.
              Final realized commissions are reconciled upon verified payment settlement.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                padding: '12px 20px',
                borderRadius: 'var(--radius-lg)',
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Contract Commission Tier
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
                {agentProfile.commissionRatePercent !== undefined ? `${agentProfile.commissionRatePercent}%` : 'Standard B2B'}
              </div>
            </div>

            <div
              style={{
                padding: '12px 20px',
                borderRadius: 'var(--radius-lg)',
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Discount Authorization Cap
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-display)' }}>
                {agentProfile.maxDiscountPercent ?? 5}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Conversion Funnel Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginBottom: 28 }}>
        {/* Metric 1 */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
            Total Inquiries Assigned
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {leadMetrics?.assignedLeadsCount ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Inquiries routed to your travel desk
          </div>
        </div>

        {/* Metric 2 */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
            Quotations Issued
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {leadMetrics?.quotationsIssuedCount ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Formal proposals dispatched to travelers
          </div>
        </div>

        {/* Metric 3 */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
            Quotations Accepted
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-emerald-dark)', fontFamily: 'var(--font-display)' }}>
            {leadMetrics?.quotationsAcceptedCount ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Customer approval secured
          </div>
        </div>

        {/* Metric 4 */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
            Quote Win Rate
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-purple-dark)', fontFamily: 'var(--font-display)' }}>
            {leadMetrics?.quoteConversionRate ? `${leadMetrics.quoteConversionRate}%` : '0%'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Accepted vs Issued ratio
          </div>
        </div>
      </div>

      {/* Lifecycle Breakdown Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
        {/* Leads Funnel Table */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)', marginBottom: 6 }}>
            Lead Pipeline Stage Distribution
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 18 }}>
            Current breakdown of leads assigned to your travel desk
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { key: 'ASSIGNED', label: 'Assigned / Intake', color: '#0284c7', bg: '#f0f9ff' },
              { key: 'CONTACTED', label: 'Contacted Traveler', color: '#2563eb', bg: '#eff6ff' },
              { key: 'QUOTED', label: 'Quote Dispatched', color: '#7c3aed', bg: '#f5f3ff' },
              { key: 'NEGOTIATING', label: 'Negotiating / Revising', color: '#d97706', bg: '#fffbeb' },
              { key: 'CONVERTED', label: 'Converted to Booking', color: '#059669', bg: '#ecfdf5' },
              { key: 'LOST', label: 'Closed / Lost', color: '#e11d48', bg: '#fff1f2' },
            ].map((stage) => {
              const count = statusBreakdown[stage.key] || 0;
              const total = leadMetrics?.assignedLeadsCount || 1;
              const percent = Math.round((count / total) * 100);

              return (
                <div
                  key={stage.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: stage.bg,
                    border: `1px solid ${stage.color}20`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: stage.color }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {stage.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{percent}%</span>
                    <strong style={{ fontSize: '0.95rem', color: stage.color }}>{count}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bookings Status Distribution Table */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)', marginBottom: 6 }}>
            Booking Fulfillment Breakdown
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 18 }}>
            Status of confirmed client trips under your management
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { key: 'QUOTE_ACCEPTED', label: 'Awaiting Advance Payment', color: '#d97706', bg: '#fffbeb' },
              { key: 'CONFIRMED', label: 'Confirmed by Admin', color: '#059669', bg: '#ecfdf5' },
              { key: 'OPERATIONAL_PREPARATION', label: 'Operations & Vouchers', color: '#0284c7', bg: '#f0f9ff' },
              { key: 'IN_TRIP', label: 'Traveler In-Trip', color: '#7c3aed', bg: '#f5f3ff' },
              { key: 'COMPLETED', label: 'Tour Completed', color: '#16a34a', bg: '#f0fdf4' },
              { key: 'CANCELLED', label: 'Cancelled', color: '#94a3b8', bg: '#f8fafc' },
            ].map((stage) => {
              const count = bookingStatusBreakdown[stage.key] || 0;
              return (
                <div
                  key={stage.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: stage.bg,
                    border: `1px solid ${stage.color}20`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: stage.color }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {stage.label}
                    </span>
                  </div>
                  <strong style={{ fontSize: '0.95rem', color: stage.color }}>{count}</strong>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 18,
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}
          >
            <HelpCircle size={16} style={{ flexShrink: 0, color: 'var(--primary)' }} />
            <span>
              All operational metrics are directly aggregated from live database transactions.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
