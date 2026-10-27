import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { COMPANY_BRANDING } from '@/lib/branding';

export const metadata = {
  title: `Privacy Policy — ${COMPANY_BRANDING.name}`,
  description: `Privacy policy and customer data handling standards for ${COMPANY_BRANDING.name}.`,
};

export default function PrivacyPage() {
  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, var(--pine-950) 0%, var(--pine-900) 50%, var(--pine-850) 100%)', color: '#FFFFFF', padding: '64px 0', borderBottom: '3px solid var(--emerald-400)' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: 700 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6EE7B7', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            <ShieldCheck size={16} />
            <span>Data Protection</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#FFFFFF', marginBottom: 12 }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#D1E2DA' }}>
            How {COMPANY_BRANDING.name} collects, protects, and uses customer information.
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: 48 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', background: '#FFFFFF', padding: 36, borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontSize: '0.92rem', color: '#334155', lineHeight: 1.7 }}>
            <section>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B192C', marginBottom: 8 }}>
                1. Information We Collect
              </h2>
              <p>
                When you submit an enquiry or view a quotation proposal on our customer portal, we collect personal contact details provided by you, such as your full name, telephone/mobile number, email address, and travel preferences (dates, party size, and special requirements).
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B192C', marginBottom: 8 }}>
                2. Purpose of Collection
              </h2>
              <p>
                We use your details exclusively for the preparation and transmission of holiday quotation proposals, reservation coordination with contracted hotels and tourist vehicle partners, and issuing official vouchers and receipts.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B192C', marginBottom: 8 }}>
                3. Confidentiality & Third-Party Disclosure
              </h2>
              <p>
                We do not sell, rent, barter, or distribute your personal contact information to third-party telemarketers or external advertisers. Traveler names and room requirements are shared solely with the specific hotels and transport drivers assigned to fulfill your confirmed travel itinerary.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B192C', marginBottom: 8 }}>
                4. Data Security & Contact
              </h2>
              <p>
                All information is securely stored within our private CRM database with role-based access limits. For any questions regarding your data or to request removal from our contact list, contact {COMPANY_BRANDING.owner} at {COMPANY_BRANDING.email} or call {COMPANY_BRANDING.phoneDisplay}.
              </p>
            </section>
          </div>

          <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid #F1F5F9' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0B192C', fontWeight: 700, fontSize: '0.88rem' }}>
              <ArrowLeft size={16} />
              <span>Return to Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
