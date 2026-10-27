import React from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin, Clock, ShieldCheck, MessageCircle } from 'lucide-react';
import { COMPANY_BRANDING } from '@/lib/branding';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Column 1: Brand & Managing Director */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 50, height: 50, borderRadius: 12, background: '#ffffff', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img
                  src={COMPANY_BRANDING.logos.main}
                  alt={COMPANY_BRANDING.name}
                  style={{ height: '100%', width: '100%', borderRadius: 8, objectFit: 'contain' }}
                />
              </div>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--white)' }}>
                {COMPANY_BRANDING.name}
              </span>
            </div>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: '#d1e2da', marginBottom: 20 }}>
              Tailored domestic and international holiday experiences backed by guaranteed bookings, verified transport partners, and personalized support.
            </p>
            <div style={{ fontSize: '0.82rem', color: 'var(--emerald-300)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} />
              <span>Founded & Managed by <strong>{COMPANY_BRANDING.owner}</strong></span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="footer-links">
              <li><Link href="/" className="footer-link">Home</Link></li>
              <li><Link href="/destinations" className="footer-link">Destinations</Link></li>
              <li><Link href="/packages" className="footer-link">Holiday Packages</Link></li>
              <li><Link href="/enquiry" className="footer-link">Custom Travel Enquiry</Link></li>
              <li><Link href="/about" className="footer-link">About Our Company</Link></li>
              <li><Link href="/contact" className="footer-link">Office & Contact</Link></li>
            </ul>
          </div>

          {/* Column 3: Services */}
          <div>
            <h4 className="footer-heading">Specialized Services</h4>
            <ul className="footer-links">
              {COMPANY_BRANDING.services.slice(0, 6).map((service, idx) => (
                <li key={idx} className="footer-link" style={{ cursor: 'default' }}>
                  {service}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact & Office */}
          <div>
            <h4 className="footer-heading">Contact Travel Desk</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.86rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <MapPin size={18} color="var(--emerald-400)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{COMPANY_BRANDING.fullAddress}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Phone size={16} color="var(--emerald-400)" style={{ flexShrink: 0 }} />
                <a href={`tel:${COMPANY_BRANDING.phoneRaw}`} style={{ color: 'var(--white)', fontWeight: 600 }}>
                  {COMPANY_BRANDING.phoneDisplay}
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Mail size={16} color="var(--emerald-400)" style={{ flexShrink: 0 }} />
                <a href={`mailto:${COMPANY_BRANDING.email}`} style={{ color: '#d1e2da' }}>
                  {COMPANY_BRANDING.email}
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={16} color="var(--emerald-400)" style={{ flexShrink: 0 }} />
                <span>{COMPANY_BRANDING.hours}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <div>
            © {currentYear} {COMPANY_BRANDING.name}. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link href="/terms" className="footer-link">Terms & Conditions</Link>
            <Link href="/privacy" className="footer-link">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
