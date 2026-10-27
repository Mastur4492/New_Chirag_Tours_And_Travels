import React from 'react';
import Link from 'next/link';
import { MapPin, Phone, Mail, Clock, MessageCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { COMPANY_BRANDING } from '@/lib/branding';

export const metadata = {
  title: `Contact Us — ${COMPANY_BRANDING.name}`,
  description: `Contact ${COMPANY_BRANDING.name} in Danilimda, Ahmedabad. Phone: ${COMPANY_BRANDING.phoneDisplay}, Email: ${COMPANY_BRANDING.email}.`,
};

export default function ContactPage() {
  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, var(--pine-950) 0%, var(--pine-900) 50%, var(--pine-850) 100%)', color: '#FFFFFF', padding: '64px 0', borderBottom: '3px solid var(--emerald-400)' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: 700 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6EE7B7', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            <Phone size={16} />
            <span>Travel Desk Assistance</span>
          </div>
          <h1 style={{ fontSize: '2.6rem', fontWeight: 900, color: '#FFFFFF', marginBottom: 14 }}>
            Contact Our Travel Desk
          </h1>
          <p style={{ fontSize: '1rem', color: '#D1E2DA', lineHeight: 1.6 }}>
            Visit our Danilimda office in Ahmedabad, call us directly, or send an online enquiry.
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: 56 }}>
        <div style={{ maxWidth: 840, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          {/* Office Details Card */}
          <div style={{ background: '#FFFFFF', padding: 36, borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0B192C', marginBottom: 20 }}>
              Ahmedabad Office
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontSize: '0.92rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <MapPin size={22} color="#D4AF37" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Office Address</div>
                  <div style={{ color: '#475569', lineHeight: 1.5 }}>{COMPANY_BRANDING.fullAddress}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Phone size={20} color="#D4AF37" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Phone & Mobile</div>
                  <a href={`tel:${COMPANY_BRANDING.phoneRaw}`} style={{ color: '#0B192C', fontWeight: 700 }}>
                    {COMPANY_BRANDING.phoneDisplay}
                  </a>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 2 }}>Direct line to Faisal Bikanerwala</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Mail size={20} color="#D4AF37" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Official Email</div>
                  <a href={`mailto:${COMPANY_BRANDING.email}`} style={{ color: '#475569' }}>
                    {COMPANY_BRANDING.email}
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Clock size={20} color="#D4AF37" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Operating Hours</div>
                  <div style={{ color: '#475569' }}>{COMPANY_BRANDING.hours}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Connect & Enquire Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: '#FFFFFF', padding: 32, borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B192C', marginBottom: 10 }}>
                Instant WhatsApp Assistance
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.6, marginBottom: 20 }}>
                Chat directly with our holiday desk to ask about current season package rates, room availability, or car rental packages.
              </p>
              <a
                href={COMPANY_BRANDING.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
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
                <MessageCircle size={20} />
                <span>Open WhatsApp Chat</span>
              </a>
            </div>

            <div style={{ background: 'linear-gradient(135deg, var(--pine-950) 0%, var(--pine-900) 50%, var(--pine-850) 100%)', padding: 32, borderRadius: 20, border: '2px solid var(--emerald-400)', color: '#FFFFFF' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', marginBottom: 8 }}>
                Submit Custom Trip Request
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#D1E2DA', lineHeight: 1.5, marginBottom: 20 }}>
                Have specific dates and requirements? Submit our 2-minute enquiry form for an itemized proposal.
              </p>
              <Link href="/enquiry" className="btn-hero-primary" style={{ display: 'inline-flex' }}>
                <span>Fill Travel Enquiry</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
