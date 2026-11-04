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
        message: 'Thank you for choosing New Chirag Tours & Travels. Your quotation acceptance has been recorded, and our team is preparing your booking reservation.',
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
    const key = (mp === 'EP' ? 'RO' : mp) as MealPlan;
    return MEAL_PLAN_LABELS[key] || mp;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Retrieving Your Travel Quotation...</h2>
        <p className="text-sm text-slate-500 mt-1">Connecting to New Chirag Tours & Travels Secure Portal</p>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Quotation Unavailable</h2>
          <p className="text-sm text-slate-600 mt-2">{error || 'This link may have expired or is invalid.'}</p>
          <div className="mt-6 pt-6 border-t border-slate-100 text-xs text-slate-500">
            For assistance, contact Faisal Bikanerwala or your assigned New Chirag holiday consultant.
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
    <div className="quote-page-wrapper min-h-screen bg-slate-50 text-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="quote-page-container max-w-5xl mx-auto space-y-6">
        {/* Top Branding Header */}
        {/* Official Company Letterhead Header */}
        <header
          id="quote-letterhead"
          className="quote-letterhead-card quote-print-card"
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
                alt={companyInfo.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  {companyInfo.name}
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
                Ahmedabad Travel Desk • Founder: {companyInfo.owner} • Tel: {companyInfo.phone || COMPANY_BRANDING.phoneDisplay}
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

        {/* Status / Feedback Banner */}
        {feedback && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-teal-50 border-teal-200 text-teal-900'
          }`}>
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">{feedback.title}</h4>
              <p className="text-xs mt-0.5 opacity-90">{feedback.message}</p>
            </div>
          </div>
        )}

        {isAccepted && !feedback && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="font-semibold text-sm">Quotation Accepted</span>
                <p className="text-xs text-emerald-700">
                  Accepted on {quote.acceptedAt ? new Date(quote.acceptedAt).toLocaleDateString('en-IN') : 'Record'}. Our reservations team is now preparing your booking reservation.
                </p>
              </div>
            </div>
            <span className="badge badge-success text-xs">Proposal Accepted</span>
          </div>
        )}

        {quote.customerModificationRequest && (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold">Modification Request Under Review</span>
              <p className="mt-1 text-slate-700 italic">
                &ldquo;{quote.customerModificationRequest.message}&rdquo;
              </p>
              <span className="text-slate-500 mt-1 block">
                Submitted on {new Date(quote.customerModificationRequest.requestedAt).toLocaleDateString('en-IN')}
              </span>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-semibold">Quotation Validity Expired</span>
              <p>This quotation was valid until {new Date(quote.validUntil).toLocaleDateString('en-IN')}. Please contact us for revised tariff rates.</p>
            </div>
          </div>
        )}

        {/* Main Grid: Overview & Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Package & Itinerary Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Itinerary Summary Card */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-2">
                <div>
                  <span className="text-xs font-mono text-slate-400 font-semibold">{quote.quoteNumber}</span>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                    <MapPin className="w-5 h-5 text-teal-600" />
                    {(quote.destinationName || '').replace(/\d{8,}/g, '').trim()} Tour Package
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Status</span>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                    quote.status === 'ACCEPTED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : quote.status === 'ISSUED'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-slate-100 text-slate-700'
                  }`}>
                    {quote.status}
                  </span>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-100 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Travel Dates</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(quote.travelStartDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – {new Date(quote.travelEndDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Duration</span>
                  <span className="font-semibold text-slate-800">
                    {quote.durationNights} Nights / {quote.durationDays} Days
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Travelers</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {quote.numberOfAdults} Adults {quote.numberOfChildren > 0 ? `, ${quote.numberOfChildren} Child` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Quote Validity</span>
                  <span className="font-semibold text-slate-800">
                    Until {new Date(quote.validUntil).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>

              {quote.customerName && (
                <div className="pt-3 text-xs text-slate-500">
                  Prepared exclusively for: <strong className="text-slate-800">{quote.customerName}</strong>
                </div>
              )}
            </section>

            {/* Hotels & Accommodation */}
            <section className="quote-print-card hotel-card print-avoid-break bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-teal-600" />
                Selected Accommodations & Meal Plans
              </h3>

              {quote.hotels && quote.hotels.length > 0 ? (
                <div className="space-y-3">
                  {quote.hotels.map((h, i) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{h.hotelName || 'Premium Hotel Partner'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Room Category: <strong className="text-slate-700">{h.roomCategoryName || 'Standard Room'}</strong> ({h.numberOfRooms} Room{h.numberOfRooms > 1 ? 's' : ''})
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Stay: {new Date(h.checkInDate).toLocaleDateString('en-IN')} to {new Date(h.checkOutDate).toLocaleDateString('en-IN')} ({h.numberOfNights} Nights)
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                        <Utensils className="w-3.5 h-3.5 text-teal-600" />
                        <span className="text-xs font-semibold text-slate-800">{getMealPlanText(h.mealPlan)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Hotel accommodations handled separately or as specified in custom itinerary.</p>
              )}
            </section>

            {/* Transport & Sightseeing Vehicle */}
            <section className="quote-print-card transport-card print-avoid-break bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Car className="w-5 h-5 text-teal-600" />
                Transportation & Logistics
              </h3>

              {quote.transports && quote.transports.length > 0 ? (
                <div className="space-y-3">
                  {quote.transports.map((t, i) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 flex justify-between items-center text-sm">
                      <div>
                        <div className="font-bold text-slate-900">{t.vehicleName || 'Dedicated Private AC Vehicle'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Service Type: <span className="font-medium text-slate-700">{t.pricingBasis}</span> for {t.numberOfDays} Days
                        </div>
                        {t.notes && <div className="text-xs text-slate-400 mt-1 italic">{t.notes}</div>}
                      </div>
                      <span className="badge badge-info text-xs">Driver & Fuel Included</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No dedicated vehicle tariffs included.</p>
              )}
            </section>

            {/* Inclusions, Exclusions & Terms */}
            <section className="quote-print-card inclusions-card print-avoid-break bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                Package Terms & Inclusions
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Inclusions */}
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <h4 className="font-bold text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> What is Included
                  </h4>
                  {quote.inclusions && quote.inclusions.length > 0 ? (
                    <ul className="space-y-1.5 text-emerald-950 list-disc list-inside">
                      {quote.inclusions.map((inc, i) => (
                        <li key={i}>{inc}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-emerald-800">Hotel accommodation, meal plan as booked, private vehicle transfers & sightseeing as agreed.</p>
                  )}
                </div>

                {/* Exclusions */}
                <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-100">
                  <h4 className="font-bold text-rose-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> What is Excluded
                  </h4>
                  {quote.exclusions && quote.exclusions.length > 0 ? (
                    <ul className="space-y-1.5 text-rose-950 list-disc list-inside">
                      {quote.exclusions.map((exc, i) => (
                        <li key={i}>{exc}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-rose-800">Airfare/Train tickets, monument entry charges, personal laundry, tips, and optional activities.</p>
                  )}
                </div>
              </div>

              {/* Terms */}
              {quote.terms && quote.terms.length > 0 && (
                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700 block mb-1">Standard Terms & Conditions:</span>
                  <ul className="space-y-1 list-disc list-inside">
                    {quote.terms.map((term, i) => (
                      <li key={i}>{term}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Bank Payment & Allotment Confirmation Details */}
            <section className="print-avoid-break bank-details-card bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Payment Details & Allotment Lock Guarantee
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Bank Transfer Info */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Bank Transfer (NEFT / RTGS / IMPS)
                  </div>
                  <div><strong>Account Name:</strong> New Chirag Tours & Travels</div>
                  <div><strong>Bank Name:</strong> HDFC Bank Ltd</div>
                  <div><strong>Branch:</strong> Danilimda Branch, Ahmedabad</div>
                  <div><strong>Account No:</strong> 50200084920194 (Current Account)</div>
                  <div><strong>IFSC Code:</strong> HDFC0001842</div>
                </div>

                {/* UPI & Instant QR */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    UPI / Instant QR Payment
                  </div>
                  <div><strong>UPI ID:</strong> 9978655529@upi</div>
                  <div><strong>Google Pay / PhonePe:</strong> +91 99786 55529</div>
                  <div><strong>Payment Schedule:</strong> 25% Advance to Lock Allotments</div>
                  <div><strong>Balance Payment:</strong> 75% on Arrival / Prior to Hotel Check-in</div>
                </div>
              </div>

              {/* Terms & Signatory */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-xs">
                <div className="text-slate-500 max-w-md leading-relaxed">
                  <strong>Official Terms:</strong> Rates quoted include specified hotel allotments, daily breakfast & dinner (where specified in meal plan), private dedicated AC vehicle, driver allowance, tolls, and 5% GST. Room allotments are locked upon initial deposit receipt. 24/7 on-tour helpline managed directly by {COMPANY_BRANDING.owner}.
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    For New Chirag Tours & Travels
                  </div>
                  <div className="text-base font-extrabold text-emerald-700 mt-1">
                    {COMPANY_BRANDING.owner}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Managing Director & Operations Head
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column (1 Col): Pricing Summary & Customer Action Box */}
          <div className="space-y-6">
            {/* Price Box */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-6">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-4">
                Selling Price Summary
              </h3>

              <div className="space-y-3 pb-4 border-b border-slate-100 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Package Base Price</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(quote.pricingSummary.taxableAmount)}
                  </span>
                </div>

                {quote.pricingSummary.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Special Promo Discount</span>
                    <span>- {formatCurrency(quote.pricingSummary.discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Goods & Services Tax (GST {quote.pricingSummary.taxRatePercent}%)</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(quote.pricingSummary.taxAmount)}
                  </span>
                </div>
              </div>

              {/* Total Final Price */}
              <div className="pt-4 pb-6">
                <span className="text-xs text-slate-400 block font-medium">Total Package Investment</span>
                <div className="text-3xl font-extrabold text-teal-700 tracking-tight mt-1">
                  {formatCurrency(quote.pricingSummary.finalSellingPrice)}
                </div>
                <span className="text-xs text-slate-500 mt-1 block">
                  All taxes included • No hidden surcharges
                </span>
              </div>

              {/* Actions Section */}
              <div className="space-y-3 no-print">
                {isEligibleForAction ? (
                  <>
                    <button
                      onClick={() => setIsAcceptModalOpen(true)}
                      className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Accept Quotation
                    </button>

                    <a
                      href={`https://wa.me/91${COMPANY_BRANDING.phoneRaw}?text=${encodeURIComponent(
                        `Hi New Chirag Tours & Travels, I have reviewed quotation ${quote.quoteNumber} for ${sanitizeDisplayName(quote.destinationName) || 'Holiday Package'} (${quote.durationNights} Nights). Please assist with booking.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2 text-sm text-center"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat on WhatsApp (+91 99786 55529)
                    </a>

                    <button
                      onClick={() => setIsModifyModalOpen(true)}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <Clock className="w-4 h-4 text-slate-500" />
                      Request Modifications
                    </button>
                  </>
                ) : isAccepted ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-semibold flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Quotation Accepted & Processing
                    </div>
                    <a
                      href={`https://wa.me/91${COMPANY_BRANDING.phoneRaw}?text=${encodeURIComponent(
                        `Hi New Chirag Tours & Travels, I have accepted quotation ${quote.quoteNumber} for ${sanitizeDisplayName(quote.destinationName) || 'Holiday Package'}. Please share payment details and vouchers.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs transition-all flex items-center justify-center gap-2 text-xs text-center"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      WhatsApp for Payment & Vouchers
                    </a>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-center text-xs text-slate-600 font-medium">
                    This quotation is currently {quote.status}.
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400 text-center">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  Direct Booking Guarantee with New Chirag
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 py-6 border-t border-slate-200 space-y-1">
          <div className="font-semibold text-slate-700">
            © {new Date().getFullYear()} {companyInfo.name} • Managed by Faisal Bikanerwala
          </div>
          <div>
            Head Office: {COMPANY_BRANDING.fullAddress}
          </div>
          <div className="text-slate-400">
            Direct Support: {COMPANY_BRANDING.phone} • Official Email: {COMPANY_BRANDING.email}
          </div>
        </footer>
      </div>

      {/* Accept Quotation Confirmation Modal */}
      {isAcceptModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-teal-600" /> Confirm Quotation Acceptance
              </h3>
              <button
                onClick={() => { setIsAcceptModalOpen(false); setAcceptError(null); }}
                className="btn-icon"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {acceptError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{acceptError}</span>
                </div>
              )}

              <p className="text-sm text-slate-600">
                You are confirming quotation <strong>{quote.quoteNumber}</strong> for {quote.durationNights} Nights in <strong>{sanitizeDisplayName(quote.destinationName) || 'Holiday Package'}</strong> at a total package price of <strong>{formatCurrency(quote.pricingSummary.finalSellingPrice)}</strong>.
              </p>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-2">
                <span className="font-semibold text-slate-800 block">Booking Workflow Notice:</span>
                <p>1. Quotation acceptance records your package commitment and locks in current tariff rates.</p>
                <p>2. Final hotel vouchers and vehicle dispatch are confirmed upon advance payment settlement in accordance with New Chirag booking terms.</p>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 mt-2">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>I have reviewed the travel dates, inclusions, exclusions, and agree to the tour terms.</span>
              </label>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setIsAcceptModalOpen(false)}
                className="btn btn-secondary"
                disabled={accepting}
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleAcceptQuote}
                className="btn btn-primary"
                disabled={!termsAgreed || accepting}
              >
                {accepting ? 'Confirming...' : 'Yes, Accept Quotation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Modification Modal */}
      {isModifyModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-teal-600" /> Request Quotation Changes
              </h3>
              <button
                onClick={() => setIsModifyModalOpen(false)}
                className="btn-icon"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestChanges}>
              <div className="modal-body">
                <p className="text-xs text-slate-600">
                  Need to change dates, upgrade hotel category, add nights, or adjust traveler count? Tell us what you&apos;d like adjusted and we will reissue a revised quotation.
                </p>

                {modError && (
                  <div className="form-error-banner text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{modError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label text-xs">Requested Modifications / Message</label>
                  <textarea
                    rows={4}
                    value={modMessage}
                    onChange={(e) => setModMessage(e.target.value)}
                    placeholder="e.g. Please change hotel to 4-star category, and extend the stay in Pahalgam by 1 night..."
                    required
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModifyModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={modifying}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={modifying}
                >
                  {modifying ? 'Submitting...' : 'Send Revision Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
