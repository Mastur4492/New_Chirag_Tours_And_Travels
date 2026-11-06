'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Building2,
  Calendar,
  Car,
  CheckCircle,
  Clock,
  Compass,
  FileCheck,
  FileText,
  HelpCircle,
  Info,
  MapPin,
  MessageSquare,
  Phone,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  Utensils,
  AlertTriangle,
  ArrowRight,
  Printer,
  Check,
  Share2,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { QuotationPublicDto, MEAL_PLAN_LABELS, MealPlan, AgencySettingsDto } from '@chirag/types';
import { COMPANY_BRANDING } from '@/lib/branding';
import { sanitizeDisplayName } from '@/lib/labels';

export default function CustomerQuotationPage() {
  const params = useParams();
  const token = params?.token as string;

  const [quote, setQuote] = useState<QuotationPublicDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agencySettings, setAgencySettings] = useState<AgencySettingsDto | null>(null);

  // Modification Request Modal & State
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
  const [modMessage, setModMessage] = useState('');
  const [modifying, setModifying] = useState(false);
  const [modError, setModError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Success Feedback
  const [feedback, setFeedback] = useState<{ title: string; message: string; type: 'success' | 'info' } | null>(null);

  const fetchPublicQuote = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/quotations/public/${token}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Quotation not found or link has expired');
      }
      setQuote(data.data);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve quotation. Please verify the link.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicQuote();
    fetch('/api/proxy/settings/agency')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) setAgencySettings(json.data);
      })
      .catch((err) => console.warn('Could not load agency settings in agent quote preview', err));
  }, [token]);

  const handleRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modMessage.trim() || modMessage.trim().length < 3) {
      setModError('Please provide details for the requested modifications.');
      return;
    }
    setModifying(true);
    setModError(null);
    try {
      const res = await fetch(`/api/proxy/quotations/public/${token}/request-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: modMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to submit modification request');
      }
      setQuote(data.data);
      setIsModifyModalOpen(false);
      setFeedback({
        title: 'Modification Request Sent',
        message: 'Your revision request has been logged. Our holiday specialist will adjust the itinerary and update your quotation promptly.',
        type: 'info',
      });
    } catch (err: any) {
      setModError(err.message || 'Failed to submit modification request');
    } finally {
      setModifying(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMealPlanText = (mp: MealPlan | string) => {
    return MEAL_PLAN_LABELS[mp as MealPlan] || mp;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div className="spinner" style={{ width: 44, height: 44, border: '4px solid #cbd5e1', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 16 }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Retrieving Your Travel Proposal...</h2>
        <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: 4 }}>Connecting to New Chirag Tours & Travels Secure Portal</p>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ maxWidth: 440, width: '100%', background: '#ffffff', padding: 32, borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, background: '#fff1f2', color: '#be123c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <AlertTriangle size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Proposal Unavailable</h2>
          <p style={{ fontSize: '0.9rem', color: '#475569', marginTop: 8 }}>{error || 'This proposal link may have expired or has been revised.'}</p>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#64748b' }}>
            For assistance, contact Faisal Bikanerwala at <strong>+91 99786 55529</strong>.
          </div>
        </div>
      </div>
    );
  }

  const isEligibleForAction = ['ISSUED', 'SENT'].includes(quote.status);
  const isAccepted = quote.status === 'ACCEPTED';
  const isExpired = quote.status === 'EXPIRED';

  const companyInfo = quote.companyInfo || {
    name: 'New Chirag Tours & Travels',
    owner: 'Faisal Bikanerwala',
  };

  return (
    <div className="quote-page-wrapper" style={{ padding: '32px 16px 80px', background: '#F8FAFC', minHeight: '100vh' }}>
      <div className="quote-page-container container-narrow" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* On-screen Print / Download Quick Actions Banner */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>
                Official Travel Proposal & Quotation
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Directly issued by New Chirag Tours & Travels • Verified hotel allotments & dedicated transport
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 9999,
                background: '#059669',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.86rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <Printer size={16} />
              <span>Download / Print Official PDF</span>
            </button>
          </div>
        </div>

        {/* 1. Official Company Letterhead Header */}
        <header
          id="quote-letterhead"
          className="quote-letterhead-card quote-print-card"
          style={{
            background: 'linear-gradient(135deg, #04140D 0%, #062317 55%, #0A3722 100%)',
            borderRadius: 16,
            border: '2px solid #10B981',
            padding: '20px 24px',
            boxShadow: '0 6px 20px rgba(8, 34, 22, 0.12)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 12,
                background: '#FFFFFF',
                padding: 4,
                boxShadow: '0 3px 10px rgba(0,0,0,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <img
                src={COMPANY_BRANDING.logos.badge}
                alt={COMPANY_BRANDING.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  {COMPANY_BRANDING.name}
                </span>
                <span
                  style={{
                    background: 'rgba(52, 211, 153, 0.2)',
                    border: '1px solid #34D399',
                    color: '#6EE7B7',
                    padding: '2px 8px',
                    borderRadius: 9999,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Official Proposal
                </span>
              </div>
              <p style={{ color: '#D1E2DA', fontSize: '0.8rem', marginTop: 3 }}>
                Ahmedabad Travel Desk • Founder: <strong>{COMPANY_BRANDING.owner}</strong> • Tel: <strong>{COMPANY_BRANDING.phoneDisplay}</strong>
              </p>
              <p style={{ color: '#94A3B8', fontSize: '0.74rem', marginTop: 2 }}>
                {COMPANY_BRANDING.fullAddress}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <div style={{ fontSize: '0.72rem', color: '#D1E2DA', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              Quotation Reference
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FBBF24', fontFamily: 'monospace', letterSpacing: '0.03em' }}>
              {quote.quoteNumber}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#A7F3D0' }}>
              Issued: {new Date((quote as any)?.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#FDE68A', marginTop: 2 }}>
              Valid Till: {new Date(quote.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div className="no-print" style={{ marginTop: 6 }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Printer size={13} color="#FFFFFF" />
                <span>Print PDF</span>
              </button>
            </div>
          </div>
        </header>

        {/* 2. Destination & Price Overview Banner */}
        <div
          className="quote-print-card pricing-summary-card"
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            padding: '16px 20px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
              Proposed Travel Destination Circuit
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0F172A', margin: '2px 0 0 0' }}>
              {quote.destinationName}
            </h2>
            <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 3 }}>
              Prepared exclusively for: <strong style={{ color: '#0F172A' }}>{sanitizeDisplayName(quote.customerName)}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 800 }}>
              Total All-Inclusive Package Price
            </div>
            <div className="quote-price-lg" style={{ fontSize: '1.8rem', fontWeight: 900, color: '#059669', lineHeight: 1.1 }}>
              {formatCurrency(quote.pricingSummary.finalSellingPrice)}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, marginTop: 2 }}>
              <span>Inclusive of 5% GST (Tour SAC 998555) & all quoted services</span>
              {Boolean(quote.pricingSummary.discountAmount && quote.pricingSummary.discountAmount > 0) && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ECFDF5', color: '#065F46', padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.72rem', border: '1px solid #A7F3D0' }}>
                  <Sparkles size={12} color="#059669" />
                  <span>Special Discount Applied: -{formatCurrency(quote.pricingSummary.discountAmount)}
                  {quote.pricingSummary.discountType === 'PERCENT' && quote.pricingSummary.discountPercent ? ` (${quote.pricingSummary.discountPercent}%)` : ''}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className="no-print"
            style={{
              padding: '16px 20px',
              borderRadius: 12,
              background: feedback.type === 'success' ? '#ECFDF5' : '#EFF6FF',
              border: `1.5px solid ${feedback.type === 'success' ? '#A7F3D0' : '#BFDBFE'}`,
              color: feedback.type === 'success' ? '#065F46' : '#1E40AF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '1rem' }}>
              <CheckCircle size={20} />
              <span>{feedback.title}</span>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', lineHeight: 1.5 }}>
              {feedback.message}
            </p>
          </div>
        )}

        {/* 3. Itinerary Specs Strip */}
        <div className="quote-print-card specs-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, background: '#FFFFFF', padding: '12px 16px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748B', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <Clock size={13} color="#059669" />
              <span>Duration</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0F172A', marginTop: 2 }}>
              {quote.durationNights}N / {quote.durationDays}D
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748B', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <Calendar size={13} color="#059669" />
              <span>Travel Dates</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A', marginTop: 2 }}>
              {new Date(quote.travelStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {new Date(quote.travelEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748B', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <Users size={13} color="#059669" />
              <span>Travelers</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0F172A', marginTop: 2 }}>
              {quote.numberOfAdults} Adults {quote.numberOfChildren ? `, ${quote.numberOfChildren} Kids` : ''}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748B', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <ShieldCheck size={13} color="#059669" />
              <span>Rate Lock</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: isExpired ? '#BE123C' : '#059669', marginTop: 2 }}>
              {isExpired ? 'Proposal Expired' : `Valid till ${new Date(quote.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
            </div>
          </div>
        </div>

        {/* 4. Accommodations */}
        {quote.hotels && quote.hotels.length > 0 && (
          <div className="quote-print-card hotel-card" style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 20px', breakInside: 'avoid' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 7 }}>
              <Building2 size={18} color="#059669" />
              <span>Accommodations & Hotel Stays</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {quote.hotels.map((h, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    borderLeft: '4px solid #059669',
                    background: '#F8FAFC',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0F172A' }}>{h.hotelName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 2 }}>
                      Category: <strong style={{ color: '#334155' }}>{h.roomCategoryName}</strong> · {h.numberOfRooms} Room(s) · {h.numberOfNights} Night(s)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'inline-block', padding: '3px 10px', background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', borderRadius: 6, fontSize: '0.78rem', fontWeight: 800 }}>
                      {getMealPlanText(h.mealPlan)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Transport */}
        {quote.transports && quote.transports.length > 0 && (
          <div className="quote-print-card transport-card" style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 20px', breakInside: 'avoid' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 7 }}>
              <Car size={18} color="#059669" />
              <span>Sightseeing & Dedicated Private Transport</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {quote.transports.map((t, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    borderLeft: '4px solid #0D9488',
                    background: '#F8FAFC',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0F172A' }}>
                      {t.vehicleName || 'Dedicated Private AC Vehicle'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 2 }}>
                      {t.pricingBasis === 'PER_DAY' ? `${t.numberOfDays || 1} Days dedicated chauffeur service` : t.pricingBasis}
                      {' • '}
                      <span>Private AC vehicle for all airport transfers & local sightseeing. Includes tolls, parking & driver allowance.</span>
                    </div>
                    {t.notes && <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4, fontStyle: 'italic' }}>{t.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. Inclusions & Exclusions */}
        <div className="quote-print-card inclusions-card" style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 20px', breakInside: 'avoid' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 7 }}>
            <FileText size={18} color="#059669" />
            <span>Tour Inclusions & Exclusions</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {quote.inclusions?.length > 0 && (
              <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#047857', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle size={14} color="#059669" />
                  <span>Inclusions (Covered in Price)</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.78rem', color: '#334155', lineHeight: 1.55 }}>
                  {quote.inclusions.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: 2 }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {quote.exclusions?.length > 0 && (
              <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#BE123C', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <AlertTriangle size={14} color="#BE123C" />
                  <span>Exclusions (Not Included)</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.78rem', color: '#64748B', lineHeight: 1.55 }}>
                  {quote.exclusions.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: 2 }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* 7. Bank Payment Details & Allotment Lock Guarantee */}
        <div
          className="quote-print-card bank-details-card"
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #E2E8F0',
            padding: '16px 20px',
            breakInside: 'avoid',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <ShieldCheck size={18} color="#059669" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Payment Details & Allotment Lock Guarantee
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {/* Bank NEFT/RTGS Info */}
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: 6, textTransform: 'uppercase', fontSize: '0.74rem', letterSpacing: '0.03em' }}>
                Bank Transfer (NEFT / RTGS / IMPS)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, color: '#334155' }}>
                <div><strong>Account Name:</strong> {agencySettings?.accountHolderName || 'NEW CHIRAG TOURS AND TRAVELS'}</div>
                <div><strong>Bank Name:</strong> {agencySettings?.bankName || 'HDFC Bank Ltd'}</div>
                <div><strong>Branch:</strong> {agencySettings?.branchName || 'Danilimda Branch, Ahmedabad'}</div>
                <div><strong>Account No:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{agencySettings?.accountNumber || '50200084920194'}</span> ({agencySettings?.accountType || 'Current'})</div>
                <div><strong>IFSC Code:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{agencySettings?.ifscCode || 'HDFC0001842'}</span></div>
              </div>
            </div>

            {/* UPI & Instant Payment */}
            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: 6, textTransform: 'uppercase', fontSize: '0.74rem', letterSpacing: '0.03em' }}>
                UPI & Payment Schedule
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, color: '#334155' }}>
                <div><strong>UPI ID:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#059669' }}>{agencySettings?.upiId || '9978655529@upi'}</span></div>
                <div><strong>GPay / PhonePe:</strong> <span style={{ fontWeight: 800 }}>{agencySettings?.upiNumber || '+91 99786 55529'}</span></div>
                <div><strong>{agencySettings?.advancePercentage ?? 25}% Advance:</strong> Locks hotel allotments & vehicle confirmation</div>
                <div><strong>Payment Policy:</strong> {agencySettings?.paymentTerms || 'Balance payable upon arrival / prior to hotel check-in'}</div>
              </div>
            </div>
          </div>

          {/* Terms & Conditions & Signatory */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ fontSize: '0.74rem', color: '#64748B', maxWidth: 460, lineHeight: 1.45 }}>
              <strong>Official Terms:</strong> Rates include specified hotel room categories, meal plan, private dedicated AC vehicle, driver allowance, tolls, and 5% GST. Room allotments are confirmed upon initial deposit. 24/7 on-tour customer support managed directly by {COMPANY_BRANDING.owner}.
            </div>

            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Official Seal / Stamp SVG */}
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: '50%',
                  border: '2px dashed #059669',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: 'rotate(-6deg)',
                  background: '#ECFDF5',
                  color: '#065F46',
                  fontSize: '0.48rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  lineHeight: 1.1,
                  textAlign: 'center',
                  padding: 2,
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.15)',
                }}
              >
                <span>VERIFIED</span>
                <span style={{ fontSize: '0.52rem', color: '#047857' }}>ALLOTMENT</span>
                <span>AHMEDABAD</span>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                  For New Chirag Tours & Travels
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#059669', marginTop: 2 }}>
                  {COMPANY_BRANDING.owner}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  Managing Director & Operations Head
                </div>
              </div>
            </div>
          </div>

          {/* Official Print Footer inside card */}
          <div
            className="print-only"
            style={{
              display: 'none',
              fontSize: '0.68rem',
              color: '#94A3B8',
              textAlign: 'center',
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid #E2E8F0',
              lineHeight: 1.3,
            }}
          >
            {COMPANY_BRANDING.name} • {COMPANY_BRANDING.fullAddress} • Helpline: {COMPANY_BRANDING.phoneDisplay} • Official Computer Generated Proposal
          </div>
        </div>

        {/* Action Panel for Traveler */}
        <div className="no-print" style={{ background: '#ffffff', borderRadius: 16, border: '2px solid #99f6e4', padding: 28, boxShadow: '0 4px 16px rgba(15, 118, 110, 0.08)', textAlign: 'center' }}>
          {isAccepted ? (
            <div>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <CheckCircle size={32} />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#065f46', margin: 0 }}>
                This Proposal Has Been Accepted!
              </h3>
              <p style={{ color: '#047857', fontSize: '0.9rem', margin: '6px 0 0 0' }}>
                Thank you! Our operations team is locking hotel reservations and driver assignments.
              </p>
              <div style={{ marginTop: 16 }}>
                <a
                  href={`https://wa.me/91${COMPANY_BRANDING.phoneRaw}?text=${encodeURIComponent(
                    `Hi New Chirag Tours & Travels, I have accepted quotation ${quote.quoteNumber} for ${sanitizeDisplayName(quote.destinationName) || 'Holiday Package'}. Please share booking vouchers and confirmation.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 20px',
                    borderRadius: 8,
                    background: '#059669',
                    color: '#ffffff',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                  }}
                >
                  <MessageSquare size={16} />
                  <span>WhatsApp Travel Desk for Vouchers</span>
                </a>
              </div>
            </div>
          ) : isExpired ? (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#be123c', margin: 0 }}>
                Proposal Validity Expired
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                Rates may have updated. Please contact our desk for a refreshed quote.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#ecfdf5', color: '#047857', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 700, marginBottom: 8, border: '1px solid #a7f3d0' }}>
                <Eye size={14} />
                <span>Agent Proposal Preview Mode</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Share Proposal with Traveler
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '6px 0 20px 0' }}>
                This is your consultant preview. To confirm this holiday, share the official link with your traveler. The customer reviews the itinerary and accepts online at the Customer Portal.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Hello ${quote.customerName || 'Traveler'}! Here is your official holiday proposal from New Chirag Tours & Travels for ${sanitizeDisplayName(quote.destinationName) || 'Holiday Package'} (${quote.durationNights}N/${quote.durationDays}D):\nhttp://localhost:3000/quote/${token}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 22px',
                    borderRadius: 8,
                    background: '#25D366',
                    color: '#ffffff',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: '0.95rem',
                  }}
                >
                  <MessageSquare size={18} />
                  <span>Share on WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(`http://localhost:3000/quote/${token}`);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 3000);
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 22px',
                    borderRadius: 8,
                    background: copiedLink ? '#059669' : '#0f766e',
                    color: '#ffffff',
                    fontWeight: 700,
                    border: 'none',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {copiedLink ? <Check size={18} /> : <ExternalLink size={18} />}
                  <span>{copiedLink ? 'Link Copied to Clipboard! ✓' : 'Copy Customer Link'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '16px 0', color: '#64748b', fontSize: '0.82rem' }}>
          <div>{COMPANY_BRANDING.name} · Managing Director: {COMPANY_BRANDING.owner}</div>
          <div style={{ marginTop: 4 }}>Phone: {COMPANY_BRANDING.phone} · Danilimda, Ahmedabad, Gujarat 382405</div>
        </footer>
      </div>

      {/* Modify Modal */}
      {isModifyModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.5)', padding: 16 }}>
          <div style={{ maxWidth: 480, width: '100%', background: '#ffffff', borderRadius: 16, padding: 28, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0' }}>
              Request Adjustments
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 16px 0' }}>
              Tell us how you would like to customize your trip (e.g. adjust dates, upgrade rooms, or change vehicle).
            </p>

            <form onSubmit={handleRequestChanges}>
              <textarea
                required
                rows={4}
                value={modMessage}
                onChange={(e) => setModMessage(e.target.value)}
                placeholder="Type your requested adjustments here..."
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
              />

              {modError && (
                <div style={{ padding: '8px 12px', background: '#fff1f2', color: '#be123c', borderRadius: 6, fontSize: '0.8rem', marginTop: 10 }}>
                  {modError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setIsModifyModalOpen(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modifying}
                  style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#0f766e', color: '#ffffff', cursor: 'pointer', fontWeight: 700 }}
                >
                  {modifying ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
