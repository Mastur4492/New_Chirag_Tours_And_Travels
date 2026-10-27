import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Compass, Users, MapPin, Award, CheckCircle2, ArrowRight } from 'lucide-react';
import { COMPANY_BRANDING } from '@/lib/branding';

export const metadata = {
  title: `About Us — ${COMPANY_BRANDING.name}`,
  description: `Learn about ${COMPANY_BRANDING.name}, managed by ${COMPANY_BRANDING.owner} in Ahmedabad. Specialized domestic and international holiday planning.`,
};

export default function AboutPage() {
  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, var(--pine-950) 0%, var(--pine-900) 50%, var(--pine-850) 100%)', color: '#FFFFFF', padding: '64px 0', borderBottom: '3px solid var(--emerald-400)' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: 700 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6EE7B7', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            <Compass size={16} />
            <span>Company Profile</span>
          </div>
          <h1 style={{ fontSize: '2.6rem', fontWeight: 900, color: '#FFFFFF', marginBottom: 14 }}>
            About {COMPANY_BRANDING.name}
          </h1>
          <p style={{ fontSize: '1rem', color: '#D1E2DA', lineHeight: 1.6 }}>
            Ahmedabad&apos;s trusted travel management desk, founded and operated by {COMPANY_BRANDING.owner}.
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: 56 }}>
        <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>
          {/* Main Story */}
          <div style={{ background: '#FFFFFF', padding: 36, borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0B192C', marginBottom: 16 }}>
              Our Story & Commitment
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>
              <strong>{COMPANY_BRANDING.name}</strong> was established with a singular vision: to eliminate the ambiguity and hidden surcharges prevalent in packaged travel by providing fully transparent, personalized holiday experiences.
            </p>
            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>
              Headquartered in Danilimda, Ahmedabad, our team is personally led by <strong>{COMPANY_BRANDING.owner}</strong>. We oversee every client itinerary from initial consultation to final hotel voucher generation and on-ground chauffeur dispatch.
            </p>
            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.7 }}>
              Whether you are planning a family vacation to Kashmir, a honeymoon in Kerala, a desert retreat in Rajasthan, or an overseas holiday, we negotiate directly with property owners and fleet operators to give you the highest value and peace of mind.
            </p>
          </div>

          {/* Pillars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            <div style={{ background: '#FFFFFF', padding: 28, borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#FFFDF5', color: '#D4AF37', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <ShieldCheck size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0B192C', marginBottom: 8 }}>
                Contracted Room Allotments
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5 }}>
                We avoid speculative third-party bookings. Our accommodations are secured directly with verified hospitality partners.
              </p>
            </div>

            <div style={{ background: '#FFFFFF', padding: 28, borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#F0FDFA', color: '#0F766E', border: '1px solid #99F6E4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Users size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0B192C', marginBottom: 8 }}>
                Founder Direct Oversight
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5 }}>
                Each booking is reviewed by managing director Faisal Bikanerwala, guaranteeing consistent quality and escalation resolution.
              </p>
            </div>

            <div style={{ background: '#FFFFFF', padding: 28, borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <CheckCircle2 size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0B192C', marginBottom: 8 }}>
                All-Inclusive Quotations
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5 }}>
                Our customer quotations explicitly detail toll, parking, driver allowances, GST, and room meal plans upfront.
              </p>
            </div>
          </div>

          {/* CTA Box */}
          <div style={{ background: 'linear-gradient(135deg, var(--pine-950) 0%, var(--pine-900) 50%, var(--pine-850) 100%)', padding: 36, borderRadius: 20, border: '2px solid var(--emerald-400)', textAlign: 'center', color: '#FFFFFF' }}>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF', marginBottom: 10 }}>
              Let&apos;s Design Your Next Journey
            </h3>
            <p style={{ fontSize: '0.95rem', color: '#D1E2DA', marginBottom: 24, maxWidth: 520, marginInline: 'auto' }}>
              Contact our travel desk or submit your holiday details online to receive a complimentary custom itinerary.
            </p>
            <Link href="/enquiry" className="btn-hero-primary" style={{ display: 'inline-flex' }}>
              <span>Start Planning Your Trip</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
