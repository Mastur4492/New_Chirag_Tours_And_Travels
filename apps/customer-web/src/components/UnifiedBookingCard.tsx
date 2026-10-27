'use client';

import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  MessageCircle,
  Printer,
  Phone,
  Send,
  User,
  Mail,
  RefreshCw,
  ShieldCheck,
  Copy,
  Check,
  Calendar,
  Users,
  Lock,
} from 'lucide-react';

export interface UnifiedBookingCardProps {
  calculation: {
    finalTotal: number;
    perPersonPrice: number;
    roomsCount: number;
    effectiveHotelRate: number;
    days: number;
    gstAmount: number;
    advancePayable: number;
  };
  durationNights: number;
  adults: number;
  children: number;
  circuitName?: string;
  selectedHotel?: {
    name: string;
    city?: string;
  } | null;
  selectedRoom?: {
    name: string;
    price?: number;
  } | null;
  mealPlan: string;
  vehicleLabel: string;
  whatsappUrl: string;
  phoneRaw: string;
  phoneDisplay: string;
  bankDetails: {
    bankName: string;
    branch: string;
    accountName: string;
    accountNumber: string;
    ifsc: string;
    upiId: string;
  };
  customerName: string;
  setCustomerName: (val: string) => void;
  customerMobile: string;
  setCustomerMobile: (val: string) => void;
  customerEmail: string;
  setCustomerEmail: (val: string) => void;
  isSubmitting: boolean;
  submitError: string | null;
  submittedLeadRef: string | null;
  onSubmit: (e: React.FormEvent) => void;
  copiedKey: string | null;
  onCopyText: (text: string, key: string) => void;
  formatINR: (val: number) => string;
}

export default function UnifiedBookingCard({
  calculation,
  durationNights,
  adults,
  children,
  circuitName,
  selectedHotel,
  selectedRoom,
  mealPlan,
  vehicleLabel,
  whatsappUrl,
  phoneRaw,
  phoneDisplay,
  bankDetails,
  customerName,
  setCustomerName,
  customerMobile,
  setCustomerMobile,
  customerEmail,
  setCustomerEmail,
  isSubmitting,
  submitError,
  submittedLeadRef,
  onSubmit,
  copiedKey,
  onCopyText,
  formatINR,
}: UnifiedBookingCardProps) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 24,
        border: '2px solid #059669',
        boxShadow: '0 24px 50px -12px rgba(5, 35, 23, 0.22), 0 0 0 1px rgba(5, 150, 105, 0.15)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. UNIFIED MASTER HEADER BANNER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #052618 0%, #064E3B 55%, #047857 100%)',
          padding: '18px 24px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          borderBottom: '2px solid rgba(52, 211, 153, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'rgba(52, 211, 153, 0.2)',
              border: '1.5px solid rgba(52, 211, 153, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34D399',
            }}
          >
            <Sparkles size={20} color="#FBBF24" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  background: 'rgba(251, 191, 36, 0.2)',
                  color: '#FDE68A',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  padding: '3px 8px',
                  borderRadius: 6,
                }}
              >
                Official Master Booking Console
              </span>
              <span style={{ fontSize: '0.74rem', color: '#A7F3D0', fontWeight: 600 }}>
                ⚡ 100% Rate Lock Guarantee
              </span>
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#FFFFFF', marginTop: 2 }}>
              {circuitName || 'Your Custom Tour Package'}
            </div>
          </div>
        </div>

        {/* Duration & Guests Summary Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            padding: '8px 16px',
            borderRadius: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', color: '#6EE7B7', fontWeight: 800 }}>
            <Calendar size={15} />
            <span>{calculation.days} Days / {durationNights} Nights ({durationNights}N/{calculation.days}D)</span>
          </div>
          <div style={{ width: 1, height: 16, background: 'rgba(255, 255, 255, 0.2)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.80rem', color: '#E2E8F0', fontWeight: 700 }}>
            <Users size={15} color="#A7F3D0" />
            <span>{adults} Adults{children > 0 ? `, ${children} Kids` : ''}</span>
          </div>
        </div>
      </div>

      {/* 2. UNIFIED BODY (LEFT QUOTE PANE + RIGHT BOOKING/BANK PANE) */}
      <div className="unified-booking-grid">
        {/* ================= LEFT PANE: QUOTATION & INCLUSIONS ================= */}
        <div className="unified-booking-left">
          <div>
            {/* Price Header */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: '0.74rem',
                  color: '#6EE7B7',
                  textTransform: 'uppercase',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Sparkles size={14} color="#FBBF24" />
                <span>All-Inclusive Transparent Quote</span>
              </div>

              <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1, marginTop: 4 }}>
                {formatINR(calculation.finalTotal)}
              </div>

              <div style={{ fontSize: '0.90rem', color: '#A7F3D0', marginTop: 4 }}>
                Approx <strong style={{ color: '#FBBF24', fontSize: '1.08rem' }}>{formatINR(calculation.perPersonPrice)}</strong> / person
              </div>

              {selectedHotel && selectedRoom && (
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#E2E8F0',
                    marginTop: 10,
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '6px 12px',
                    borderRadius: 8,
                    display: 'inline-block',
                  }}
                >
                  🏨 <strong>{selectedHotel.name}</strong> • {selectedRoom.name}
                </div>
              )}
            </div>

            {/* Inclusions Breakdown */}
            <div
              style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.14)',
                paddingTop: 16,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  color: '#D1E2DA',
                  marginBottom: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                What is 100% Included:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.84rem', color: '#E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={17} color="#34D399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    <strong>{calculation.roomsCount} Room(s)</strong>: {selectedHotel?.name || 'Selected Hotel'} ({selectedRoom?.name || 'Deluxe Room'} @ {formatINR(calculation.effectiveHotelRate)}/nt)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={17} color="#34D399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    <strong>{mealPlan} Meal Plan:</strong> {mealPlan === 'MAP' ? 'Daily Breakfast & Dinner Included' : 'Daily Breakfast Included'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={17} color="#34D399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    <strong>Dedicated AC Cab:</strong> {vehicleLabel} ({calculation.days} Days Full Sightseeing)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={17} color="#34D399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>All Tolls, Parking, State Permits & Driver Allowances 100% covered</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={17} color="#34D399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>5% GST on Tour Services included ({formatINR(calculation.gstAmount)})</span>
                </div>
              </div>
            </div>

            {/* 25% Advance Lock Banner */}
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.16)',
                border: '1.5px solid rgba(245, 158, 11, 0.45)',
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: '0.84rem',
                color: '#FDE68A',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lock size={16} color="#FBBF24" />
                <span>25% Advance to Lock Allotment:</span>
              </div>
              <strong style={{ color: '#FBBF24', fontSize: '1.08rem' }}>
                {formatINR(calculation.advancePayable)}
              </strong>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '13px 18px',
                borderRadius: 12,
                background: '#25D366',
                color: '#FFFFFF',
                fontSize: '0.94rem',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
                transition: 'transform 0.15s ease',
              }}
            >
              <MessageCircle size={18} />
              <span>Send Quote to WhatsApp (+91 99786 55529)</span>
            </a>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '11px 14px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1.5px solid rgba(255, 255, 255, 0.35)',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Printer size={15} color="#FBBF24" />
                <span>Print / PDF Quote</span>
              </button>

              <a
                href={`tel:${phoneRaw}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '11px 14px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Phone size={14} color="#34D399" />
                <span>Call {phoneDisplay}</span>
              </a>
            </div>
          </div>
        </div>

        {/* ================= RIGHT PANE: BOOKING FORM + VERIFIED BANK LOCK ================= */}
        <div className="unified-booking-right">
          {/* Top Form Section: Confirm Booking */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#059669',
                  }}
                >
                  <Send size={17} />
                </div>
                <div>
                  <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.2 }}>
                    Confirm Booking / Request Official Call
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    Lock your preferred hotel room & cab with Faisal Bikanerwala
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  background: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                  padding: '3px 8px',
                  borderRadius: 6,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                ⚡ 15-Min Response
              </span>
            </div>

            {submittedLeadRef ? (
              <div
                style={{
                  background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                  border: '1.5px solid #6EE7B7',
                  borderRadius: 14,
                  padding: '18px 16px',
                  color: '#065F46',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 900, fontSize: '0.96rem' }}>
                  <CheckCircle2 size={22} color="#059669" />
                  <span>Booking Request Dispatched! Ref: {submittedLeadRef}</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.84rem', color: '#047857', lineHeight: 1.5 }}>
                  Faisal Bikanerwala has received your quotation request and will contact you directly at <strong>{customerMobile}</strong> shortly with your official confirmation!
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {submitError && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '10px 14px', borderRadius: 10, fontSize: '0.80rem', color: '#991B1B' }}>
                    {submitError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Your Full Name *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex' }}>
                        <User size={15} />
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 36px',
                          borderRadius: 10,
                          border: '1.5px solid #CBD5E1',
                          fontSize: '0.86rem',
                          color: '#0F172A',
                          background: '#F8FAFC',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'all 0.2s ease',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#059669';
                          e.currentTarget.style.background = '#FFFFFF';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#CBD5E1';
                          e.currentTarget.style.background = '#F8FAFC';
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      WhatsApp / Mobile *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex' }}>
                        <Phone size={15} />
                      </div>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        required
                        value={customerMobile}
                        onChange={(e) => setCustomerMobile(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 36px',
                          borderRadius: 10,
                          border: '1.5px solid #CBD5E1',
                          fontSize: '0.86rem',
                          color: '#0F172A',
                          background: '#F8FAFC',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'all 0.2s ease',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#059669';
                          e.currentTarget.style.background = '#FFFFFF';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#CBD5E1';
                          e.currentTarget.style.background = '#F8FAFC';
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Email Address (Optional for PDF quotation)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex' }}>
                      <Mail size={15} />
                    </div>
                    <input
                      type="email"
                      placeholder="e.g. name@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 36px',
                        borderRadius: 10,
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.86rem',
                        color: '#0F172A',
                        background: '#F8FAFC',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#059669';
                        e.currentTarget.style.background = '#FFFFFF';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.background = '#F8FAFC';
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px 18px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.94rem',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: 2,
                    boxShadow: '0 6px 18px rgba(5, 150, 105, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSubmitting ? <RefreshCw size={17} className="animate-spin" /> : <Send size={17} />}
                  <span>Submit Request to Travel Desk</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: '0.72rem', color: '#64748B', flexWrap: 'wrap' }}>
                  <span>🔒 100% Rate Guarantee</span>
                  <span>•</span>
                  <span>⚡ Verified Allotment</span>
                  <span>•</span>
                  <span>Zero Spam Call Policy</span>
                </div>
              </form>
            )}
          </div>

          {/* Integrated Bottom Section: Official Bank Lock Details */}
          <div
            style={{
              background: 'linear-gradient(135deg, #F0FDF4 0%, #F8FAFC 100%)',
              borderRadius: 16,
              border: '1.5px solid #A7F3D0',
              padding: '16px 18px',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: '#059669',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '0.80rem', fontWeight: 900, color: '#064E3B', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    Official Bank Lock Account
                  </div>
                  <div style={{ fontSize: '0.70rem', color: '#047857' }}>
                    Transfer 25% Advance ({formatINR(calculation.advancePayable)}) for immediate allotment
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Bank:</div>
                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.78rem' }}>
                  {bankDetails.bankName} <span style={{ fontWeight: 500, color: '#64748B' }}>({bankDetails.branch})</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Beneficiary:</div>
                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.78rem' }}>
                  {bankDetails.accountName}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Current A/C</div>
                  <div style={{ fontWeight: 900, color: '#0F172A', fontFamily: 'monospace', fontSize: '0.86rem', letterSpacing: '0.03em' }}>
                    {bankDetails.accountNumber}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onCopyText(bankDetails.accountNumber, 'acc')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: copiedKey === 'acc' ? '#ECFDF5' : '#F1F5F9',
                    border: copiedKey === 'acc' ? '1px solid #059669' : '1px solid #CBD5E1',
                    color: copiedKey === 'acc' ? '#047857' : '#334155',
                    fontSize: '0.70rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {copiedKey === 'acc' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedKey === 'acc' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div>
                    <div style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>IFSC</div>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', fontSize: '0.78rem' }}>{bankDetails.ifsc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCopyText(bankDetails.ifsc, 'ifsc')}
                    style={{
                      padding: '3px 6px',
                      borderRadius: 6,
                      background: copiedKey === 'ifsc' ? '#ECFDF5' : '#F1F5F9',
                      border: copiedKey === 'ifsc' ? '1px solid #059669' : '1px solid #CBD5E1',
                      color: copiedKey === 'ifsc' ? '#047857' : '#334155',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedKey === 'ifsc' ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <div>
                    <div style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>UPI ID</div>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace', fontSize: '0.78rem' }}>{bankDetails.upiId}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCopyText(bankDetails.upiId, 'upi')}
                    style={{
                      padding: '3px 6px',
                      borderRadius: 6,
                      background: copiedKey === 'upi' ? '#ECFDF5' : '#F1F5F9',
                      border: copiedKey === 'upi' ? '1px solid #059669' : '1px solid #CBD5E1',
                      color: copiedKey === 'upi' ? '#047857' : '#334155',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedKey === 'upi' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 8, padding: '6px 10px', background: '#ECFDF5', borderRadius: 6, border: '1px dashed #A7F3D0', fontSize: '0.70rem', color: '#065F46' }}>
              💡 <strong>Quick Step:</strong> Share advance transfer receipt on WhatsApp (+91 99786 55529) for immediate official booking voucher.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
