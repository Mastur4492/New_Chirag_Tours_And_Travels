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
} from 'lucide-react';
import { QuotationPublicDto, MEAL_PLAN_LABELS, MealPlan } from '@chirag/types';
import { COMPANY_BRANDING } from '@/lib/branding';
import { sanitizeDisplayName } from '@/lib/labels';

export default function CustomerQuotationPage() {
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
  }, [token]);

  const handleAcceptQuote = async () => {
    if (!termsAgreed || accepting) return;
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch(`/api/proxy/quotations/public/${token}/accept`, {
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
        title: 'Quotation Accepted Successfully!',
        message: 'Thank you for choosing New Chirag Tours & Travels. Your acceptance has been recorded, and our travel desk is now processing your booking reservation.',
        type: 'success',
      });
    } catch (err: any) {
      setAcceptError(err.message || 'Error accepting quote');
    } finally {
      setAccepting(false);
    }
  };

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
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', padding: '32px 16px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Official Company Letterhead Header */}
        <header
          id="quote-letterhead"
          style={{
            background: 'linear-gradient(135deg, #082216 0%, #0d3824 50%, #124d32 100%)',
            borderRadius: 20,
            border: '2px solid #059669',
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
              Issued: {new Date((quote as any)?.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
            background: '#ffffff',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>
              Travel Destination Circuit
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '2px 0 0 0' }}>
              {quote.destinationName}
            </h2>
            <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: 4 }}>
              Prepared for <strong>{sanitizeDisplayName(quote.customerName)}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.76rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>
              Total Package Price
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#059669' }}>
              {formatCurrency(quote.pricingSummary.finalSellingPrice)}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
              Inclusive of 5% GST & all quoted services
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div style={{ padding: '16px 20px', borderRadius: 12, background: feedback.type === 'success' ? '#ecfdf5' : '#eff6ff', border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#bfdbfe'}`, color: feedback.type === 'success' ? '#065f46' : '#1e40af' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
              <CheckCircle size={18} />
              <span>{feedback.title}</span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem' }}>{feedback.message}</p>
          </div>
        )}

        {/* Itinerary Specs Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '0.78rem', marginBottom: 4 }}>
              <Clock size={15} color="#0f766e" />
              <span>Duration</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
              {quote.durationNights} Nights / {quote.durationDays} Days
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '0.78rem', marginBottom: 4 }}>
              <Calendar size={15} color="#0f766e" />
              <span>Travel Dates</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
              {new Date(quote.travelStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {new Date(quote.travelEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '0.78rem', marginBottom: 4 }}>
              <Users size={15} color="#0f766e" />
              <span>Travelers</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
              {quote.numberOfAdults} Adults {quote.numberOfChildren ? `, ${quote.numberOfChildren} Children` : ''}
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '0.78rem', marginBottom: 4 }}>
              <ShieldCheck size={15} color="#0f766e" />
              <span>Proposal Validity</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isExpired ? '#be123c' : '#059669' }}>
              {isExpired ? 'Proposal Expired' : `Valid till ${new Date(quote.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
            </div>
          </div>
        </div>

        {/* Accommodations */}
        {quote.hotels && quote.hotels.length > 0 && (
          <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={20} color="#0f766e" />
              <span>Accommodations & Hotel Stays</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {quote.hotels.map((h, idx) => (
                <div key={idx} style={{ padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{h.hotelName}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 3 }}>
                      Category: <strong>{h.roomCategoryName}</strong> · {h.numberOfRooms} Room(s) · {h.numberOfNights} Night(s)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'inline-block', padding: '4px 10px', background: '#f0fdf4', color: '#0f766e', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700 }}>
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
          <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Car size={20} color="#0f766e" />
              <span>Sightseeing & Transport Vehicle</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {quote.transports.map((t, idx) => (
                <div key={idx} style={{ padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{t.vehicleName}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                    {t.pricingBasis === 'PER_DAY' ? `${t.numberOfDays || 1} Days dedicated service` : t.pricingBasis}
                  </div>
                  {t.notes && <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 6, fontStyle: 'italic' }}>{t.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inclusions & Terms */}
        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} color="#0f766e" />
            <span>Tour Inclusions & Important Terms</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {quote.inclusions?.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#047857', marginBottom: 8 }}>Inclusions:</div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', color: '#334155', lineHeight: 1.7 }}>
                  {quote.inclusions.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {quote.exclusions?.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#be123c', marginBottom: 8 }}>Exclusions:</div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.7 }}>
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
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: '26px 28px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <ShieldCheck size={20} color="#059669" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Payment Details & Allotment Lock Guarantee
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {/* Bank NEFT/RTGS Info */}
            <div style={{ background: '#f8fafc', padding: '16px 18px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: '0.86rem' }}>
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 8, textTransform: 'uppercase', fontSize: '0.78rem' }}>
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
            <div style={{ background: '#f8fafc', padding: '16px 18px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: '0.86rem' }}>
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 8, textTransform: 'uppercase', fontSize: '0.78rem' }}>
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
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: 490, lineHeight: 1.55 }}>
              <strong>Official Terms:</strong> Rates quoted include specified hotel allotments, daily breakfast & dinner (where specified in meal plan), private dedicated AC vehicle, driver allowance, tolls, and 5% GST. Room allotments are locked upon initial deposit receipt. 24/7 on-tour helpline managed directly by {COMPANY_BRANDING.owner}.
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.76rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                For New Chirag Tours & Travels
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#059669', marginTop: 12 }}>
                {COMPANY_BRANDING.owner}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                Managing Director & Operations Head
              </div>
            </div>
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Ready to Confirm Your Holiday?
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '6px 0 20px 0' }}>
                Lock in your accommodations and itinerary by accepting online or requesting adjustments.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setIsModifyModalOpen(true)}
                  style={{ padding: '12px 24px', borderRadius: 8, background: '#f8fafc', border: '1.5px solid #cbd5e1', color: '#334155', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                >
                  Request Changes
                </button>

                <a
                  href={`https://wa.me/91${COMPANY_BRANDING.phoneRaw}?text=${encodeURIComponent(
                    `Hi New Chirag Tours & Travels, I have reviewed quotation ${quote.quoteNumber} for ${sanitizeDisplayName(quote.destinationName) || 'Holiday Package'} (${quote.durationNights} Nights). Please assist with booking.`
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
                  <span>Chat on WhatsApp</span>
                </a>

                <button
                  onClick={() => setIsAcceptModalOpen(true)}
                  style={{ padding: '12px 32px', borderRadius: 8, background: '#0f766e', border: 'none', color: '#ffffff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Check size={18} />
                  <span>Accept Quotation Proposal</span>
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

      {/* Acceptance Modal */}
      {isAcceptModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.5)', padding: 16 }}>
          <div style={{ maxWidth: 480, width: '100%', background: '#ffffff', borderRadius: 16, padding: 28, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0' }}>
              Confirm Quotation Acceptance
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
              By accepting proposal <strong>{quote.quoteNumber}</strong>, you approve the travel dates, hotel accommodations, and total price of <strong>{formatCurrency(quote.pricingSummary.finalSellingPrice)}</strong>.
            </p>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 18, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <input
                type="checkbox"
                id="terms"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                style={{ marginTop: 3, width: 16, height: 16 }}
              />
              <label htmlFor="terms" style={{ fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                I agree to the tour terms, cancellation policy, and advance payment schedule of New Chirag Tours & Travels.
              </label>
            </div>

            {acceptError && (
              <div style={{ padding: '8px 12px', background: '#fff1f2', color: '#be123c', borderRadius: 6, fontSize: '0.8rem', marginTop: 12 }}>
                {acceptError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button onClick={() => setIsAcceptModalOpen(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button
                onClick={handleAcceptQuote}
                disabled={!termsAgreed || accepting}
                style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: termsAgreed ? '#0f766e' : '#cbd5e1', color: '#ffffff', cursor: termsAgreed ? 'pointer' : 'not-allowed', fontWeight: 700 }}
              >
                {accepting ? 'Recording Acceptance...' : 'Confirm Acceptance'}
              </button>
            </div>
          </div>
        </div>
      )}

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
