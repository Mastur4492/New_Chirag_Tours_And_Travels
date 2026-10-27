'use client';

import React from 'react';
import {
  Calendar,
  Car,
  Clock,
  FileCheck,
  History,
  MapPin,
  Navigation,
  Phone,
  Printer,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react';
import { TransportAssignmentDto } from '@chirag/types';
import { COMPANY_BRANDING } from '@/lib/branding';
import { formatDate } from '@/lib/labels';

interface TransportDutySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: TransportAssignmentDto;
  bookingNumber: string;
}

export function TransportDutySlipModal({
  isOpen,
  onClose,
  assignment,
  bookingNumber,
}: TransportDutySlipModalProps) {
  if (!isOpen || !assignment.currentDutySlip) return null;

  const dutySlip = assignment.currentDutySlip;
  const snapshot = dutySlip.documentSnapshot || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none print:w-full print:max-w-none">
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">
                  Driver Transport Duty Slip
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {dutySlip.documentNumber}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Version {dutySlip.version}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official dispatch document • Vehicle & Driver assignment authorization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              id="close-duty-slip-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reissued Notice Banner (if version > 1) */}
        {dutySlip.version > 1 && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 print:bg-white print:border-b-2 print:border-amber-400">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              <span className="font-semibold">Reissued Duty Slip (v{dutySlip.version}):</span>
              <span>Reason: &quot;{dutySlip.reissueReason || snapshot.reissueReason as string || 'Updated schedule or driver details'}&quot;</span>
            </div>
            <span className="text-amber-700 font-mono text-[11px]">
              Reissued on {formatDate(dutySlip.issuedAt)}
            </span>
          </div>
        )}

        {/* Printable Document Body */}
        <div id="duty-slip-content" className="p-8 print:p-6 bg-white text-slate-800">
          
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
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-100 text-blue-800 border border-blue-200">
                    OFFICIAL DUTY SLIP
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Transport Fleet Dispatch & Operations Division • Ahmedabad HQ • Founder: {COMPANY_BRANDING.owner}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-0.5">
                  <span>Fleet Control: {COMPANY_BRANDING.phone}</span>
                  <span>•</span>
                  <span>Dispatch: {COMPANY_BRANDING.phoneDisplay}</span>
                  <span>•</span>
                  <span>Email: {COMPANY_BRANDING.email}</span>
                </div>
              </div>
            </div>

            <div className="text-left md:text-right bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-[200px]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Duty Slip Reference
              </div>
              <div className="text-base font-extrabold text-blue-700 font-mono">
                {dutySlip.documentNumber}
              </div>
              <div className="text-xs text-slate-500 pt-1">
                Booking: <span className="font-semibold text-slate-900">{bookingNumber}</span>
              </div>
              <div className="text-xs text-slate-500">
                Issued: {formatDate(dutySlip.issuedAt)}
              </div>
            </div>
          </div>

          {/* Assigned Driver & Vehicle Details Grid */}
          <div className="my-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Driver Profile Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  Assigned Chauffeur / Driver
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                  VERIFIED CHAUFFEUR
                </span>
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {assignment.driverName || (snapshot.driverName as string) || 'Authorized Driver'}
                </h4>
                <p className="text-xs text-slate-700 flex items-center gap-1.5 pt-1">
                  <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Mobile: <strong className="font-mono text-slate-900">{assignment.driverMobile || (snapshot.driverMobile as string) || 'N/A'}</strong></span>
                </p>
                <p className="text-xs text-slate-600 pt-0.5 font-mono">
                  Driving License: <strong>{assignment.driverLicenseNumber || (snapshot.driverLicenseNumber as string) || 'N/A'}</strong>
                </p>
              </div>
              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/80">
                Chauffeur is briefed on itinerary circuit, hill-driving safety and guest hospitality.
              </div>
            </div>

            {/* Vehicle Profile Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  Assigned Cab / Vehicle
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                  {assignment.vehicleCategory || (snapshot.vehicleCategory as string) || 'TOUR VEHICLE'}
                </span>
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {assignment.vehicleModel || (snapshot.vehicleModel as string) || 'Authorized Fleet Vehicle'}
                </h4>
                <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 font-black font-mono text-sm tracking-wider">
                  <span>PLATE:</span>
                  <span>{assignment.vehicleRegistrationNumber || (snapshot.vehicleRegistration as string) || 'TOUR-CAB'}</span>
                </div>
                {assignment.vendorName && (
                  <p className="text-xs text-slate-500 pt-1">
                    Fleet Vendor: {assignment.vendorName}
                  </p>
                )}
              </div>
              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/80">
                Commercial tourist permit, comprehensive vehicle insurance & fitness certified.
              </div>
            </div>
          </div>

          {/* Passenger & Schedule Information */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 mb-6">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Tour Schedule & Reporting Guidelines
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div>
                <div className="text-[11px] text-slate-400">Tour Service From</div>
                <div className="text-xs font-bold text-slate-900">{formatDate(assignment.startDate)}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Tour Service Until</div>
                <div className="text-xs font-bold text-slate-900">{formatDate(assignment.endDate)}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Daily Reporting Time</div>
                <div className="text-xs font-bold text-blue-700">
                  {assignment.pickupTime || (snapshot.pickupTime as string) || '09:00 AM'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Primary Guest</div>
                <div className="text-xs font-bold text-slate-900">
                  {(snapshot.customerName as string) || 'Guest Party'}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Pickup Location:</span>
                <span className="font-semibold text-slate-900">
                  {assignment.pickupLocation || (snapshot.pickupLocation as string) || 'Airport / Hotel Pickup'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Circuit / Drop:</span>
                <span className="font-semibold text-slate-900">
                  {assignment.dropLocation || (snapshot.dropLocation as string) || 'Scheduled Tour Sightseeing Circuit'}
                </span>
              </div>
            </div>

            {assignment.reportingAddress && (
              <div className="pt-2 border-t border-slate-200/80 text-xs">
                <span className="text-slate-400 block text-[11px]">Reporting Address:</span>
                <span className="font-medium text-slate-800">{assignment.reportingAddress}</span>
              </div>
            )}
          </div>

          {/* Chauffeur Code of Conduct & Operational Instructions */}
          <div className="mt-6 pt-4 border-t border-slate-200 space-y-2.5 text-xs text-slate-500">
            <h5 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Driver Operational Directives & Safety Instructions
            </h5>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Driver must report 15 minutes before scheduled pickup time in clean uniform with a clean vehicle.</li>
              <li>Vehicle must maintain adequate fuel, working heater/AC, emergency spare tire, jack, and first aid kit at all times.</li>
              <li>Strictly adhere to speed limits, traffic regulations and mountain convoy protocols on Srinagar-Leh / Pahalgam-Gulmarg highways.</li>
              <li>Do not accept any direct payment from guests for contracted sightseeing services. Any optional itinerary additions must be routed via New Chirag Operations Desk.</li>
              <li>In the event of road blockages, mechanical breakdown, or adverse weather, immediately notify Dispatch Desk: <strong>{COMPANY_BRANDING.phoneDisplay}</strong>.</li>
            </ol>
          </div>

          {/* Signoff Footer */}
          <div className="mt-8 pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <div>
              Generated by New Chirag Transport Desk • Duty Slip Version {dutySlip.version}
            </div>
            <div className="text-right">
              Authorized Dispatch Slip • Carrier Copy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
