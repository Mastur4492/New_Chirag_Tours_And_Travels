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
    extraBedsCount?: number;
    extraBedRate?: number;
    totalExtraBedCost?: number;
    effectiveHotelRate: number;
    days: number;
    gstAmount: number;
    advancePayable: number;
    advancePercentage?: number;
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
  const [showBankDetails, setShowBankDetails] = React.useState(false);
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 24,
        border: '1.5px solid #10B981',
        boxShadow: '0 20px 45px -10px rgba(5, 35, 23, 0.18)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. CLEAN HEADER BANNER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #052618 0%, #064E3B 60%, #047857 100%)',
          padding: '18px 24px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          borderBottom: '1.5px solid rgba(52, 211, 153, 0.3)',
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
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  background: 'rgba(251, 191, 36, 0.18)',
                  color: '#FDE68A',
                  border: '1px solid rgba(251, 191, 36, 0.35)',
                  padding: '3px 8px',
                  borderRadius: 6,
                }}
              >
                Instant Quotation
              </span>
              <span style={{ fontSize: '0.74rem', color: '#A7F3D0', fontWeight: 600 }}>
                100% Rate Lock Guarantee
              </span>
            </div>
            <div style={{ fontSize: '1.18rem', fontWeight: 900, color: '#FFFFFF', marginTop: 3 }}>
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
            background: 'rgba(0, 0, 0, 0.28)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            padding: '8px 16px',
            borderRadius: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', color: '#6EE7B7', fontWeight: 800 }}>
            <Calendar size={15} />
            <span>{durationNights} Nights / {calculation.days} Days</span>
          </div>
          <div style={{ width: 1, height: 16, background: 'rgba(255, 255, 255, 0.2)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.80rem', color: '#E2E8F0', fontWeight: 700 }}>
            <Users size={15} color="#A7F3D0" />
            <span>{adults} Adults{children > 0 ? `, ${children} Kids` : ''}</span>
          </div>
        </div>
      </div>

      {/* 2. UNIFIED BODY (LEFT QUOTE PANE + RIGHT ENQUIRY PANE) */}
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
                <span>All-Inclusive Package Price</span>
              </div>

              <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1, marginTop: 4 }}>
                {formatINR(calculation.finalTotal)}
              </div>

              <div style={{ fontSize: '0.90rem', color: '#A7F3D0', marginTop: 4 }}>
                Approx <strong style={{ color: '#FBBF24', fontSize: '1.08rem' }}>{formatINR(calculation.perPersonPrice)}</strong> / person (All-inclusive with 5% GST)
              </div>

              {selectedHotel && (
                <div
                  style={{
                    fontSize: '0.80rem',
                    color: '#E2E8F0',
                    marginTop: 10,
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    padding: '6px 12px',
                    borderRadius: 8,
                    display: 'inline-block',
                  }}
                >
                  Stay: <strong>{selectedHotel.name}</strong> {selectedRoom ? `• ${selectedRoom.name}` : ''}
                </div>
              )}
            </div>

            {/* Inclusions Breakdown (Clean & Readable) */}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem', color: '#E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={17} color="#34D399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    <strong>{calculation.roomsCount} Room(s){(calculation.extraBedsCount || 0) > 0 ? ` + ${calculation.extraBedsCount} Extra Bed(s)` : ''}</strong> at verified hotel ({selectedRoom?.name || 'Deluxe Room'})
                  </span>
                </div>

                {(calculation.extraBedsCount || 0) > 0 && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <CheckCircle2 size={17} color="#34D399" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      <strong>Extra Bed Included:</strong> {calculation.extraBedsCount} Bed(s) @ ₹{(calculation.extraBedRate || 1200).toLocaleString('en-IN')}/night
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={17} color="#34D399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    <strong>{mealPlan} Meal Plan:</strong>{' '}
                    {mealPlan === 'AP'
                      ? 'Daily Breakfast, Lunch & Dinner Included'
                      : mealPlan === 'MAP'
                      ? 'Daily Breakfast & Dinner Included'
                      : mealPlan === 'CP'
                      ? 'Daily Breakfast Included'
                      : 'Room Only (No Meals Included)'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={17} color="#34D399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    <strong>Dedicated Private Cab:</strong> {vehicleLabel} for all {calculation.days} days transfers & sightseeing
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={17} color="#34D399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>All Tolls, Parking, State Permits & Driver Night Allowances 100% Covered</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={17} color="#34D399" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>5% Tour GST Fully Included (Zero Hidden Charges)</span>
                </div>
              </div>
            </div>

            {/* 25% Advance Notice */}
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1.5px solid rgba(245, 158, 11, 0.4)',
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
                <span>Advance to Confirm ({calculation.advancePercentage || 35}%):</span>
              </div>
              <strong style={{ color: '#FBBF24', fontSize: '1.08rem' }}>
                {formatINR(calculation.advancePayable)}
              </strong>
            </div>
          </div>

          {/* Quick Contact & WhatsApp Actions */}
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
              <span>Chat with Travel Expert on WhatsApp</span>
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

        {/* ================= RIGHT PANE: ENQUIRY FORM / CONFIRMATION ================= */}
        <div className="unified-booking-right">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 6 }}>
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
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.2 }}>
                    Request Official Call & Quotation
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    Receive day-by-day customized itinerary & lock your dates
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
                15-Min Response
              </span>
            </div>

            {submittedLeadRef ? (
              <div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 900, fontSize: '1.02rem' }}>
                    <CheckCircle2 size={22} color="#059669" />
                    <span>Enquiry Received! Ref: #{submittedLeadRef}</span>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '0.84rem', color: '#047857', lineHeight: 1.5 }}>
                    Our Senior Holiday Specialist has received your request and will call you on <strong>{customerMobile}</strong> within 15 minutes with complete hotel confirmations!
                  </p>
                </div>

                {/* SHOW BANK ACCOUNT HERE AFTER SUBMISSION */}
                <div
                  style={{
                    background: '#F8FAFC',
                    borderRadius: 14,
                    border: '1.5px solid #CBD5E1',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <ShieldCheck size={18} color="#059669" />
                    <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0F172A' }}>
                      Ready to lock? {calculation.advancePercentage || 35}% Advance Account Details
                    </div>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: '#64748B', margin: '0 0 10px' }}>
                    Transfer {formatINR(calculation.advancePayable)} advance to reserve hotel and cab immediately:
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>Bank:</span>
                      <strong style={{ color: '#0F172A' }}>{bankDetails.bankName} ({bankDetails.branch})</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>Beneficiary:</span>
                      <strong style={{ color: '#0F172A' }}>{bankDetails.accountName}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>Account No:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{bankDetails.accountNumber}</strong>
                        <button
                          type="button"
                          onClick={() => onCopyText(bankDetails.accountNumber, 'acc')}
                          style={{ padding: '2px 6px', fontSize: '0.68rem', borderRadius: 4, background: '#F1F5F9', border: '1px solid #CBD5E1', cursor: 'pointer' }}
                        >
                          {copiedKey === 'acc' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>IFSC:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{bankDetails.ifsc}</strong>
                        <button
                          type="button"
                          onClick={() => onCopyText(bankDetails.ifsc, 'ifsc')}
                          style={{ padding: '2px 6px', fontSize: '0.68rem', borderRadius: 4, background: '#F1F5F9', border: '1px solid #CBD5E1', cursor: 'pointer' }}
                        >
                          {copiedKey === 'ifsc' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>UPI ID:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{bankDetails.upiId}</strong>
                        <button
                          type="button"
                          onClick={() => onCopyText(bankDetails.upiId, 'upi')}
                          style={{ padding: '2px 6px', fontSize: '0.68rem', borderRadius: 4, background: '#F1F5F9', border: '1px solid #CBD5E1', cursor: 'pointer' }}
                        >
                          {copiedKey === 'upi' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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
                      WhatsApp / Mobile Number *
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
                    padding: '13px 18px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.96rem',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: 4,
                    boxShadow: '0 6px 18px rgba(5, 150, 105, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSubmitting ? <RefreshCw size={17} className="animate-spin" /> : <Send size={17} />}
                  <span>Submit Request to Travel Desk</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: '0.72rem', color: '#64748B', flexWrap: 'wrap', marginTop: 4 }}>
                  <span>🔒 100% Rate Lock Guarantee</span>
                  <span>•</span>
                  <span>⚡ Verified Hotels & Cabs</span>
                  <span>•</span>
                  <span>Zero Spam Call Policy</span>
                </div>

                {/* Assurance & Next Steps Box (Fills height cleanly) */}
                <div
                  style={{
                    marginTop: 16,
                    background: 'linear-gradient(135deg, #F0FDF4 0%, #F8FAFC 100%)',
                    border: '1px solid #A7F3D0',
                    borderRadius: 14,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <ShieldCheck size={16} color="#059669" />
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#064E3B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Next Steps After Submitting:
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, fontSize: '0.76rem', color: '#334155', lineHeight: 1.4 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        1
                      </span>
                      <span><strong>15-Min Callback:</strong> Senior Kashmir travel specialist calls you to confirm dates & room choices.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        2
                      </span>
                      <span><strong>Official PDF Itinerary:</strong> Customized day-by-day sightseeing proposal sent to your WhatsApp.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        3
                      </span>
                      <span><strong>Zero Price Hike Lock:</strong> Lock your verified room allotment with {calculation.advancePercentage || 35}% advance when you are 100% satisfied.</span>
                    </div>
                  </div>

                  {/* Clean Optional Toggle for Direct Advance Details */}
                  <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px dashed #A7F3D0', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setShowBankDetails(!showBankDetails)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#047857',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '2px 6px',
                      }}
                    >
                      <span>{showBankDetails ? '▲ Hide Bank & UPI Transfer Details' : '▼ Prefer direct advance transfer? Click to view Bank & UPI details'}</span>
                    </button>

                    {showBankDetails && (
                      <div style={{ marginTop: 10, textAlign: 'left', display: 'grid', gridTemplateColumns: '1fr', gap: 6, fontSize: '0.76rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: '#FFFFFF', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#64748B', fontWeight: 600 }}>Bank:</span>
                          <strong style={{ color: '#0F172A' }}>{bankDetails.bankName} ({bankDetails.branch})</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: '#FFFFFF', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#64748B', fontWeight: 600 }}>Beneficiary:</span>
                          <strong style={{ color: '#0F172A' }}>{bankDetails.accountName}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: '#FFFFFF', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#64748B', fontWeight: 600 }}>Account No:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{bankDetails.accountNumber}</strong>
                            <button
                              type="button"
                              onClick={() => onCopyText(bankDetails.accountNumber, 'acc')}
                              style={{ padding: '2px 5px', fontSize: '0.66rem', borderRadius: 4, background: '#F1F5F9', border: '1px solid #CBD5E1', cursor: 'pointer' }}
                            >
                              {copiedKey === 'acc' ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: '#FFFFFF', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#64748B', fontWeight: 600 }}>IFSC:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{bankDetails.ifsc}</strong>
                            <button
                              type="button"
                              onClick={() => onCopyText(bankDetails.ifsc, 'ifsc')}
                              style={{ padding: '2px 5px', fontSize: '0.66rem', borderRadius: 4, background: '#F1F5F9', border: '1px solid #CBD5E1', cursor: 'pointer' }}
                            >
                              {copiedKey === 'ifsc' ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: '#FFFFFF', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                          <span style={{ color: '#64748B', fontWeight: 600 }}>UPI ID:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{bankDetails.upiId}</strong>
                            <button
                              type="button"
                              onClick={() => onCopyText(bankDetails.upiId, 'upi')}
                              style={{ padding: '2px 5px', fontSize: '0.66rem', borderRadius: 4, background: '#F1F5F9', border: '1px solid #CBD5E1', cursor: 'pointer' }}
                            >
                              {copiedKey === 'upi' ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
