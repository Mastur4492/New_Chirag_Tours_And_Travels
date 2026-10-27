'use client';

import React from 'react';
import { Star, ShieldCheck, Car } from 'lucide-react';
import { COMPANY_BRANDING } from '@/lib/branding';

export function HomeHero() {
  return (
    <section
      style={{
        position: 'relative',
        backgroundImage: `linear-gradient(180deg, rgba(4, 20, 13, 0.78) 0%, rgba(6, 35, 23, 0.82) 55%, rgba(4, 20, 13, 0.94) 100%), url('/images/hero/travel-hero-bg.jpg')`,
        backgroundPosition: 'center 40%',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        color: '#FFFFFF',
        padding: '48px 0 44px',
        borderBottom: '3px solid var(--emerald-400)',
        overflow: 'hidden',
        boxShadow: 'inset 0 -20px 40px rgba(0,0,0,0.4)',
      }}
      className="no-print"
    >
      <div className="container" style={{ textAlign: 'center', maxWidth: 880, position: 'relative', zIndex: 2 }}>
        {/* Trust Chips Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(245, 158, 11, 0.45)',
              padding: '5px 14px',
              borderRadius: 9999,
              fontSize: '0.78rem',
              color: '#FBBF24',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            }}
          >
            <Star size={13} fill="#FBBF24" color="#FBBF24" />
            <span>5.0 Google Rating ({COMPANY_BRANDING.googleRating.reviewsCount}+ Reviews)</span>
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(52, 211, 153, 0.45)',
              padding: '5px 14px',
              borderRadius: 9999,
              fontSize: '0.78rem',
              color: '#34D399',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            }}
          >
            <ShieldCheck size={14} color="#34D399" />
            <span>Direct Hotel Allotments & Vouchers</span>
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '5px 14px',
              borderRadius: 9999,
              fontSize: '0.78rem',
              color: '#E2E8F0',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            }}
          >
            <Car size={13} color="#60A5FA" />
            <span>Private Dedicated AC Fleet</span>
          </span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(1.75rem, 4.5vw, 2.55rem)',
            fontWeight: 900,
            color: '#FFFFFF',
            margin: '0 0 12px',
            lineHeight: 1.2,
            textShadow: '0 3px 16px rgba(0, 0, 0, 0.6)',
            letterSpacing: '-0.02em',
          }}
        >
          Plan Your Holiday & <span style={{ color: '#34D399', textShadow: '0 2px 14px rgba(52, 211, 153, 0.45)' }}>Make Your Instant Quotation</span>
        </h1>

        <p
          style={{
            fontSize: '1.02rem',
            color: '#E2E8F0',
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 760,
            marginInline: 'auto',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.55)',
          }}
        >
          <strong style={{ color: '#34D399' }}>Step 1:</strong> Choose your state below • <strong style={{ color: '#34D399' }}>Step 2:</strong> Customize your days, hotel comfort, and private car to generate your official PDF quotation in seconds.
        </p>
      </div>
    </section>
  );
}
