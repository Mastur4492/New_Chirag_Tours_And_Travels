'use client';

import React, { useEffect, useState } from 'react';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';
import { customerApi } from '@/lib/api';
import { DestinationDto, TourPackageDto, PublicEnquiryResultDto } from '@chirag/types';
import { COMPANY_BRANDING } from '@/lib/branding';
import { InfoBadge } from '@/components/InfoBadge';

export default function DedicatedEnquiryPage() {
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);
  const [packages, setPackages] = useState<TourPackageDto[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [tentativeTravelDate, setTentativeTravelDate] = useState('');
  const [durationNights, setDurationNights] = useState<number | ''>(5);
  const [numberOfAdults, setNumberOfAdults] = useState<number>(2);
  const [numberOfChildren, setNumberOfChildren] = useState<number>(0);
  const [budgetEstimate, setBudgetEstimate] = useState<number | ''>('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [honeypot, setHoneypot] = useState('');

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<PublicEnquiryResultDto | null>(null);

  useEffect(() => {
    async function load() {
      setLoadingOptions(true);
      try {
        const [dList, pList] = await Promise.all([
          customerApi.getDestinations().catch(() => []),
          customerApi.getPackages().catch(() => []),
        ]);
        setDestinations(dList);
        setPackages(pList);
      } finally {
        setLoadingOptions(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setFormError('Please enter your full name (minimum 2 characters).');
      return;
    }

    const cleanMobile = mobile.trim().replace(/[\s\-.()]/g, '');
    if (!cleanMobile || cleanMobile.length < 10) {
      setFormError('Please provide a valid 10-digit mobile number.');
      return;
    }

    if (!destinationId) {
      setFormError('Please select a destination circuit.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await customerApi.submitPublicEnquiry({
        fullName: fullName.trim(),
        mobile: cleanMobile,
        email: email.trim() || undefined,
        destinationId,
        packageId: packageId || undefined,
        tentativeTravelDate: tentativeTravelDate || undefined,
        durationNights: durationNights ? Number(durationNights) : undefined,
        numberOfAdults: Number(numberOfAdults) || 2,
        numberOfChildren: Number(numberOfChildren) || 0,
        budgetEstimate: budgetEstimate ? Number(budgetEstimate) : undefined,
        specialRequirements: specialRequirements.trim() || undefined,
        honeypot: honeypot || undefined,
      });

      setSuccessData(result);
    } catch (err: any) {
      setFormError(err.message || 'Unable to submit enquiry. Please try again or call our desk directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Page Header */}
      <div style={{ background: 'linear-gradient(135deg, var(--pine-950) 0%, var(--pine-900) 50%, var(--pine-850) 100%)', color: '#FFFFFF', padding: '64px 0', borderBottom: '3px solid var(--emerald-400)' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: 720 }}>
          <h1 style={{ fontSize: '2.6rem', fontWeight: 900, color: '#FFFFFF', marginBottom: 14 }}>
            Request a Tailored Travel Proposal
          </h1>
          <p style={{ fontSize: '1rem', color: '#D1E2DA', lineHeight: 1.6 }}>
            Tell us about your holiday plans. Our specialists will assemble hotel options, sightseeing routes, and a transparent price quote within 24 hours.
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: 48 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 40, alignItems: 'flex-start' }}>
          {/* Main Form Area */}
          <div>
            {successData ? (
              <div className="form-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    background: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                  }}
                >
                  <CheckCircle2 size={40} />
                </div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0F172A', marginBottom: 10 }}>
                  Enquiry Successfully Recorded!
                </h2>
                <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, maxWidth: 520, margin: '0 auto 24px' }}>
                  Thank you, <strong>{successData.customerName}</strong>. Your holiday enquiry for{' '}
                  <strong>{successData.destinationName}</strong> has been assigned to our travel desk.
                </p>

                {/* Lead Number Box */}
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1.5px dashed #CBD5E1',
                    borderRadius: 14,
                    padding: '20px 28px',
                    marginBottom: 32,
                    display: 'inline-block',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.06em' }}>
                    Lead Tracking Number
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0B192C', marginTop: 4 }}>
                    {successData.leadNumber}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: 6, fontWeight: 600 }}>
                    Please quote this number for follow-up communication
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <a
                    href={`https://wa.me/${COMPANY_BRANDING.phoneRaw}?text=${encodeURIComponent(
                      `Hello New Chirag Tours & Travels, I have submitted holiday enquiry ${successData.leadNumber} for ${successData.destinationName}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '12px 24px',
                      borderRadius: 10,
                      background: '#25D366',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      textDecoration: 'none',
                    }}
                  >
                    <MessageCircle size={18} />
                    <span>Chat on WhatsApp</span>
                  </a>

                  <button
                    onClick={() => {
                      setSuccessData(null);
                      setFullName('');
                      setMobile('');
                      setEmail('');
                      setSpecialRequirements('');
                    }}
                    style={{
                      padding: '12px 24px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                    }}
                  >
                    Submit Another Enquiry
                  </button>
                </div>
              </div>
            ) : (
              <div className="form-card">
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0B192C', marginBottom: 6 }}>
                  Holiday Enquiry Details
                </h2>
                <p style={{ fontSize: '0.86rem', color: '#64748B', marginBottom: 28 }}>
                  Fields marked with an asterisk (<span style={{ color: '#E11D48' }}>*</span>) are required.
                </p>

                <form onSubmit={handleSubmit}>
                  {/* Bot Honeypot */}
                  <div style={{ position: 'absolute', left: '-9999px', opacity: 0 }}>
                    <input
                      type="text"
                      name="dedicated_enquiry_hp"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  {formError && (
                    <div
                      style={{
                        background: '#FFF1F2',
                        border: '1px solid #FECDD3',
                        color: '#9F1239',
                        borderRadius: 10,
                        padding: '12px 16px',
                        fontSize: '0.86rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 24,
                      }}
                    >
                      <AlertCircle size={18} style={{ flexShrink: 0 }} />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Personal Contact */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                    <div className="form-group">
                      <label className="form-label">
                        Full Name <span className="required">*</span>
                      </label>
                      <input
                        id="enquiry-input-name"
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g. Faisal Bikanerwala"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Mobile Number <span className="required">*</span>
                      </label>
                      <input
                        id="enquiry-input-mobile"
                        type="tel"
                        required
                        className="form-input"
                        placeholder="10-digit mobile number"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address (Optional)</label>
                    <input
                      id="enquiry-input-email"
                      type="email"
                      className="form-input"
                      placeholder="e.g. name@example.com (for receiving itemized quotation PDF)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {/* Destination & Package Selectors */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                    <div className="form-group">
                      <label className="form-label">
                        Destination Circuit <span className="required">*</span>
                      </label>
                      <select
                        id="enquiry-select-destination"
                        required
                        className="form-select"
                        value={destinationId}
                        onChange={(e) => setDestinationId(e.target.value)}
                      >
                        <option value="">Select Travel Destination</option>
                        {destinations.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.country})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Specific Tour Package (Optional)</label>
                      <select
                        id="enquiry-select-package"
                        className="form-select"
                        value={packageId}
                        onChange={(e) => setPackageId(e.target.value)}
                      >
                        <option value="">Custom Tailored Route</option>
                        {packages
                          .filter((p) => !destinationId || p.destinationId === destinationId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title} ({p.durationNights}N/{p.durationDays}D)
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Specs */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
                    <div className="form-group">
                      <label className="form-label">Tentative Date</label>
                      <input
                        id="enquiry-input-date"
                        type="date"
                        className="form-input"
                        value={tentativeTravelDate}
                        onChange={(e) => setTentativeTravelDate(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Nights</label>
                      <input
                        id="enquiry-input-nights"
                        type="number"
                        min={1}
                        max={60}
                        className="form-input"
                        value={durationNights === 0 || durationNights === '' ? '' : durationNights}
                        placeholder="3"
                        onChange={(e) => setDurationNights(e.target.value === '' ? '' : Number(e.target.value) || '')}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Adults</label>
                      <input
                        id="enquiry-input-adults"
                        type="number"
                        min={1}
                        max={50}
                        className="form-input"
                        value={numberOfAdults === 0 ? '' : numberOfAdults}
                        placeholder="2"
                        onChange={(e) => setNumberOfAdults(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Children</label>
                      <input
                        id="enquiry-input-children"
                        type="number"
                        min={0}
                        max={30}
                        className="form-input"
                        value={numberOfChildren === 0 ? '' : numberOfChildren}
                        placeholder="0"
                        onChange={(e) => setNumberOfChildren(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Budget & Requirements */}
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span>Estimated Total Budget (₹, Optional)</span>
                      <InfoBadge text="Estimated budget to help customize hotels and private transfer categories." />
                    </label>
                    <input
                      id="enquiry-input-budget"
                      type="number"
                      min={0}
                      className="form-input"
                      placeholder="e.g. 75000"
                      value={budgetEstimate === 0 || budgetEstimate === '' ? '' : budgetEstimate}
                      onChange={(e) => setBudgetEstimate(e.target.value === '' ? '' : Number(e.target.value) || '')}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 32 }}>
                    <label className="form-label">Special Requirements / Travel Preferences</label>
                    <textarea
                      id="enquiry-input-message"
                      rows={4}
                      className="form-textarea"
                      placeholder="Share details like preferred hotel category (3-star / 4-star / luxury resort), vehicle type (Sedan / Innova / Tempo), vegetarian meals, honeymoon arrangements..."
                      value={specialRequirements}
                      onChange={(e) => setSpecialRequirements(e.target.value)}
                    />
                  </div>

                  <button
                    id="enquiry-btn-submit"
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-hero-primary"
                    style={{
                      width: '100%',
                      padding: '14px 28px',
                      fontSize: '1rem',
                      justifyContent: 'center',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmitting ? (
                      <span>Sending Your Travel Request...</span>
                    ) : (
                      <>
                        <span>Submit Holiday Enquiry</span>
                        <Send size={18} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Column: Contact Cards */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Office Card */}
              <div style={{ background: '#FFFFFF', padding: 28, borderRadius: 20, border: '1.5px solid var(--emerald-400)', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.1)' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0B192C', marginBottom: 16 }}>
                  Direct Office Desk
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <MapPin size={18} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: '#334155', lineHeight: 1.5 }}>{COMPANY_BRANDING.fullAddress}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Phone size={16} color="#059669" style={{ flexShrink: 0 }} />
                    <a href={`tel:${COMPANY_BRANDING.phoneRaw}`} style={{ color: '#0B192C', fontWeight: 700 }}>
                      {COMPANY_BRANDING.phoneDisplay}
                    </a>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Mail size={16} color="#059669" style={{ flexShrink: 0 }} />
                    <a href={`mailto:${COMPANY_BRANDING.email}`} style={{ color: '#475569' }}>
                      {COMPANY_BRANDING.email}
                    </a>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Clock size={16} color="#059669" style={{ flexShrink: 0 }} />
                    <span style={{ color: '#475569' }}>{COMPANY_BRANDING.hours}</span>
                  </div>
                </div>
              </div>

              {/* Security & Integrity Box */}
              <div style={{ background: '#F8FAFC', padding: 24, borderRadius: 16, border: '1px solid #E2E8F0', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 800, color: '#0B192C', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={20} color="#059669" />
                  <span>Privacy & Integrity Promise</span>
                </div>
                <div style={{ color: '#475569', lineHeight: 1.6 }}>
                  Your phone number and contact details are stored securely in our private CRM and used strictly for quotation preparation. We do not sell data or send unsolicited spam.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
