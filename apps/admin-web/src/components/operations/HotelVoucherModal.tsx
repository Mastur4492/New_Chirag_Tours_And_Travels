'use client';

import React from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Mail,
  MapPin,
  Phone,
  Printer,
  Sparkles,
  Users,
  X,
  History,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { HotelReservationDto } from '@chirag/types';
import { COMPANY_BRANDING } from '@/lib/branding';
import { formatDate } from '@/lib/labels';

interface HotelVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: HotelReservationDto;
  bookingNumber: string;
}

export function HotelVoucherModal({
  isOpen,
  onClose,
  reservation,
  bookingNumber,
}: HotelVoucherModalProps) {
  if (!isOpen || !reservation.currentVoucher) return null;

  const voucher = reservation.currentVoucher;
  const snapshot = voucher.documentSnapshot || {};

  const handlePrint = () => {
    window.print();
  };

  const mealPlanName: Record<string, string> = {
    EP: 'EP — European Plan (Room Only)',
    CP: 'CP — Continental Plan (Bed & Breakfast)',
    MAP: 'MAP — Modified American Plan (Breakfast & Dinner)',
    AP: 'AP — American Plan (All Meals: Breakfast, Lunch & Dinner)',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none print:w-full print:max-w-none">
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">
                  Hotel Confirmation Voucher
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {voucher.documentNumber}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Version {voucher.version}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official issued document snapshot • Immutable operational record
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              id="close-hotel-voucher-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reissued Notice Banner (if version > 1) */}
        {voucher.version > 1 && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 print:bg-white print:border-b-2 print:border-amber-400">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              <span className="font-semibold">Reissued Document (v{voucher.version}):</span>
              <span>Reason: &quot;{voucher.reissueReason || snapshot.reissueReason as string || 'Updated reservation specifications'}&quot;</span>
            </div>
            <span className="text-amber-700 font-mono text-[11px]">
              Reissued on {formatDate(voucher.issuedAt)}
            </span>
          </div>
        )}

        {/* Printable Document Body */}
        <div id="hotel-voucher-content" className="p-8 print:p-6 bg-white text-slate-800">
          
          {/* Document Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b-2 border-slate-200 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white p-1 border border-slate-200 shadow-sm flex items-center justify-center flex-shrink-0">
                <img
                  src={COMPANY_BRANDING.logos.badge}
                  alt={COMPANY_BRANDING.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                    {COMPANY_BRANDING.name}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                    CONFIRMED ALLOTMENT
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Ahmedabad Travel Desk • Founder: {COMPANY_BRANDING.owner} • Domestic Tour Specialist
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-0.5">
                  <span>Helpline: {COMPANY_BRANDING.phone}</span>
                  <span>•</span>
                  <span>Email: {COMPANY_BRANDING.email}</span>
                  <span>•</span>
                  <span>Danilimda, Ahmedabad</span>
                </div>
              </div>
            </div>

            <div className="text-left md:text-right bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-[200px]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Voucher Reference
              </div>
              <div className="text-base font-extrabold text-emerald-700 font-mono">
                {voucher.documentNumber}
              </div>
              <div className="text-xs text-slate-500 pt-1">
                Booking: <span className="font-semibold text-slate-900">{bookingNumber}</span>
              </div>
              <div className="text-xs text-slate-500">
                Issued: {formatDate(voucher.issuedAt)}
              </div>
            </div>
          </div>

          {/* Supplier Confirmation Notice Badge */}
          <div className="my-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                  Official Hotel Reservation Status
                </div>
                <div className="text-sm font-bold text-emerald-900">
                  Confirmed & Guaranteed with Property
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[11px] font-medium text-slate-500">
                Hotel Confirmation Reference
              </div>
              <div className="text-base font-black font-mono text-emerald-800 tracking-wider">
                {reservation.supplierConfirmationNumber || (snapshot.supplierConfirmationNumber as string) || 'CONFIRMED'}
              </div>
            </div>
          </div>

          {/* Hotel & Guest Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-200">
            {/* Hotel Property Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  Accommodating Property
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                  {(reservation as any).hotel?.propertyType || (snapshot.propertyType as string) || 'HOTEL'}
                </span>
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {reservation.hotelName || (reservation as any).hotel?.name || (snapshot.hotelName as string) || 'Reserved Hotel Property'}
                </h4>
                <p className="text-xs text-slate-600 flex items-start gap-1 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {(reservation as any).hotel?.address || (snapshot.hotelAddress as string) || 'Lidder Valley Circuit'}, {reservation.hotelCity || (reservation as any).hotel?.city || (snapshot.hotelCity as string) || 'Jammu & Kashmir'}
                  </span>
                </p>
                {(reservation as any).hotel?.contactPhone && (
                  <p className="text-xs text-slate-600 flex items-center gap-1 pt-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Phone: {(reservation as any).hotel.contactPhone}</span>
                  </p>
                )}
              </div>
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                <span>Check-in: <strong className="text-slate-800">{(reservation as any).hotel?.checkInTime || (snapshot.hotelCheckInTime as string) || '14:00'}</strong></span>
                <span>Check-out: <strong className="text-slate-800">{(reservation as any).hotel?.checkOutTime || (snapshot.hotelCheckOutTime as string) || '11:00'}</strong></span>
              </div>
            </div>

            {/* Guest Details Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Primary Guest & Passenger Details
              </span>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {(snapshot.customerName as string) || 'Guest Party'}
                </h4>
                {(snapshot.customerPhone as string) && (
                  <p className="text-xs text-slate-600 flex items-center gap-1 pt-0.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Mobile: {snapshot.customerPhone as string}</span>
                  </p>
                )}
                {(snapshot.customerEmail as string) && (
                  <p className="text-xs text-slate-600 flex items-center gap-1 pt-0.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Email: {snapshot.customerEmail as string}</span>
                  </p>
                )}
              </div>
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-700">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  Total Guests: <strong>{reservation.adultsCount} Adults{reservation.childrenCount > 0 ? `, ${reservation.childrenCount} Children` : ''}</strong>
                </span>
                <span>Rooms: <strong>{reservation.numberOfRooms} Room(s)</strong></span>
              </div>
            </div>
          </div>

          {/* Stay & Room Specifications Table */}
          <div className="my-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Room & Meal Specifications
            </h4>
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Check-in Date</th>
                    <th className="py-2.5 px-4">Check-out Date</th>
                    <th className="py-2.5 px-4">Duration</th>
                    <th className="py-2.5 px-4">Room Category</th>
                    <th className="py-2.5 px-4">Meal Plan</th>
                    <th className="py-2.5 px-4 text-center">Rooms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  <tr className="bg-white">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {formatDate(reservation.checkInDate)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {formatDate(reservation.checkOutDate)}
                    </td>
                    <td className="py-3 px-4">
                      {reservation.numberOfNights} Night{reservation.numberOfNights > 1 ? 's' : ''}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {reservation.roomCategoryName || (reservation as any).roomCategory?.name || (snapshot.roomCategoryName as string) || 'Standard Deluxe Room'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-emerald-800">
                        {mealPlanName[reservation.mealPlan] || reservation.mealPlan}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-center text-slate-900">
                      {reservation.numberOfRooms}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Special Requests (if any) */}
          {reservation.specialRequests && (
            <div className="my-4 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900">
              <strong className="font-bold">Special Requests / Preferences:</strong>{' '}
              {reservation.specialRequests}
            </div>
          )}

          {/* Important Tour Inclusions & Check-in Rules */}
          <div className="mt-6 pt-4 border-t border-slate-200 space-y-3 text-xs text-slate-500">
            <h5 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Voucher Guidelines & Hotel Check-in Policy
            </h5>
            <ul className="list-disc pl-5 space-y-1">
              <li>Please present this confirmation voucher and valid Government Photo ID (Aadhaar / Passport / Voter ID) for all adult travelers at check-in.</li>
              <li>Early check-in or late check-out is strictly subject to hotel room availability and direct hotel discretion.</li>
              <li>Personal incidentals (room service, laundry, telephone calls, mini-bar) are not covered by this voucher and must be settled directly with the property at check-out.</li>
              <li>For any operational assistance or room allocation queries, please contact New Chirag 24x7 Operations Support: <strong>{COMPANY_BRANDING.phoneDisplay}</strong>.</li>
            </ul>
          </div>

          {/* Authorized Signoff Footer */}
          <div className="mt-8 pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <div>
              Generated by New Chirag Operations Desk • Document Version {voucher.version}
            </div>
            <div className="text-right">
              Authorized Service Voucher • Non-transferable
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
