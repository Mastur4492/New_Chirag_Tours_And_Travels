'use client';

import React, { useState, useEffect } from 'react';
import { X, Send, CheckCircle2, AlertCircle, Phone, Calendar, Users, MapPin, Sparkles, MessageCircle } from 'lucide-react';
import { customerApi } from '@/lib/api';
import { DestinationDto, TourPackageDto, PublicEnquiryResultDto } from '@chirag/types';
import { COMPANY_BRANDING } from '@/lib/branding';
import { InfoBadge } from '@/components/InfoBadge';

interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDestinationId?: string;
  initialPackageId?: string;
  destinationName?: string;
  packageName?: string;
}

export function EnquiryModal({
  isOpen,
  onClose,
  initialDestinationId,
  initialPackageId,
  destinationName,
  packageName,
}: EnquiryModalProps) {
  const [destinations, setDestinations] = useState<DestinationDto[]>([]);
  const [packages, setPackages] = useState<TourPackageDto[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [destinationId, setDestinationId] = useState(initialDestinationId || '');
  const [packageId, setPackageId] = useState(initialPackageId || '');
  const [tentativeTravelDate, setTentativeTravelDate] = useState('');
  const [durationNights, setDurationNights] = useState<number | ''>(5);
  const [numberOfAdults, setNumberOfAdults] = useState<number>(2);
  const [numberOfChildren, setNumberOfChildren] = useState<number>(0);
  const [budgetEstimate, setBudgetEstimate] = useState<number | ''>('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [honeypot, setHoneypot] = useState('');

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<PublicEnquiryResultDto | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialDestinationId) setDestinationId(initialDestinationId);
      if (initialPackageId) setPackageId(initialPackageId);
      loadFormOptions();
    } else {
      // Reset success state on close
      setSuccessData(null);
      setFormError(null);
    }
  }, [isOpen, initialDestinationId, initialPackageId]);

  const loadFormOptions = async () => {
    setLoadingOptions(true);
    try {
      const [destList, pkgList] = await Promise.all([
        customerApi.getDestinations().catch(() => []),
        customerApi.getPackages().catch(() => []),
      ]);
      setDestinations(destList);
      setPackages(pkgList);
    } catch {
      // Non-blocking; user can still enter details
    } finally {
      setLoadingOptions(false);
    }
  };

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
      setFormError(err.message || 'Unable to submit enquiry. Please try again or call our desk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(7, 16, 30, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
        }}
      >
        {/* Header bar */}
        <div
          style={{
            background: 'linear-gradient(135deg, #05170F 0%, #082216 100%)',
            color: '#FFFFFF',
            padding: '24px 28px',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottom: '2px solid #10B981',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              {packageName ? `Enquire for ${packageName}` : destinationName ? `Plan Your ${destinationName} Holiday` : 'Custom Holiday Enquiry'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#D1E2DA', margin: '6px 0 0 0' }}>
              Direct travel desk of New Chirag Tours & Travels · Managed by {COMPANY_BRANDING.owner}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '28px' }}>
          {successData ? (
            /* Success confirmation screen */
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
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
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <h4 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                Enquiry Successfully Received!
              </h4>
              <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.5, marginBottom: 20 }}>
                Thank you, <strong>{successData.customerName}</strong>. Your custom holiday enquiry for{' '}
                <strong>{successData.destinationName}</strong> has been logged directly with our Ahmedabad travel desk.
              </p>

              {/* Reference Box */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1.5px dashed #CBD5E1',
                  borderRadius: 12,
                  padding: '16px 20px',
                  marginBottom: 24,
                  display: 'inline-block',
                }}
              >
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Your Official Lead Reference
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0B192C', marginTop: 4, letterSpacing: '0.02em' }}>
                  {successData.leadNumber}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: 4, fontWeight: 600 }}>
                  Assigned for specialist itinerary preparation
                </div>
              </div>

              {/* Quick WhatsApp Action */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360, margin: '0 auto' }}>
                <a
                  href={`https://wa.me/${COMPANY_BRANDING.phoneRaw}?text=${encodeURIComponent(
                    `Hello New Chirag Tours & Travels desk, I have submitted an online holiday enquiry for ${successData.destinationName} with Reference ${successData.leadNumber}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px 20px',
                    borderRadius: 10,
                    background: '#25D366',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                  }}
                >
                  <MessageCircle size={20} />
                  <span>Connect on WhatsApp Now</span>
                </a>

                <button
                  onClick={onClose}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Input Form */
            <form onSubmit={handleSubmit}>
              {/* Bot Honeypot */}
              <div style={{ position: 'absolute', left: '-9999px', opacity: 0 }}>
                <input
                  type="text"
                  name="website_enquiry_hp"
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
                    marginBottom: 20,
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Personal Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label className="form-label">
                    Full Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Rahul Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">
                    Mobile Number <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    className="form-input"
                    placeholder="10-digit number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Email Address (Optional)</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@example.com (for itinerary PDF)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Destination & Package Selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label className="form-label">
                    Destination <span className="required">*</span>
                  </label>
                  <select
                    required
                    className="form-select"
                    value={destinationId}
                    onChange={(e) => setDestinationId(e.target.value)}
                  >
                    <option value="">Select Circuit / Region</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.country})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Specific Tour Package (Optional)</label>
                  <select
                    className="form-select"
                    value={packageId}
                    onChange={(e) => setPackageId(e.target.value)}
                  >
                    <option value="">Custom Tailored Itinerary</option>
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

              {/* Trip Specs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="form-label">Tentative Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={tentativeTravelDate}
                    onChange={(e) => setTentativeTravelDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Nights</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    className="form-input"
                    value={durationNights === 0 || durationNights === '' ? '' : durationNights}
                    placeholder="3"
                    onChange={(e) => setDurationNights(e.target.value === '' ? '' : Number(e.target.value) || '')}
                  />
                </div>
                <div>
                  <label className="form-label">Adults</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    className="form-input"
                    value={numberOfAdults === 0 ? '' : numberOfAdults}
                    placeholder="2"
                    onChange={(e) => setNumberOfAdults(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="form-label">Children</label>
                  <input
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

              {/* Budget & Notes */}
              <div style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Approximate Budget (₹, Optional)</span>
                  <InfoBadge text="Help us tailor hotel categories and vehicle options to your target budget." />
                </label>
                <input
                  type="number"
                  min={0}
                  className="form-input"
                  placeholder="e.g. 60000"
                  value={budgetEstimate === 0 || budgetEstimate === '' ? '' : budgetEstimate}
                  onChange={(e) => setBudgetEstimate(e.target.value === '' ? '' : Number(e.target.value) || '')}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="form-label">Special Requirements / Travel Preferences</label>
                <textarea
                  rows={3}
                  className="form-textarea"
                  placeholder="Tell us about hotel preferences (4-star / luxury), vehicle needs (Innova / Tempo), dietary requirements, or flight assistance..."
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '12px 20px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-hero-primary"
                  style={{
                    padding: '12px 28px',
                    fontSize: '0.92rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? (
                    <span>Submitting Enquiry...</span>
                  ) : (
                    <>
                      <span>Submit Holiday Enquiry</span>
                      <Send size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
