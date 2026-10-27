'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  PlusCircle,
  UserCheck,
  FileText,
  CalendarCheck,
  TrendingUp,
  Clock,
  PhoneCall,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Percent,
} from 'lucide-react';
import { leadsApi, bookingsApi, authApi, getAgentUser } from '@/lib/api';

export default function AgentDeskDashboard() {
  const [user, setUser] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [bookingMetrics, setBookingMetrics] = useState<any>(null);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        // Load fresh user profile, leads metrics, booking metrics, and active leads
        const [meData, leadMetricsData, bookingMetricsData, leadsData] = await Promise.all([
          authApi.getMe().catch(() => getAgentUser()),
          leadsApi.getMetrics().catch(() => ({ data: null })),
          bookingsApi.getMetrics().catch(() => ({ data: null })),
          leadsApi.list({ limit: 5, status: 'ASSIGNED,CONTACTED,QUOTED,NEGOTIATING' }).catch(() => ({ data: [] })),
        ]);

        setUser(meData);
        setMetrics(leadMetricsData?.data || null);
        setBookingMetrics(bookingMetricsData?.data || null);
        setRecentLeads(leadsData?.data || []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const agentProfile = user?.agentProfile || {};

  return (
    <div>
      {/* ===================== DESK HERO / PROFILE BANNER ===================== */}
      <div
        style={{
          background: 'linear-gradient(135deg, #09111e 0%, #0d1e34 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px 32px',
          color: '#ffffff',
          marginBottom: 28,
          boxShadow: 'var(--shadow-md)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 12, background: '#ffffff', padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.35)', flexShrink: 0 }}>
                <img src="/branding/nc-logo.jpg" alt="New Chirag Tours & Travels" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span
                    style={{
                      background: 'rgba(20, 184, 166, 0.2)',
                      color: '#2dd4bf',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid rgba(45, 212, 191, 0.3)',
                    }}
                  >
                    Official Partner Travel Desk
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>•</span>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    {agentProfile.city ? `${agentProfile.city} Station` : 'Central Agency Desk'}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>New Chirag Tours & Travels • Ahmedabad</div>
              </div>
            </div>

            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                fontFamily: 'var(--font-display)',
                marginBottom: 6,
              }}
            >
              Welcome back, {user?.fullName || 'Travel Partner'}
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', maxWidth: 600 }}>
              {agentProfile.agencyName ? `${agentProfile.agencyName} — ` : ''}
              Service walk-in travelers, dispatch instant quotations, and manage confirmed departures.
            </p>

            {/* Authoritative Commission & Policy Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 18 }}>
              {agentProfile.commissionRatePercent !== undefined && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    fontSize: '0.82rem',
                  }}
                >
                  <Percent size={14} style={{ color: '#10b981' }} />
                  <span style={{ color: '#94a3b8' }}>Commission Tier:</span>
                  <strong style={{ color: '#ffffff' }}>{agentProfile.commissionRatePercent}% Standard</strong>
                </div>
              )}

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  fontSize: '0.82rem',
                }}
              >
                <ShieldCheck size={14} style={{ color: '#2dd4bf' }} />
                <span style={{ color: '#94a3b8' }}>Max Allowed Discount:</span>
                <strong style={{ color: '#2dd4bf' }}>{agentProfile.maxDiscountPercent ?? 5}%</strong>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  fontSize: '0.82rem',
                }}
              >
                <ShieldAlert size={14} style={{ color: agentProfile.canApproveFinalPrice ? '#4ade80' : '#fbbf24' }} />
                <span style={{ color: '#94a3b8' }}>Price Override:</span>
                <strong style={{ color: agentProfile.canApproveFinalPrice ? '#4ade80' : '#fbbf24' }}>
                  {agentProfile.canApproveFinalPrice ? 'Self-Approving' : 'Requires Admin Sign-Off'}
                </strong>
              </div>
            </div>
          </div>

          {/* Quick Quote Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link
              href="/quotations/new"
              prefetch={false}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '13px 24px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(20, 184, 166, 0.4)',
                transition: 'var(--transition-fast)',
              }}
            >
              <PlusCircle size={20} />
              <span>+ Build Instant Quote</span>
            </Link>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
              Authoritative server-side pricing
            </div>
          </div>
        </div>
      </div>

      {/* ===================== LIVE METRICS ROW ===================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {/* Metric 1: Assigned Leads */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Assigned Leads</span>
            <div style={{ padding: 8, borderRadius: 'var(--radius-md)', background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <UserCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {metrics?.assignedLeadsCount ?? 0}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>Active CRM Inquiries</span>
          </div>
        </div>

        {/* Metric 2: Follow-ups Due */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Follow-ups Due</span>
            <div style={{ padding: 8, borderRadius: 'var(--radius-md)', background: 'var(--accent-amber-light)', color: 'var(--accent-amber)' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: (metrics?.followUpsDueCount || 0) > 0 ? 'var(--accent-amber-dark)' : 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {(metrics?.followUpsDueCount || 0) + (metrics?.followUpsOverdueCount || 0)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.78rem' }}>
            {(metrics?.followUpsOverdueCount || 0) > 0 ? (
              <span style={{ color: 'var(--accent-rose-dark)', fontWeight: 700 }}>
                {metrics.followUpsOverdueCount} Overdue
              </span>
            ) : (
              <span style={{ color: 'var(--accent-emerald-dark)', fontWeight: 600 }}>All on schedule</span>
            )}
          </div>
        </div>

        {/* Metric 3: Quotes Created / Issued */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Quotes Issued</span>
            <div style={{ padding: 8, borderRadius: 'var(--radius-md)', background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>
              <FileText size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {metrics?.quotationsIssuedCount ?? 0}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>{metrics?.quotationsAcceptedCount ?? 0} Accepted by Travelers</span>
          </div>
        </div>

        {/* Metric 4: Bookings Assigned */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>My Bookings</span>
            <div style={{ padding: 8, borderRadius: 'var(--radius-md)', background: 'var(--accent-emerald-light)', color: 'var(--accent-emerald)' }}>
              <CalendarCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {bookingMetrics?.totalBookings ?? 0}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>Confirmed & Active</span>
          </div>
        </div>

        {/* Metric 5: Conversion Win Rate */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Quote Win Rate</span>
            <div style={{ padding: 8, borderRadius: 'var(--radius-md)', background: 'var(--accent-purple-light)', color: 'var(--accent-purple)' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {metrics?.quoteConversionRate ? `${metrics.quoteConversionRate}%` : '0%'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>Lead Conversion: {metrics?.leadConversionRate ? `${metrics.leadConversionRate}%` : '0%'}</span>
          </div>
        </div>
      </div>

      {/* ===================== ACTIVE WORKFLOW PANELS ===================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        {/* Panel 1: Recent Assigned Leads */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
                Active Leads Requiring Action
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Travelers assigned to your desk awaiting proposal or follow-up
              </p>
            </div>
            <Link
              href="/leads"
              prefetch={false}
              style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading active inquiries...
            </div>
          ) : recentLeads.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)' }}>
              <UserCheck size={32} style={{ color: 'var(--text-subtle)', margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>No pending leads right now</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Ready to take walk-in clients? Click &quot;Add Walk-In Lead&quot; below.
              </p>
              <Link
                href="/leads"
                prefetch={false}
                className="btn btn-secondary"
                style={{ marginTop: 14, fontSize: '0.82rem', padding: '6px 14px' }}
              >
                + Add Walk-In Ingestion
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentLeads.map((lead) => {
                const customer = lead.customerId || {};
                return (
                  <div
                    key={lead.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      transition: 'var(--transition-fast)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                          {customer.fullName || 'Guest Traveler'}
                        </span>
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                          {lead.leadNumber}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span>📍 {lead.destinationName || 'Destination TBD'}</span>
                        <span>👥 {lead.numberOfAdults || 2} Adults</span>
                        <span>📅 {lead.durationNights ? `${lead.durationNights}N` : 'Flexible'}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Link
                        href={`/quotations/new?leadId=${lead.id}&customerId=${customer.id || ''}`}
                        prefetch={false}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none' }}
                      >
                        + Create Quote
                      </Link>
                      <Link
                        href={`/leads`}
                        prefetch={false}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.78rem', textDecoration: 'none' }}
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel 2: Quick Operations & Policy Guidelines */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)', marginBottom: 6 }}>
            Travel Desk Operations
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            Standard operating procedures and fast shortcuts for travel partners
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Action Card 1: Fast Quote */}
            <Link
              href="/quotations/new"
              prefetch={false}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary-light)',
                border: '1px solid var(--primary-border)',
                textDecoration: 'none',
              }}
            >
              <div style={{ padding: 10, borderRadius: 'var(--radius-md)', background: 'var(--primary)', color: '#ffffff' }}>
                <FileText size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>
                  Launch Fast Quotation Wizard
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-body)', marginTop: 2 }}>
                  Under 2-minute dynamic pricing for hotels, transport, and meal plans.
                </div>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--primary)' }} />
            </Link>

            {/* Action Card 2: Record Manual Payment */}
            <Link
              href="/bookings"
              prefetch={false}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-emerald-light)',
                border: '1px solid var(--accent-emerald-border)',
                textDecoration: 'none',
              }}
            >
              <div style={{ padding: 10, borderRadius: 'var(--radius-md)', background: 'var(--accent-emerald)', color: '#ffffff' }}>
                <CalendarCheck size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-emerald-dark)' }}>
                  Record Customer Payment Receipt
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-body)', marginTop: 2 }}>
                  Submit UPI UTR, bank transfer, or cash receipt for Admin verification.
                </div>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--accent-emerald)' }} />
            </Link>

            {/* Operational Policy Note */}
            <div
              style={{
                marginTop: 6,
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <ShieldCheck size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Commercial Governance Reminder
                </span>
              </div>
              <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6, paddingLeft: 18 }}>
                <li>All quotations must be formally Issued before sending links to travelers.</li>
                <li>Cash collections must be deposited and recorded within 24 hours.</li>
                <li>Supplier base costs and gross margins are strictly confidential to Administration.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
