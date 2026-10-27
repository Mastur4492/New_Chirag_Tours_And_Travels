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
} from 'lucide-react';
import { QuotationPublicDto, MEAL_PLAN_LABELS, MealPlan } from '@chirag/types';
import { COMPANY_BRANDING } from '@/lib/branding';
import { InfoBadge } from '@/components/InfoBadge';

export default function CustomerFacingQuotationPage() {
  const params = useParams();
  const token = params?.token as string;

  const [quote, setQuote] = useState<QuotationPublicDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Feedback Banner
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    bookingRef?: string;
    type: 'success' | 'info';
  } | null>(null);

  const fetchPublicQuote = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/quotations/public/${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Quotation proposal not found or link has expired');
      }
      setQuote(data.data);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve travel proposal. Please check the link or contact our travel desk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicQuote();
  }, [token]);

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
        <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: 4 }}>Connecting to New Chirag Tours & Travels Secure Portal</p>
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
    <div style={{ padding: '40px 16px 80px', background: '#F8FAFC' }}>
      <div className="container-narrow" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Official Company Letterhead Header */}
        <header
          id="quote-letterhead"
          style={{
            background: 'linear-gradient(135deg, var(--pine-950) 0%, var(--pine-900) 50%, var(--pine-850) 100%)',
            borderRadius: 20,
            border: '2px solid var(--emerald-400)',
            padding: '28px 32px',
            boxShadow: '0 8px 24px rgba(8, 34, 22, 0.15)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 16,
                background: '#FFFFFF',
                padding: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
                <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  {COMPANY_BRANDING.name}
                </span>
                <span
                  style={{
                    background: 'rgba(52, 211, 153, 0.2)',
                    border: '1px solid #34D399',
                    color: '#6EE7B7',
                    padding: '2px 8px',
                    borderRadius: 9999,
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                  }}
                >
                  Official Proposal
                </span>
              </div>
              <p style={{ color: '#D1E2DA', fontSize: '0.84rem', marginTop: 3 }}>
                Ahmedabad Travel Desk • Founder: {COMPANY_BRANDING.owner} • Tel: {COMPANY_BRANDING.phoneDisplay}
              </p>
              <p style={{ color: '#94A3B8', fontSize: '0.78rem', marginTop: 2 }}>
                {COMPANY_BRANDING.fullAddress}
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ fontSize: '0.76rem', color: '#D1E2DA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quotation Reference
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FBBF24', fontFamily: 'monospace' }}>
              {quote.quoteNumber}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#A7F3D0' }}>
              Issued: {new Date((quote as any).createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ marginTop: 6 }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="no-print"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 10,
                  background: '#059669',
                  border: '1px solid #34D399',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Printer size={15} color="#FFFFFF" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>
        </header>

        {/* Destination & Price Overview Banner */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 800 }}>
              Travel Destination Circuit
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0F172A', margin: '2px 0 0 0' }}>
              {quote.destinationName}
            </h2>
            <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: 4 }}>
              Prepared for <strong>{quote.customerName}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.76rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span>Total Package Price</span>
              <InfoBadge text="All-inclusive quoted cost covering verified hotels, transport, driver charges, toll/parking, and statutory GST." />
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#059669' }}>
              {formatCurrency(quote.pricingSummary.finalSellingPrice)}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginTop: 2 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span>Inclusive of 5% GST (Tour SAC 998555) & all quoted services</span>
                <InfoBadge text="Statutory 5% GST (CGST 2.5% + SGST 2.5%) under SAC 998555 for Tour Operator services." />
              </span>
              {Boolean(quote.pricingSummary.discountAmount && quote.pricingSummary.discountAmount > 0) && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ECFDF5', color: '#065F46', padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.72rem', border: '1px solid #A7F3D0' }}>
                  <Sparkles size={12} color="#059669" />
                  <span>Special Discount Applied: -{formatCurrency(quote.pricingSummary.discountAmount)}
                  {quote.pricingSummary.discountType === 'PERCENT' && quote.pricingSummary.discountPercent ? ` (${quote.pricingSummary.discountPercent}%)` : ''}</span>
                  <InfoBadge text="Promotional concession deducted directly from total package price." />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              padding: '18px 24px',
              borderRadius: 14,
              background: feedback.type === 'success' ? '#ECFDF5' : '#EFF6FF',
              border: `1.5px solid ${feedback.type === 'success' ? '#A7F3D0' : '#BFDBFE'}`,
              color: feedback.type === 'success' ? '#065F46' : '#1E40AF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '1.05rem' }}>
              <CheckCircle size={22} />
              <span>{feedback.title}</span>
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.92rem', lineHeight: 1.5 }}>
              {feedback.message}
            </p>
          </div>
        )}

        {/* Itinerary Specs Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: '0.78rem', marginBottom: 4 }}>
              <Clock size={15} color="#0F766E" />
              <span>Duration</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>
              {quote.durationNights} Nights / {quote.durationDays} Days
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: '0.78rem', marginBottom: 4 }}>
              <Calendar size={15} color="#0F766E" />
              <span>Travel Dates</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>
              {new Date(quote.travelStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {new Date(quote.travelEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: '0.78rem', marginBottom: 4 }}>
              <Users size={15} color="#0F766E" />
              <span>Travelers</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>
              {quote.numberOfAdults} Adults {quote.numberOfChildren ? `, ${quote.numberOfChildren} Kids` : ''}
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px 18px', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: '0.78rem', marginBottom: 4 }}>
              <ShieldCheck size={15} color="#0F766E" />
              <span>Proposal Validity</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isExpired ? '#BE123C' : '#059669' }}>
              {isExpired ? 'Proposal Expired' : `Valid till ${new Date(quote.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
            </div>
          </div>
        </div>

        {/* Accommodations */}
        {quote.hotels && quote.hotels.length > 0 && (
          <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', padding: 26, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={20} color="#0F766E" />
              <span>Accommodations & Hotel Stays</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {quote.hotels.map((h, idx) => (
                <div key={idx} style={{ padding: 16, borderRadius: 12, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>{h.hotelName}</div>
                    <div style={{ fontSize: '0.86rem', color: '#64748B', marginTop: 3 }}>
                      Category: <strong>{h.roomCategoryName}</strong> · {h.numberOfRooms} Room(s) · {h.numberOfNights} Night(s)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'inline-block', padding: '4px 12px', background: '#ECFDF5', color: '#059669', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700 }}>
                      {getMealPlanText(h.mealPlan)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transport */}
        {quote.transports && quote.transports.length > 0 && (
          <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', padding: 26, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Car size={20} color="#0F766E" />
              <span>Sightseeing & Dedicated Transport</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {quote.transports.map((t, idx) => (
                <div key={idx} style={{ padding: 16, borderRadius: 12, border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>{t.vehicleName}</div>
                  <div style={{ fontSize: '0.86rem', color: '#64748B', marginTop: 4 }}>
                    {t.pricingBasis === 'PER_DAY' ? `${t.numberOfDays || 1} Days dedicated chauffeur service` : t.pricingBasis}
                  </div>
                  {t.notes && <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 6, fontStyle: 'italic' }}>{t.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inclusions & Exclusions */}
        <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', padding: 26, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} color="#0F766E" />
            <span>Tour Inclusions & Exclusions</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {quote.inclusions?.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#047857', marginBottom: 8 }}>Inclusions:</div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.86rem', color: '#334155', lineHeight: 1.7 }}>
                  {quote.inclusions.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {quote.exclusions?.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#BE123C', marginBottom: 8 }}>Exclusions:</div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.86rem', color: '#64748B', lineHeight: 1.7 }}>
                  {quote.exclusions.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Bank Payment & Allotment Confirmation Details */}
        <div
          className="print-avoid-break bank-details-card"
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            border: '1px solid #E2E8F0',
            padding: '26px 28px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <ShieldCheck size={20} color="#059669" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Payment Details & Allotment Lock Guarantee
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {/* Bank NEFT/RTGS Info */}
            <div style={{ background: '#F8FAFC', padding: '16px 18px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: '0.86rem' }}>
              <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: 8, textTransform: 'uppercase', fontSize: '0.78rem' }}>
                Bank Transfer (NEFT / RTGS / IMPS)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#334155' }}>
                <div><strong>Account Name:</strong> New Chirag Tours & Travels</div>
                <div><strong>Bank Name:</strong> HDFC Bank Ltd</div>
                <div><strong>Branch:</strong> Danilimda Branch, Ahmedabad</div>
                <div><strong>Account No:</strong> 50200084920194 (Current Account)</div>
                <div><strong>IFSC Code:</strong> HDFC0001842</div>
              </div>
            </div>

            {/* UPI & Instant Payment */}
            <div style={{ background: '#F8FAFC', padding: '16px 18px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: '0.86rem' }}>
              <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: 8, textTransform: 'uppercase', fontSize: '0.78rem' }}>
                UPI / Instant QR Payment
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#334155' }}>
                <div><strong>UPI ID:</strong> 9978655529@upi</div>
                <div><strong>Google Pay / PhonePe:</strong> +91 99786 55529</div>
                <div><strong>Payment Schedule:</strong> 25% Advance to Lock Allotments</div>
                <div><strong>Balance Payment:</strong> 75% on Arrival / Prior to Hotel Check-in</div>
              </div>
            </div>
          </div>

          {/* Terms & Conditions & Signatory */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
            <div style={{ fontSize: '0.8rem', color: '#64748B', maxWidth: 490, lineHeight: 1.55 }}>
              <strong>Official Terms:</strong> Rates quoted include specified hotel allotments, daily breakfast & dinner (where specified in meal plan), private dedicated AC vehicle, driver allowance, tolls, and 5% GST. Room allotments are locked upon initial deposit receipt. 24/7 on-tour helpline managed directly by {COMPANY_BRANDING.owner}.
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.76rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                For New Chirag Tours & Travels
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#059669', marginTop: 12 }}>
                {COMPANY_BRANDING.owner}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                Managing Director & Operations Head
              </div>
            </div>
          </div>
        </div>

        {/* Acceptance / Request Changes Action Panel */}
        <div
          className="no-print"
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            border: '2px solid var(--emerald-400)',
            padding: 32,
            boxShadow: '0 8px 30px rgba(16, 185, 129, 0.12)',
            textAlign: 'center',
          }}
        >
          {isAccepted ? (
            <div>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: '#ECFDF5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                }}
              >
                <CheckCircle size={36} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#065F46', margin: 0 }}>
                This Proposal Has Been Accepted!
              </h3>
              <p style={{ color: '#047857', fontSize: '0.92rem', margin: '8px 0 0 0', maxWidth: 500, marginInline: 'auto' }}>
                Thank you! Our operations team has received your booking request and is verifying hotel room locks and vehicle schedules.
              </p>
            </div>
          ) : isExpired ? (
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#BE123C', margin: 0 }}>
                Proposal Validity Expired
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '6px 0 0 0' }}>
                Seasonal rates or room categories may have updated. Contact our travel desk to refresh this quotation.
              </p>
            </div>
          ) : isEligibleForAction ? (
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0B192C', margin: 0 }}>
                Ready to Proceed with this Proposal?
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.92rem', margin: '6px 0 24px 0', maxWidth: 540, marginInline: 'auto' }}>
                Accepting submits an official booking request to our travel desk. You may also request itinerary adjustments if required.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setIsModifyModalOpen(true)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 9999,
                    background: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  Request Adjustments
                </button>

                <button
                  onClick={() => setIsAcceptModalOpen(true)}
                  className="btn-hero-primary"
                  style={{ padding: '12px 32px', fontSize: '0.95rem' }}
                >
                  <Check size={18} />
                  <span>Accept Proposal & Book</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#334155', margin: 0 }}>
                Quotation Status: {quote.status}
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.88rem', marginTop: 4 }}>
                For inquiries regarding this proposal, call {COMPANY_BRANDING.phoneDisplay}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Acceptance Modal */}
      {isAcceptModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7, 16, 30, 0.7)', padding: 16 }}>
          <div style={{ maxWidth: 480, width: '100%', background: '#FFFFFF', borderRadius: 20, padding: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0B192C', margin: '0 0 12px 0' }}>
              Confirm Quotation Acceptance
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
              By accepting proposal <strong>{quote.quoteNumber}</strong>, you approve the travel dates, hotel accommodations, and total price of <strong>{formatCurrency(quote.pricingSummary.finalSellingPrice)}</strong>.
            </p>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 20, padding: 14, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <input
                type="checkbox"
                id="terms"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                style={{ marginTop: 3, width: 18, height: 18, cursor: 'pointer' }}
              />
              <label htmlFor="terms" style={{ fontSize: '0.84rem', color: '#334155', cursor: 'pointer', lineHeight: 1.4 }}>
                I agree that this submission creates a formal booking request with New Chirag Tours & Travels and understand that room allotments will be verified prior to final voucher dispatch.
              </label>
            </div>

            {acceptError && (
              <div style={{ padding: '10px 14px', background: '#FFF1F2', color: '#BE123C', borderRadius: 8, fontSize: '0.84rem', marginTop: 14 }}>
                {acceptError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button
                onClick={() => setIsAcceptModalOpen(false)}
                style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptQuote}
                disabled={!termsAgreed || accepting}
                className="btn-hero-primary"
                style={{
                  padding: '10px 22px',
                  cursor: termsAgreed ? 'pointer' : 'not-allowed',
                  opacity: termsAgreed ? 1 : 0.6,
                }}
              >
                {accepting ? 'Recording Acceptance...' : 'Confirm Acceptance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modify Modal */}
      {isModifyModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7, 16, 30, 0.7)', padding: 16 }}>
          <div style={{ maxWidth: 480, width: '100%', background: '#FFFFFF', borderRadius: 20, padding: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0B192C', margin: '0 0 12px 0' }}>
              Request Adjustments
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', margin: '0 0 18px 0', lineHeight: 1.5 }}>
              Tell our holiday desk what you would like to customize (e.g. adjust travel dates, change hotel category, or modify vehicle type).
            </p>

            <form onSubmit={handleRequestChanges}>
              <textarea
                required
                rows={4}
                value={modMessage}
                onChange={(e) => setModMessage(e.target.value)}
                placeholder="Type your requested adjustments here..."
                className="form-textarea"
                style={{ marginBottom: 12 }}
              />

              {modError && (
                <div style={{ padding: '10px 14px', background: '#FFF1F2', color: '#BE123C', borderRadius: 8, fontSize: '0.84rem', marginBottom: 12 }}>
                  {modError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setIsModifyModalOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modifying}
                  className="btn-hero-primary"
                  style={{ padding: '10px 22px' }}
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
