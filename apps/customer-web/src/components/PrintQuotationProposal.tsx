'use client';

import React from 'react';

export interface PrintQuotationProposalProps {
  activeStateObj: {
    name: string;
    shortName: string;
  };
  durationNights: number;
  calculation: {
    days: number;
    roomsCount: number;
    effectiveHotelRate: number;
    totalHotelCost: number;
    totalVehicleCost: number;
    agencyMargin: number;
    gstAmount: number;
    finalTotal: number;
    advancePayable: number;
  };
  adults: number;
  children: number;
  checkInDate: string;
  checkOutDate: string;
  formatDateDisplay: (d: string) => string;
  formatINR: (amount: number) => string;
  selectedHotel: {
    name?: string;
    starRating?: number;
    city?: string;
  } | null;
  selectedRoom: {
    name?: string;
  } | null;
  mealPlan: string;
  vehicleTier: string;
  vehicleLabel: string;
  bankDetails: {
    bankName: string;
    branch: string;
    accountName: string;
    accountNumber: string;
    ifsc: string;
    upiId: string;
  };
}

export function PrintQuotationProposal({
  activeStateObj,
  durationNights,
  calculation,
  adults,
  children,
  checkInDate,
  checkOutDate,
  formatDateDisplay,
  formatINR,
  selectedHotel,
  selectedRoom,
  mealPlan,
  vehicleLabel,
  bankDetails,
}: PrintQuotationProposalProps) {
  return (
    <div
      className="print-show"
      style={{
        display: 'none',
        padding: '20px',
        fontFamily: 'Inter, sans-serif',
        color: '#0F172A',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2.5px solid #059669',
          paddingBottom: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src="/branding/nc-logo.jpg"
            alt="New Chirag Tours & Travels"
            style={{ width: 85, height: 'auto', maxHeight: 60, objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontSize: '20pt', fontWeight: 900, color: '#062317' }}>New Chirag Tours & Travels</div>
            <div style={{ fontSize: '9pt', color: '#059669', fontWeight: 700, letterSpacing: '0.06em' }}>
              AHMEDABAD • VERIFIED TRAVEL DESK • EST. 1990
            </div>
            <div style={{ fontSize: '8pt', color: '#475569' }}>
              Shop No 3, Al-Rehman Plaza, Danilimda Cross Road, Ahmedabad | +91 99786 55529
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12pt', fontWeight: 900, color: '#059669' }}>OFFICIAL TRIP QUOTATION</div>
          <div suppressHydrationWarning style={{ fontSize: '8pt', color: '#64748B' }}>
            Ref: NCT-QT-202610
          </div>
          <div suppressHydrationWarning style={{ fontSize: '8pt', color: '#64748B' }}>
            Date: 19 Oct 2026
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 20,
          background: '#F8FAFC',
          padding: 14,
          borderRadius: 8,
          border: '1px solid #E2E8F0',
        }}
      >
        <div>
          <div style={{ fontSize: '8pt', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Holiday Circuit:</div>
          <div style={{ fontSize: '12pt', fontWeight: 800, color: '#0F172A' }}>{activeStateObj.name}</div>
          <div style={{ fontSize: '9pt', color: '#475569', marginTop: 2 }}>
            Duration: <strong>{durationNights} Nights / {calculation.days} Days</strong>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '8pt', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Travel Party:</div>
          <div style={{ fontSize: '11pt', fontWeight: 700, color: '#0F172A' }}>
            {adults} Adults{children > 0 ? `, ${children} Children` : ''} ({calculation.roomsCount} Room)
          </div>
          <div style={{ fontSize: '9pt', color: '#475569', marginTop: 2 }}>
            Travel Dates: <strong>{formatDateDisplay(checkInDate)} → {formatDateDisplay(checkOutDate)}</strong>
          </div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: '9pt' }}>
        <thead>
          <tr style={{ background: '#062317', color: '#FFFFFF' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Item / Service</th>
            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Category / Inclusions</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
            <td style={{ padding: '8px 10px' }}><strong>Hotel Accommodation</strong></td>
            <td style={{ padding: '8px 10px' }}>
              <div><strong>{selectedHotel?.name || 'Verified Partner Hotel'}</strong> ({selectedHotel?.starRating || 4}★ {selectedHotel?.city || ''})</div>
              <div style={{ fontSize: '8pt', color: '#64748B' }}>
                Room: {selectedRoom?.name || 'Deluxe Room'} ({calculation.roomsCount} Room, {durationNights} Nights, {mealPlan} Plan @ {formatINR(calculation.effectiveHotelRate)}/room/night)
              </div>
            </td>
            <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatINR(calculation.totalHotelCost)}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
            <td style={{ padding: '8px 10px' }}><strong>Dedicated Private Cab</strong></td>
            <td style={{ padding: '8px 10px' }}>{vehicleLabel} ({calculation.days} Days, Chauffeur, Fuel, Tolls)</td>
            <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatINR(calculation.totalVehicleCost)}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
            <td style={{ padding: '8px 10px' }}><strong>Agency Service & Operations</strong></td>
            <td style={{ padding: '8px 10px' }}>24/7 Desk Helpline, Itinerary Planning & Vouchers (10%)</td>
            <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatINR(calculation.agencyMargin)}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
            <td style={{ padding: '8px 10px' }}><strong>Government GST (5%)</strong></td>
            <td style={{ padding: '8px 10px' }}>GST on Tour Operating Services</td>
            <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatINR(calculation.gstAmount)}</td>
          </tr>
          <tr style={{ background: '#ECFDF5', fontWeight: 900 }}>
            <td style={{ padding: '10px 10px', fontSize: '11pt' }} colSpan={2}>Total Package Price (All Inclusive)</td>
            <td style={{ padding: '10px 10px', textAlign: 'right', fontSize: '12pt', color: '#047857' }}>{formatINR(calculation.finalTotal)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: '9pt', fontWeight: 800, color: '#062317', marginBottom: 4 }}>
          Bank Account Details for Allotment Confirmation:
        </div>
        <div style={{ fontSize: '8pt', color: '#334155', lineHeight: 1.5 }}>
          Bank: <strong>{bankDetails.bankName}</strong> | Branch: <strong>{bankDetails.branch}</strong> | Account: <strong>{bankDetails.accountNumber}</strong><br />
          IFSC: <strong>{bankDetails.ifsc}</strong> | Account Name: <strong>{bankDetails.accountName}</strong> | UPI: <strong>{bankDetails.upiId}</strong><br />
          Advance payable to lock bookings: <strong>{formatINR(calculation.advancePayable)}</strong> (25%). Balance payable on hotel check-in.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 20 }}>
        <div>
          <div style={{ fontSize: '8pt', color: '#64748B' }}>Customer Acceptance</div>
          <div style={{ width: 180, borderBottom: '1px dashed #94A3B8', marginTop: 40 }} />
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10pt', fontWeight: 900, color: '#062317' }}>Faisal Bikanerwala</div>
          <div style={{ fontSize: '8pt', color: '#059669', fontWeight: 700 }}>Managing Director & Founder</div>
          <div style={{ fontSize: '8pt', color: '#64748B' }}>New Chirag Tours & Travels, Ahmedabad</div>
        </div>
      </div>
    </div>
  );
}
