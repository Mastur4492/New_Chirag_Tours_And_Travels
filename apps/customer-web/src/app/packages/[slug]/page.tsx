'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Phone,
  ShieldCheck,
  Send,
  Building,
  Car,
} from 'lucide-react';
import { customerApi } from '@/lib/api';
import { TourPackageDto } from '@chirag/types';
import { COMPANY_BRANDING } from '@/lib/branding';
import { EnquiryModal } from '@/components/EnquiryModal';
import { formatDisplayTitle, formatINR, getDestinationStyle } from '@/lib/utils';

export default function PackageDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [pkg, setPkg] = useState<TourPackageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accordion state: open all by default or toggle
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({ 1: true });

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await customerApi.getPackageBySlug(slug);
        setPkg(data);
        // Open all days by default
        if (data.dayWiseItinerary) {
          const initialMap: Record<number, boolean> = {};
          data.dayWiseItinerary.forEach((d) => {
            initialMap[d.dayNumber] = true;
          });
          setOpenDays(initialMap);
        }
      } catch (err: any) {
        setError(err.message || 'Tour package not found.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const toggleDay = (dayNum: number) => {
    setOpenDays((prev) => ({
      ...prev,
      [dayNum]: !prev[dayNum],
    }));
  };

  const formatCurrency = (amt?: number) => {
    if (!amt) return null;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, border: '3px solid #CBD5E1', borderTopColor: '#0B192C', borderRadius: '50%', margin: '0 auto 16px' }} />
          <p style={{ color: '#64748B' }}>Loading package details...</p>
        </div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 460, margin: '0 auto', background: '#FFFFFF', padding: 36, borderRadius: 16, border: '1px solid #E2E8F0' }}>
          <AlertTriangle size={36} color="#E11D48" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.4rem', color: '#0F172A', fontWeight: 800 }}>Package Unavailable</h2>
          <p style={{ color: '#64748B', marginTop: 8, fontSize: '0.9rem' }}>
            {error || 'This tour package is currently in draft or has been updated.'}
          </p>
          <Link href="/packages" className="btn-gold" style={{ marginTop: 24, display: 'inline-flex' }}>
            <span>Browse All Available Packages</span>
          </Link>
        </div>
      </div>
    );
  }

  const formattedPrice = formatINR(pkg.startingPrice);
  const cleanTitle = formatDisplayTitle(pkg.title);
  const cleanDestName = formatDisplayTitle(pkg.destinationName);
  const destStyle = getDestinationStyle(pkg.destinationName || pkg.title);

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Package Header Banner with Photographic Backdrop */}
      <div
        style={{
          position: 'relative',
          background: `linear-gradient(rgba(4, 20, 13, 0.82), rgba(6, 35, 23, 0.94)), url(${destStyle.image}) center/cover no-repeat`,
          color: '#FFFFFF',
          padding: '72px 0 64px',
          borderBottom: '3px solid var(--emerald-400)',
          overflow: 'hidden',
        }}
      >
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
            <div style={{ maxWidth: 760 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(52, 211, 153, 0.4)',
                  padding: '5px 12px',
                  borderRadius: 9999,
                  color: '#6EE7B7',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 14,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <MapPin size={14} />
                <span>{cleanDestName || 'Holiday Circuit'}</span>
              </div>
              <h1 style={{ fontSize: '2.8rem', fontWeight: 900, color: '#FFFFFF', marginBottom: 14, lineHeight: 1.2 }}>
                {cleanTitle}
              </h1>
              {pkg.overview && (
                <p style={{ fontSize: '1.05rem', color: '#D1E2DA', lineHeight: 1.6, marginBottom: 20 }}>
                  {pkg.overview}
                </p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', fontSize: '0.9rem', color: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={18} color="#34D399" />
                  <span><strong>{pkg.durationNights}</strong> Nights / <strong>{pkg.durationDays}</strong> Days</span>
                </div>
                {pkg.dayWiseItinerary && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={18} color="#34D399" />
                    <span><strong>{pkg.dayWiseItinerary.length}</strong> Days Day-by-Day Itinerary</span>
                  </div>
                )}
              </div>
            </div>

            {/* Price & Action Widget */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
                border: '1.5px solid rgba(52, 211, 153, 0.4)',
                padding: '24px 28px',
                borderRadius: 20,
                textAlign: 'right',
                minWidth: 260,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#D1E2DA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {pkg.startingPrice ? 'Starting Price' : 'Holiday Cost'}
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#34D399', marginTop: 4 }}>
                {formattedPrice}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#A7F3D0', marginTop: 2, marginBottom: 18 }}>
                {pkg.startingPrice ? 'Per person, hotel + transfers' : 'Tailored to your dates'}
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-hero-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>Enquire Now</span>
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="container" style={{ marginTop: 48 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 36 }}>
          {/* Left Column: Itinerary, Inclusions, Terms */}
          <div>
            {/* Day Wise Itinerary */}
            {pkg.dayWiseItinerary && pkg.dayWiseItinerary.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0B192C', marginBottom: 20 }}>
                  Detailed Day-Wise Itinerary
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {pkg.dayWiseItinerary.map((day) => {
                    const isOpen = Boolean(openDays[day.dayNumber]);
                    return (
                      <div
                        key={day.dayNumber}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: 14,
                          border: '1px solid #E2E8F0',
                          overflow: 'hidden',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleDay(day.dayNumber)}
                          style={{
                            width: '100%',
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: isOpen ? '#F8FAFC' : '#FFFFFF',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderBottom: isOpen ? '1px solid #E2E8F0' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span
                              style={{
                                background: '#0B192C',
                                color: '#F6DC7D',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                padding: '4px 10px',
                                borderRadius: 6,
                              }}
                            >
                              Day {day.dayNumber}
                            </span>
                            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>
                              {day.title}
                            </span>
                          </div>
                          {isOpen ? <ChevronUp size={20} color="#64748B" /> : <ChevronDown size={20} color="#64748B" />}
                        </button>

                        {isOpen && (
                          <div style={{ padding: '20px', fontSize: '0.92rem', color: '#334155', lineHeight: 1.6 }}>
                            <p style={{ margin: 0, marginBottom: 14 }}>{day.description}</p>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: '0.82rem', color: '#64748B', paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
                              {day.nightStayDestination && (
                                <div>
                                  Night Stay: <strong>{day.nightStayDestination}</strong>
                                </div>
                              )}
                              {day.mealsIncluded && day.mealsIncluded.length > 0 && (
                                <div>
                                  Meals: <strong>{day.mealsIncluded.join(', ')}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inclusions & Exclusions */}
            <div style={{ background: '#FFFFFF', padding: 28, borderRadius: 16, border: '1px solid #E2E8F0', marginBottom: 40 }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0B192C', marginBottom: 18 }}>
                What&apos;s Included & Excluded
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {pkg.inclusions && pkg.inclusions.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={16} />
                      <span>Included in Package</span>
                    </h4>
                    <ul style={{ paddingLeft: 18, fontSize: '0.86rem', color: '#334155', lineHeight: 1.7 }}>
                      {pkg.inclusions.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {pkg.exclusions && pkg.exclusions.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#E11D48', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <XCircle size={16} />
                      <span>Not Included</span>
                    </h4>
                    <ul style={{ paddingLeft: 18, fontSize: '0.86rem', color: '#64748B', lineHeight: 1.7 }}>
                      {pkg.exclusions.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Important Terms */}
            {pkg.termsAndConditions && pkg.termsAndConditions.length > 0 && (
              <div style={{ background: '#FFFFFF', padding: 28, borderRadius: 16, border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0B192C', marginBottom: 14 }}>
                  Terms & Booking Notes
                </h3>
                <ul style={{ paddingLeft: 18, fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                  {pkg.termsAndConditions.map((t, idx) => (
                    <li key={idx} style={{ marginBottom: 6 }}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Desk Card & Fast Enquiry CTA */}
          <div>
            <div style={{ position: 'sticky', top: 100, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: '#FFFFFF', padding: 28, borderRadius: 20, border: '1.5px solid var(--emerald-400)', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <img
                    src={COMPANY_BRANDING.logos.main}
                    alt={COMPANY_BRANDING.name}
                    style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'contain', background: '#FFFFFF', padding: 3, border: '1px solid #E2E8F0' }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0B192C' }}>New Chirag Travel Desk</div>
                    <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>Direct Agency Support</div>
                  </div>
                </div>

                <p style={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.5, marginBottom: 20 }}>
                  Need adjustments to this itinerary? We can customize hotel star categories, vehicle types, or travel dates to fit your family.
                </p>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn-card-action"
                  style={{ width: '100%', justifyContent: 'center', marginBottom: 12, padding: '12px 18px', fontSize: '0.9rem' }}
                >
                  <span>Enquire For This Package</span>
                  <ArrowRight size={16} />
                </button>

                <a
                  href={`https://wa.me/${COMPANY_BRANDING.phoneRaw}?text=${encodeURIComponent(
                    `Hello New Chirag Tours & Travels, I am interested in "${pkg.title}" (${pkg.durationNights}N/${pkg.durationDays}D). Please share quotation details.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    borderRadius: 8,
                    background: '#25D366',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                  }}
                >
                  <span>WhatsApp Inquiry</span>
                </a>

                <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 18, paddingTop: 14, textAlign: 'center', fontSize: '0.8rem', color: '#64748B' }}>
                  Speak to <strong>{COMPANY_BRANDING.owner}</strong>: <br />
                  <a href={`tel:${COMPANY_BRANDING.phoneRaw}`} style={{ color: '#0B192C', fontWeight: 700 }}>
                    {COMPANY_BRANDING.phoneDisplay}
                  </a>
                </div>
              </div>

              {/* Guarantees Box */}
              <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 14, border: '1px solid #E2E8F0', fontSize: '0.84rem' }}>
                <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={18} color="#0F766E" />
                  <span>The New Chirag Guarantee</span>
                </div>
                <div style={{ color: '#64748B', lineHeight: 1.5 }}>
                  ✓ Transparent pricing with zero hidden surcharges<br />
                  ✓ All taxes & quoted services explicitly declared<br />
                  ✓ Verified hotel vouchers issued prior to travel
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EnquiryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialDestinationId={pkg.destinationId}
        initialPackageId={pkg.id}
        destinationName={pkg.destinationName}
        packageName={pkg.title}
      />
    </div>
  );
}
