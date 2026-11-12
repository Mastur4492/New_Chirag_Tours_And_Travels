'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Phone, MessageCircle, Menu, X } from 'lucide-react';
import { COMPANY_BRANDING } from '@/lib/branding';

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Clean, focused navigation without duplicate 'Build Quote'
  const navItems = [
    { label: 'Destinations', href: '/destinations' },
    { label: 'Tour Packages', href: '/packages' },
    { label: 'Custom Enquiry', href: '/enquiry' },
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <header className="site-header">
      <div className="container">
        <div className="site-header-inner">
          {/* Logo & Brand Identity */}
          <Link href="/" className="brand-badge" onClick={() => setMobileMenuOpen(false)}>
            <div className="brand-badge-img-wrap" style={{ width: 46, height: 46, minWidth: 46, minHeight: 46, padding: 3, borderRadius: 10, overflow: 'hidden', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <img
                src={COMPANY_BRANDING.logos.main}
                alt={COMPANY_BRANDING.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            </div>
            <div className="brand-badge-text">
              <div className="brand-title">{COMPANY_BRANDING.name}</div>
              <div className="brand-subtitle">Ahmedabad • Verified Travel Desk</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="nav-links" aria-label="Main Navigation">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Header Action Buttons */}
          <div className="header-actions">
            <a
              href={`tel:${COMPANY_BRANDING.phoneRaw}`}
              className="btn-header-call"
              title="Direct Call to New Chirag Tours and Travels"
            >
              <Phone size={14} color="#34D399" />
              <span className="btn-call-text">{COMPANY_BRANDING.phoneDisplay}</span>
            </a>

            <a
              href={COMPANY_BRANDING.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-header-whatsapp"
              title="Chat with Faisal Bikanerwala on WhatsApp"
            >
              <MessageCircle size={15} />
              <span>WhatsApp</span>
            </a>

            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div
            style={{
              padding: '16px 0 24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: '0.96rem',
                fontWeight: 600,
                color: pathname === '/' ? '#34D399' : '#E2E8F0',
                padding: '4px 0',
              }}
            >
              Home
            </Link>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontSize: '0.96rem',
                  fontWeight: 600,
                  color: pathname === item.href ? '#34D399' : '#E2E8F0',
                  padding: '4px 0',
                }}
              >
                {item.label}
              </Link>
            ))}
            <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href={COMPANY_BRANDING.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 18px',
                  borderRadius: 9999,
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

              <a
                href={`tel:${COMPANY_BRANDING.phoneRaw}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 18px',
                  borderRadius: 9999,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                }}
              >
                <Phone size={16} color="#34D399" />
                <span>Call {COMPANY_BRANDING.phoneDisplay}</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
