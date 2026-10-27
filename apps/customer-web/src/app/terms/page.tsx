import React from 'react';
import Link from 'next/link';
import { FileText, ShieldAlert, ArrowLeft } from 'lucide-react';
import { COMPANY_BRANDING } from '@/lib/branding';

export const metadata = {
  title: `Terms & Conditions — ${COMPANY_BRANDING.name}`,
  description: `Official terms of service and booking request policies for ${COMPANY_BRANDING.name}.`,
};

export default function TermsPage() {
  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, var(--pine-950) 0%, var(--pine-900) 50%, var(--pine-850) 100%)', color: '#FFFFFF', padding: '64px 0', borderBottom: '3px solid var(--emerald-400)' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: 700 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6EE7B7', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            <FileText size={16} />
            <span>Customer Terms</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#FFFFFF', marginBottom: 12 }}>
            Terms & Conditions of Service
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#D1E2DA' }}>
            Effective for all holiday proposals, customized bookings, and transport reservations with {COMPANY_BRANDING.name}.
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: 48 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', background: '#FFFFFF', padding: 36, borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontSize: '0.92rem', color: '#334155', lineHeight: 1.7 }}>
            <section>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B192C', marginBottom: 8 }}>
                1. Quotation Proposals & Booking Requests
              </h2>
              <p>
                Accepting an online quotation proposal through the customer web portal creates an official booking request with our travel desk. Due to real-time hotel allotment dynamics and seasonal variations, confirmation is subject to hotel inventory verification and receipt of agreed tour advances.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B192C', marginBottom: 8 }}>
                2. Price Inclusions & Taxes
              </h2>
              <p>
                All final selling prices presented in verified customer proposals are comprehensive of applicable taxes (GST) and quoted services (e.g. hotel room category, designated meal plan, toll, parking, and driver allowances) as itemized in the proposal inclusions. Any personal expenses, optional adventure activities, monument entry fees, or unlisted meals remain payable directly by the traveler.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B192C', marginBottom: 8 }}>
                3. Payment Schedule & Advances
              </h2>
              <p>
                Tour bookings require an initial confirmation advance to lock hotel rooms and schedule dedicated transport. The exact advance percentage, payment schedule, and bank transfer details are provided in your formal travel confirmation document.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B192C', marginBottom: 8 }}>
                4. Cancellation & Modification Policies
              </h2>
              <p>
                Cancellation charges depend upon the policies of individual contracted hotels and vehicle vendors, as well as the proximity of cancellation to the scheduled date of travel. You may request modifications or adjustments directly through the proposal link or by contacting our operations desk.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B192C', marginBottom: 8 }}>
                5. Jurisdiction & Governance
              </h2>
              <p>
                All operations and contracts are executed under the management of {COMPANY_BRANDING.owner}, {COMPANY_BRANDING.name}, located in Danilimda, Ahmedabad, Gujarat, and subject to the jurisdiction of courts in Ahmedabad.
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
