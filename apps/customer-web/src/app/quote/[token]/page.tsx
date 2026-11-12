'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Calendar,
  Car,
  CheckCircle,
  Clock,
  Compass,
  FileText,
  ShieldCheck,
  Sparkles,
  Users,
  AlertTriangle,
  Phone,
  Mail,
  Check,
  Send,
  MessageSquare,
  ArrowRight,
  Info,
  Printer,
  Pencil,
  X,
  UserCheck as TravelerIcon,
} from 'lucide-react';
import { QuotationPublicDto, MEAL_PLAN_LABELS, MealPlan, AgencySettingsDto } from '@chirag/types';
import { COMPANY_BRANDING } from '@/lib/branding';
import { InfoBadge } from '@/components/InfoBadge';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

export default function CustomerFacingQuotationPage() {
  const params = useParams();
  const token = params?.token as string;

  const [quote, setQuote] = useState<QuotationPublicDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agencySettings, setAgencySettings] = useState<AgencySettingsDto | null>(null);

  // Acceptance Modal & State
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Modification Request Modal & State
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
  const [modMessage, setModMessage] = useState('');
  const [modifying, setModifying] = useState(false);
  const [modError, setModError] = useState<string | null>(null);

  // Traveler Details Edit Modal & State
  const [isEditTravelerOpen, setIsEditTravelerOpen] = useState(false);
  const [travelerName, setTravelerName] = useState('');
  const [travelerMobile, setTravelerMobile] = useState('');
  const [travelerEmail, setTravelerEmail] = useState('');
  const [travelerCity, setTravelerCity] = useState('');
  const [savingTraveler, setSavingTraveler] = useState(false);
  const [travelerError, setTravelerError] = useState<string | null>(null);

  // Feedback Banner
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    bookingRef?: string;
    type: 'success' | 'info';
  } | null>(null);

  const handleOpenEditTraveler = () => {
    if (quote) {
      setTravelerName(quote.customerName || '');
      setTravelerMobile(quote.customerMobile || '');
      setTravelerEmail(quote.customerEmail || '');
      setTravelerCity(quote.customerCity || '');
      setTravelerError(null);
      setIsEditTravelerOpen(true);
    }
  };

  const handleSaveTraveler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!travelerName.trim() || travelerName.trim().length < 2) {
      setTravelerError('Full name must be at least 2 characters.');
      return;
    }
    if (!travelerMobile.trim() || travelerMobile.trim().length < 10) {
      setTravelerError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setSavingTraveler(true);
    setTravelerError(null);
    try {
      const res = await fetch(`/api/proxy/quotations/public/${encodeURIComponent(token)}/traveler`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: travelerName.trim(),
          mobile: travelerMobile.trim(),
          email: travelerEmail.trim() || null,
          city: travelerCity.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update traveler contact details');
      }
      setQuote(data.data);
      setIsEditTravelerOpen(false);
      setFeedback({
        title: 'Traveler Details Updated Successfully!',
        message: 'Your updated name, contact number, and address have been synced with New Chirag Tours and Travels operations desk.',
        type: 'success',
      });
    } catch (err: any) {
      setTravelerError(err.message || 'Unable to update details.');
    } finally {
      setSavingTraveler(false);
    }
  };

  const fetchPublicQuote = async (background = false) => {
    if (!token) return;
    if (!background) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/quotations/public/${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Quotation proposal not found or link has expired');
      }
      setQuote(data.data);
    } catch (err: any) {
      if (!background) setError(err.message || 'Unable to retrieve travel proposal. Please check the link or contact our travel desk.');
    } finally {
      if (!background) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicQuote();
    // Load dynamic agency & bank remittance settings
    fetch('/api/proxy/settings/agency')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setAgencySettings(json.data);
        }
      })
      .catch((err) => console.warn('Could not fetch dynamic agency settings', err));
  }, [token]);

  // Real-time synchronization via Server-Sent Events (SSE)
  useRealtimeSync({
    scopeId: token,
    eventTypes: ['QUOTATION_UPDATE', 'AGENCY_SETTINGS_UPDATE'],
    onRefresh: () => {
      fetchPublicQuote(true);
      fetch('/api/proxy/settings/agency')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setAgencySettings(json.data);
          }
        })
        .catch(() => {});
    },
    onEvent: (msg) => {
      if (msg.title || msg.message) {
        setFeedback({
          title: msg.title || 'Quotation Updated',
          message: msg.message || 'This proposal has been updated in real-time by your travel consultant.',
          type: 'info',
        });
      }
    },
  });

  const handleAcceptQuote = async () => {
    if (!termsAgreed || accepting) return;
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch(`/api/proxy/quotations/public/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreedToTerms: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to accept quotation');
      }
      setQuote(data.data);
      setIsAcceptModalOpen(false);
      setFeedback({
        title: 'Booking Request Received Successfully!',
        message:
          'Your acceptance has been registered with our operations desk. Our team will verify hotel allotments and issue formal booking confirmation once reviewed.',
        type: 'success',
      });
    } catch (err: any) {
      setAcceptError(err.message || 'Error processing quotation acceptance');
    } finally {
      setAccepting(false);
    }
  };

  const handleRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modMessage.trim() || modMessage.trim().length < 3) {
      setModError('Please provide details for the requested modifications (e.g. hotel upgrade, date change).');
      return;
    }
    setModifying(true);
    setModError(null);
    try {
      const res = await fetch(`/api/proxy/quotations/public/${encodeURIComponent(token)}/request-changes`, {
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
        title: 'Modification Request Logged',
        message: 'Your requested changes have been sent to our holiday specialist. We will prepare an updated revision promptly.',
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
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div className="spinner" style={{ width: 44, height: 44, border: '4px solid #CBD5E1', borderTopColor: '#0B192C', borderRadius: '50%', marginBottom: 16 }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Retrieving Your Travel Proposal...</h2>
        <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: 4 }}>Connecting to New Chirag Tours and Travels Secure Portal</p>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ maxWidth: 460, width: '100%', background: '#FFFFFF', padding: 36, borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, background: '#FFF1F2', color: '#BE123C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <AlertTriangle size={28} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0F172A' }}>Proposal Unavailable</h2>
          <p style={{ fontSize: '0.92rem', color: '#475569', marginTop: 10, lineHeight: 1.5 }}>
            {error || 'This proposal link may have expired, been superseded by a newer version, or is invalid.'}
          </p>
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #F1F5F9', fontSize: '0.85rem', color: '#64748B' }}>
            For assistance, contact <strong>{COMPANY_BRANDING.owner}</strong> directly at <br />
            <a href={`tel:${COMPANY_BRANDING.phoneRaw}`} style={{ color: '#0B192C', fontWeight: 800 }}>
              {COMPANY_BRANDING.phoneDisplay}
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isEligibleForAction = ['ISSUED', 'SENT'].includes(quote.status);
  const isAccepted = quote.status === 'ACCEPTED';
  const isExpired = quote.status === 'EXPIRED';

  return (
    <div className="quote-page-wrapper" style={{ padding: '28px 16px 80px', background: '#F8FAFC', minHeight: '100vh' }}>
      <div className="quote-page-container" style={{ maxWidth: 1040, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* On-screen Quick Actions Strip */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 14,
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Official Holiday Proposal</span>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: isExpired ? '#FFF1F2' : '#ECFDF5', color: isExpired ? '#BE123C' : '#059669', border: isExpired ? '1px solid #FECDD3' : '1px solid #A7F3D0' }}>
                  {isExpired ? 'Expired' : 'Verified Allotment Available'}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Issued by New Chirag Tours and Travels • Verified property room locks & dedicated AC chauffeur
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={`https://wa.me/${(agencySettings?.supportPhone || COMPANY_BRANDING.phoneRaw).replace(/[^0-9]/g, '')}?text=Hi%20New%20Chirag%20Tours,%20I%20have%20an%20enquiry%20regarding%20Proposal%20${quote.quoteNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 9999,
                background: '#F0FDF4',
                color: '#166534',
                fontWeight: 700,
                fontSize: '0.82rem',
                border: '1px solid #BBF7D0',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <MessageSquare size={14} color="#16A34A" />
              <span>WhatsApp Desk</span>
            </a>

            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                borderRadius: 9999,
                background: '#059669',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.84rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <Printer size={15} />
              <span>Download / Print PDF</span>
            </button>
          </div>
        </div>

        {/* 1. Official Company Letterhead Header */}
        <header
          id="quote-letterhead"
          className="quote-letterhead-card quote-print-card"
          style={{
            background: 'linear-gradient(135deg, #021a11 0%, #063824 50%, #032015 100%)',
            borderRadius: 16,
            border: '1.5px solid rgba(52, 211, 153, 0.35)',
            padding: '22px 26px',
            boxShadow: '0 8px 24px rgba(2, 26, 17, 0.2)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 12,
                background: '#FFFFFF',
                padding: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.22)',
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
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  {agencySettings?.agencyName || COMPANY_BRANDING.name}
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
              <p style={{ color: '#D1E2DA', fontSize: '0.82rem', marginTop: 4, marginBottom: 0 }}>
                Ahmedabad Travel Desk • Founder: <strong style={{ color: '#FFFFFF' }}>{agencySettings?.founderName || COMPANY_BRANDING.owner}</strong> • Tel: <strong style={{ color: '#FFFFFF' }}>{agencySettings?.supportPhone || COMPANY_BRANDING.phoneDisplay}</strong>
              </p>
              <p style={{ color: '#94A3B8', fontSize: '0.74rem', marginTop: 2, marginBottom: 0, maxWidth: 580 }}>
                {agencySettings?.headOfficeAddress || COMPANY_BRANDING.fullAddress}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, background: 'rgba(0, 0, 0, 0.2)', padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ fontSize: '0.7rem', color: '#D1E2DA', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
              Quotation Reference
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FBBF24', fontFamily: 'monospace', letterSpacing: '0.03em' }}>
              {quote.quoteNumber}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#A7F3D0' }}>
              Issued: {new Date((quote as any).createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#FDE68A', marginTop: 1 }}>
              Valid Till: {new Date(quote.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </header>

        {/* 2. Destination & Price Overview Banner */}
        <div
          className="quote-print-card pricing-summary-card"
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '22px 26px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          <div style={{ flex: '1 1 450px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 9999, background: '#F0FDF4', color: '#047857', border: '1px solid #BBF7D0', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
              <Sparkles size={12} color="#059669" />
              <span>Proposed Travel Destination Circuit</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {quote.destinationName}
            </h2>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F8FAFC', padding: '5px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.84rem', color: '#334155' }}>
                <TravelerIcon size={14} color="#059669" />
                <span>Prepared for: <strong style={{ color: '#0F172A' }}>{quote.customerName}</strong></span>
                {(quote.customerMobile || quote.customerEmail) && (
                  <span style={{ color: '#64748B', fontSize: '0.8rem' }}>
                    ({[quote.customerMobile, quote.customerCity].filter(Boolean).join(' • ')})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleOpenEditTraveler}
                className="no-print"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 8,
                  background: '#F0FDFA',
                  border: '1px solid #99F6E4',
                  color: '#0F766E',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Change or update traveler contact details"
              >
                <Pencil size={12} />
                <span>Edit Contact Details</span>
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right', minWidth: 260, background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)', padding: '18px 22px', borderRadius: 14, border: '1.5px solid #A7F3D0' }}>
            <div style={{ fontSize: '0.72rem', color: '#065F46', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
              Total All-Inclusive Package Price
            </div>
            <div className="quote-price-lg" style={{ fontSize: '2.1rem', fontWeight: 900, color: '#047857', lineHeight: 1.1, marginTop: 4 }}>
              {formatCurrency(quote.pricingSummary.finalSellingPrice)}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#065F46', marginTop: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={12} color="#059669" />
                <span>Includes 5% GST (Tour SAC 998555) & all services</span>
              </span>
              {Boolean(quote.pricingSummary.discountAmount && quote.pricingSummary.discountAmount > 0) && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FFFFFF', color: '#065F46', padding: '2px 8px', borderRadius: 6, fontWeight: 800, fontSize: '0.72rem', border: '1px solid #A7F3D0' }}>
                  <Sparkles size={12} color="#059669" />
                  <span>Special Discount: -{formatCurrency(quote.pricingSummary.discountAmount)}
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
        <div className="quote-print-card specs-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, background: '#FFFFFF', padding: '16px 20px', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: '#F0FDF4', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #BBF7D0' }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tour Duration
              </div>
              <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0F172A', marginTop: 1 }}>
                {quote.durationNights}N / {quote.durationDays}D
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #BFDBFE' }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Travel Dates
              </div>
              <div style={{ fontWeight: 900, fontSize: '0.96rem', color: '#0F172A', marginTop: 1 }}>
                {new Date(quote.travelStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {new Date(quote.travelEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #DDD6FE' }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Travelers
              </div>
              <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0F172A', marginTop: 1 }}>
                {quote.numberOfAdults} Adults {quote.numberOfChildren ? `, ${quote.numberOfChildren} Kids` : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: isExpired ? '#FFF1F2' : '#FEF3C7', color: isExpired ? '#BE123C' : '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: isExpired ? '1px solid #FECDD3' : '1px solid #FDE68A' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Rate Lock Guarantee
              </div>
              <div style={{ fontWeight: 900, fontSize: '0.96rem', color: isExpired ? '#BE123C' : '#059669', marginTop: 1 }}>
                {isExpired ? 'Proposal Expired' : `Valid till ${new Date(quote.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Accommodations */}
        {quote.hotels && quote.hotels.length > 0 && (
          <div className="quote-print-card hotel-card" style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '20px 24px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)', breakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F0FDF4', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={18} />
                </div>
                <span>Accommodations & Hotel Stays</span>
              </h3>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', background: '#ECFDF5', padding: '4px 10px', borderRadius: 9999, border: '1px solid #A7F3D0' }}>
                ✔ Guaranteed Property Allotment
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {quote.hotels.map((h, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 12,
                    border: '1px solid #E2E8F0',
                    borderLeft: '5px solid #059669',
                    background: '#F8FAFC',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 14,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 900, fontSize: '1.08rem', color: '#0F172A' }}>{h.hotelName}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#E2E8F0', color: '#334155' }}>
                        Stay #{idx + 1}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.86rem', color: '#475569', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span>Category: <strong style={{ color: '#0F172A' }}>{h.roomCategoryName}</strong></span>
                      <span>•</span>
                      <span>Rooms: <strong style={{ color: '#0F172A' }}>{h.numberOfRooms} Room(s)</strong></span>
                      <span>•</span>
                      <span>Duration: <strong style={{ color: '#0F172A' }}>{h.numberOfNights} Night(s)</strong></span>
                    </div>
                  </div>
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', borderRadius: 8, fontSize: '0.82rem', fontWeight: 800, boxShadow: '0 1px 3px rgba(4, 120, 87, 0.08)' }}>
                      🍽 {getMealPlanText(h.mealPlan)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Transport */}
        {quote.transports && quote.transports.length > 0 && (
          <div className="quote-print-card transport-card" style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '20px 24px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)', breakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Car size={18} />
                </div>
                <span>Sightseeing & Dedicated Private Transport</span>
              </h3>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', padding: '4px 10px', borderRadius: 9999, border: '1px solid #BFDBFE' }}>
                ✔ Private AC Vehicle
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {quote.transports.map((t, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 12,
                    border: '1px solid #E2E8F0',
                    borderLeft: '5px solid #2563EB',
                    background: '#F8FAFC',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0F172A' }}>
                      {t.vehicleName || 'Dedicated Private AC Vehicle'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 4 }}>
                      {t.pricingBasis === 'PER_DAY' ? `${t.numberOfDays || 1} Days dedicated chauffeur service` : t.pricingBasis}
                      {' • '}
                      <span>Private AC vehicle for all airport transfers, inter-city sightseeing circuits, and hotel transfers. Includes driver allowance, state permits, tolls and parking.</span>
                    </div>
                    {t.notes && <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 4, fontStyle: 'italic' }}>{t.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. Inclusions & Exclusions */}
        <div className="quote-print-card inclusions-card" style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '20px 24px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)', breakInside: 'avoid' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', color: '#0F766E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} />
            </div>
            <span>Tour Inclusions & Exclusions</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {quote.inclusions?.length > 0 && (
              <div style={{ background: '#F0FDF4', padding: '16px 18px', borderRadius: 12, border: '1.5px solid #BBF7D0' }}>
                <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#047857', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={16} color="#059669" />
                  <span>Inclusions (Covered in Quoted Price)</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.84rem', color: '#166534', lineHeight: 1.65 }}>
                  {quote.inclusions.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {quote.exclusions?.length > 0 && (
              <div style={{ background: '#FFF1F2', padding: '16px 18px', borderRadius: 12, border: '1.5px solid #FECDD3' }}>
                <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#BE123C', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={16} color="#BE123C" />
                  <span>Exclusions (Not Included)</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.84rem', color: '#9F1239', lineHeight: 1.65 }}>
                  {quote.exclusions.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>{item}</li>
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
            borderRadius: 16,
            border: '1px solid #E2E8F0',
            padding: '22px 26px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
            breakInside: 'avoid',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={18} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
              Official Bank Details & Payment Schedule
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {/* Bank NEFT/RTGS Info */}
            <div style={{ background: '#F8FAFC', padding: '16px 18px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 900, color: '#0F172A', marginBottom: 10, textTransform: 'uppercase', fontSize: '0.78rem', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Bank Transfer (NEFT / RTGS / IMPS)</span>
                <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 800 }}>Verified Current Account</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Account Name:</span>
                  <strong style={{ color: '#0F172A' }}>{agencySettings?.accountHolderName || 'NEW CHIRAG TOURS AND TRAVELS'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Bank Name:</span>
                  <strong style={{ color: '#0F172A' }}>{agencySettings?.bankName || 'HDFC Bank Ltd'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Branch:</span>
                  <strong style={{ color: '#0F172A' }}>{agencySettings?.branchName || 'Danilimda Branch, Ahmedabad'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '6px 10px', borderRadius: 8, border: '1px solid #CBD5E1' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem' }}>Account No:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.96rem', color: '#0F172A' }}>{agencySettings?.accountNumber || '50200084920194'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '6px 10px', borderRadius: 8, border: '1px solid #CBD5E1' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem' }}>IFSC Code:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.96rem', color: '#059669' }}>{agencySettings?.ifscCode || 'HDFC0001842'}</span>
                </div>
              </div>
            </div>

            {/* UPI & Instant Payment */}
            <div style={{ background: '#F8FAFC', padding: '16px 18px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 900, color: '#0F172A', marginBottom: 10, textTransform: 'uppercase', fontSize: '0.78rem', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Instant UPI & Payment Terms</span>
                <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 800 }}>BHIM / GPay / PhonePe</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '6px 10px', borderRadius: 8, border: '1px solid #CBD5E1' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem' }}>UPI ID:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.94rem', color: '#047857' }}>{agencySettings?.upiId || '8866006640@upi'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '6px 10px', borderRadius: 8, border: '1px solid #CBD5E1' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem' }}>PhonePe / GPay:</span>
                  <strong style={{ fontWeight: 900, color: '#0F172A' }}>{agencySettings?.upiNumber || '+91 88660 06640'}</strong>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0', marginTop: 4 }}>
                  <div style={{ fontWeight: 800, color: '#065F46', fontSize: '0.82rem' }}>
                    {agencySettings?.advancePercentage ?? 35}% Advance Token Deposit:
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: 2 }}>
                    Locks hotel inventory, room categories, and driver duty schedules immediately.
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                  <strong>Balance Payment:</strong> {agencySettings?.paymentTerms || 'Balance payable upon arrival / prior to hotel check-in.'}
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Conditions & Signatory */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ fontSize: '0.76rem', color: '#64748B', maxWidth: 520, lineHeight: 1.5 }}>
              <strong>Official Terms:</strong> Quoted package price includes specified hotel stays, stated meal plan, dedicated private AC vehicle, driver night allowance, toll taxes, and 5% GST. Room allotments are locked upon receipt of initial advance. 24/7 on-tour customer support managed directly by {agencySettings?.founderName || COMPANY_BRANDING.owner}.
            </div>

            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Official Seal / Stamp SVG */}
              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: '50%',
                  border: '2px dashed #059669',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: 'rotate(-6deg)',
                  background: '#ECFDF5',
                  color: '#065F46',
                  fontSize: '0.5rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  lineHeight: 1.1,
                  textAlign: 'center',
                  padding: 2,
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.15)',
                }}
              >
                <span>VERIFIED</span>
                <span style={{ fontSize: '0.54rem', color: '#047857' }}>ALLOTMENT</span>
                <span>AHMEDABAD</span>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                  For New Chirag Tours and Travels
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#059669', marginTop: 2 }}>
                  {agencySettings?.founderName || COMPANY_BRANDING.owner}
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

        {/* Acceptance / Request Changes Action Panel */}
        <div
          className="no-print"
          style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
            borderRadius: 20,
            border: '2px solid #34D399',
            padding: '36px 32px',
            boxShadow: '0 10px 30px rgba(5, 150, 105, 0.12)',
            textAlign: 'center',
          }}
        >
          {isAccepted ? (
            <div>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#ECFDF5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px auto',
                  border: '2px solid #A7F3D0',
                }}
              >
                <CheckCircle size={38} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#065F46', margin: 0 }}>
                This Proposal Has Been Formally Accepted!
              </h3>
              <p style={{ color: '#047857', fontSize: '0.94rem', margin: '8px 0 0 0', maxWidth: 540, marginInline: 'auto', lineHeight: 1.5 }}>
                Thank you! Our operations desk has received your booking request. We are locking hotel room allotments and dispatching formal vouchers to your mobile & email.
              </p>
            </div>
          ) : isExpired ? (
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#BE123C', margin: 0 }}>
                Proposal Validity Expired
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '6px 0 0 0' }}>
                Seasonal rates or room categories may have updated. Contact our travel desk to refresh this quotation.
              </p>
            </div>
          ) : isEligibleForAction ? (
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 9999, background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                <Sparkles size={13} color="#059669" />
                <span>Next Step for Your Booking</span>
              </div>

              <h3 style={{ fontSize: '1.55rem', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Ready to Proceed with this Proposal?
              </h3>
              <p style={{ color: '#475569', fontSize: '0.95rem', margin: '8px 0 24px 0', maxWidth: 560, marginInline: 'auto', lineHeight: 1.55 }}>
                Accepting submits an official booking request to our travel desk. You may also request itinerary adjustments if required.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setIsModifyModalOpen(true)}
                  style={{
                    padding: '12px 28px',
                    borderRadius: 9999,
                    background: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>Request Adjustments</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAcceptModalOpen(true)}
                  style={{
                    padding: '12px 34px',
                    borderRadius: 9999,
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.98rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Check size={18} strokeWidth={2.8} />
                  <span>Accept Proposal & Book</span>
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 24, fontSize: '0.78rem', color: '#64748B', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ShieldCheck size={14} color="#059669" />
                  <span>100% Rate Guarantee</span>
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle size={14} color="#059669" />
                  <span>Verified Hotel Inventory</span>
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={14} color="#059669" />
                  <span>Instant Desk Notification</span>
                </span>
              </div>
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#334155', margin: 0 }}>
                Quotation Status: {quote.status}
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: 4 }}>
                For inquiries regarding this proposal, call {agencySettings?.supportPhone || COMPANY_BRANDING.phoneDisplay}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Acceptance Modal */}
      {isAcceptModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(7, 16, 30, 0.65)',
            backdropFilter: 'blur(6px)',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !accepting) setIsAcceptModalOpen(false);
          }}
        >
          <div
            style={{
              maxWidth: 520,
              width: '100%',
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 28,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              position: 'relative',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {/* Close X Button */}
            {!accepting && (
              <button
                type="button"
                onClick={() => setIsAcceptModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B192C', margin: 0 }}>
                  Confirm Quotation Acceptance
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  Proposal #{quote.quoteNumber}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.55, margin: '0 0 14px 0' }}>
              By accepting this proposal, you confirm your travel dates, room allotment, and total package cost of{' '}
              <strong style={{ color: '#059669' }}>{formatCurrency(quote.pricingSummary.finalSellingPrice)}</strong>.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                marginTop: 14,
                padding: 14,
                background: '#F8FAFC',
                borderRadius: 12,
                border: '1px solid #E2E8F0',
              }}
            >
              <input
                type="checkbox"
                id="terms"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                style={{ marginTop: 3, width: 18, height: 18, cursor: 'pointer', accentColor: '#059669' }}
              />
              <label htmlFor="terms" style={{ fontSize: '0.82rem', color: '#334155', cursor: 'pointer', lineHeight: 1.5 }}>
                I agree that this submission creates a formal booking request with New Chirag Tours and Travels and understand that room allotments will be verified prior to final voucher dispatch.
              </label>
            </div>

            {acceptError && (
              <div style={{ padding: '10px 14px', background: '#FFF1F2', color: '#BE123C', borderRadius: 8, fontSize: '0.84rem', marginTop: 14 }}>
                {acceptError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 22, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
              <button
                type="button"
                onClick={() => setIsAcceptModalOpen(false)}
                style={{
                  padding: '11px 22px',
                  borderRadius: 10,
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  transition: 'all 0.15s ease',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAcceptQuote}
                disabled={!termsAgreed || accepting}
                style={{
                  padding: '11px 28px',
                  borderRadius: 10,
                  border: 'none',
                  background: termsAgreed && !accepting ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : '#94A3B8',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: termsAgreed && !accepting ? 'pointer' : 'not-allowed',
                  boxShadow: termsAgreed && !accepting ? '0 4px 14px rgba(5, 150, 105, 0.35)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                }}
              >
                <Check size={16} strokeWidth={2.8} />
                <span>{accepting ? 'Recording Acceptance...' : 'Confirm Acceptance'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modify Modal */}
      {isModifyModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(7, 16, 30, 0.65)',
            backdropFilter: 'blur(6px)',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !modifying) setIsModifyModalOpen(false);
          }}
        >
          <div
            style={{
              maxWidth: 520,
              width: '100%',
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 28,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              position: 'relative',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {/* Close X Button */}
            {!modifying && (
              <button
                type="button"
                onClick={() => setIsModifyModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Pencil size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B192C', margin: 0 }}>
                  Request Adjustments
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  Proposal #{quote.quoteNumber}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#475569', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Tell our holiday desk what you would like to customize (e.g. adjust travel dates, change hotel category, or modify vehicle type).
            </p>

            <form onSubmit={handleRequestChanges}>
              <textarea
                required
                rows={4}
                value={modMessage}
                onChange={(e) => setModMessage(e.target.value)}
                placeholder="Type your requested adjustments here (e.g. Upgrade to 4-star resort, extend stay by 1 day, change cab to Innova)..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  marginBottom: 10,
                }}
              />

              {/* Quick suggestion helper pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {[
                  '📅 Shift dates by a few days',
                  '🏨 Upgrade room category',
                  '🚗 Change vehicle to Innova Crysta',
                  '➕ Add 1 extra night in Gulmarg',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setModMessage((prev) => (prev ? `${prev}\n• ${suggestion}` : `• ${suggestion}`));
                    }}
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      color: '#475569',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {modError && (
                <div style={{ padding: '10px 14px', background: '#FFF1F2', color: '#BE123C', borderRadius: 8, fontSize: '0.82rem', marginBottom: 12 }}>
                  {modError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={() => setIsModifyModalOpen(false)}
                  style={{
                    padding: '11px 22px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modifying}
                  style={{
                    padding: '11px 28px',
                    borderRadius: 10,
                    border: 'none',
                    background: modifying ? '#94A3B8' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: modifying ? 'not-allowed' : 'pointer',
                    boxShadow: modifying ? 'none' : '0 4px 14px rgba(5, 150, 105, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Send size={15} />
                  <span>{modifying ? 'Submitting...' : 'Submit Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Traveler Edit Modal */}
      {isEditTravelerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7, 16, 30, 0.7)', padding: 16 }}>
          <div style={{ maxWidth: 460, width: '100%', background: '#FFFFFF', borderRadius: 20, padding: 28, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0B192C', margin: '0 0 6px 0' }}>
              Update Traveler Contact Details
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 16px 0' }}>
              Keep your contact details up to date for instant booking updates, hotel vouchers, and chauffeur coordination.
            </p>

            {travelerError && (
              <div style={{ padding: '8px 12px', background: '#FFF1F2', color: '#BE123C', borderRadius: 8, fontSize: '0.82rem', marginBottom: 12 }}>
                {travelerError}
              </div>
            )}

            <form onSubmit={handleSaveTraveler} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Traveler Full Name *
                </label>
                <input
                  type="text"
                  value={travelerName}
                  onChange={(e) => setTravelerName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #CBD5E1', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Mobile Number (WhatsApp) *
                </label>
                <input
                  type="text"
                  value={travelerMobile}
                  onChange={(e) => setTravelerMobile(e.target.value)}
                  placeholder="10-digit mobile number"
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #CBD5E1', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={travelerEmail}
                  onChange={(e) => setTravelerEmail(e.target.value)}
                  placeholder="For voucher delivery"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #CBD5E1', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  City / Residential Address
                </label>
                <input
                  type="text"
                  value={travelerCity}
                  onChange={(e) => setTravelerCity(e.target.value)}
                  placeholder="e.g. Ahmedabad, Gujarat"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #CBD5E1', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsEditTravelerOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTraveler}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#059669', color: '#FFFFFF', cursor: savingTraveler ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                >
                  {savingTraveler ? 'Saving...' : 'Save & Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
