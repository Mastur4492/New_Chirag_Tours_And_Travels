'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Compass,
  Edit3,
  Eye,
  FileCheck,
  FilePlus,
  FileSpreadsheet,
  History,
  Info,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  HotelReservationDto,
  HotelReservationStatus,
  OperationalSummaryDto,
  TransportAssignmentDto,
  TransportAssignmentStatus,
  VehicleDto,
  DriverDto,
} from '@chirag/types';
import { apiRequest, getUserRole } from '@/lib/api';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  HOTEL_RESERVATION_STATUS_CONFIG,
  TRANSPORT_ASSIGNMENT_STATUS_CONFIG,
  SUPPLIER_CANCELLATION_STATUS_CONFIG,
  formatDate,
  formatPaiseToRupees,
} from '@/lib/labels';
import { HotelVoucherModal } from './HotelVoucherModal';
import { TransportDutySlipModal } from './TransportDutySlipModal';

interface OperationsManagementViewProps {
  bookingId: string;
  onRefreshParent?: () => void;
}

export const SAMPLE_DEMO_SUMMARY: OperationalSummaryDto = {
  bookingId: 'demo-booking-kashmir',
  bookingNumber: 'NCT-BK-2026-0042',
  bookingStatus: 'CONFIRMED',
  travelStartDate: '2026-11-01',
  travelEndDate: '2026-11-06',
  customerName: 'Aarav Patel & Family',
  customerPhone: '+91 98250 11223',
  allHotelVouchersIssued: false,
  allDriverDutySlipsIssued: true,
  operationalReadinessPercent: 67,
  hotelReservations: [
    {
      id: 'res-gmg-001',
      bookingId: 'demo-booking-kashmir',
      bookingNumber: 'NCT-BK-2026-0042',
      hotelId: 'hotel-gmg-01',
      hotelName: 'Grand Mumtaz Resorts',
      hotelCity: 'Gulmarg',
      roomCategoryId: 'rc-gmg-01',
      roomCategoryName: 'Super Deluxe Room (Mountain View)',
      hotelItemIndex: 0,
      checkInDate: '2026-11-01',
      checkOutDate: '2026-11-03',
      numberOfNights: 2,
      numberOfRooms: 1,
      mealPlan: 'MAP',
      adultsCount: 2,
      childrenCount: 1,
      status: 'CONFIRMED',
      supplierConfirmationNumber: 'GMG-CONF-8814',
      supplierContactPerson: 'Farooq Ahmad (Front Office Manager)',
      supplierContactPhone: '+91 1954 254401',
      specialRequests: 'Heater required in bedroom, extra bed for child, high floor preferred.',
      voucherIssued: true,
      currentVoucher: {
        documentNumber: 'VOU-GMG-2026-001',
        version: 1,
        issuedAt: '2026-10-14T10:30:00.000Z',
        issuedBy: 'Faisal Bikanerwala',
        documentSnapshot: {
          customerName: 'Aarav Patel',
          hotelName: 'Grand Mumtaz Resorts',
          hotelCity: 'Gulmarg',
          roomCategoryName: 'Super Deluxe Room (Mountain View)',
          supplierConfirmationNumber: 'GMG-CONF-8814',
        },
      },
      voucherHistory: [
        {
          documentNumber: 'VOU-GMG-2026-001',
          version: 1,
          issuedAt: '2026-10-14T10:30:00.000Z',
          issuedBy: 'Faisal Bikanerwala',
          documentSnapshot: {
            customerName: 'Aarav Patel',
            hotelName: 'Grand Mumtaz Resorts',
            hotelCity: 'Gulmarg',
          },
        },
      ],
      createdAt: '2026-10-14T09:00:00.000Z',
      updatedAt: '2026-10-14T10:30:00.000Z',
    },
    {
      id: 'res-phg-002',
      bookingId: 'demo-booking-kashmir',
      bookingNumber: 'NCT-BK-2026-0042',
      hotelId: 'hotel-phg-02',
      hotelName: 'Heevan Resort',
      hotelCity: 'Pahalgam',
      roomCategoryId: 'rc-phg-02',
      roomCategoryName: 'Premium River View Suite',
      hotelItemIndex: 1,
      checkInDate: '2026-11-03',
      checkOutDate: '2026-11-05',
      numberOfNights: 2,
      numberOfRooms: 1,
      mealPlan: 'MAP',
      adultsCount: 2,
      childrenCount: 1,
      status: 'REQUESTED',
      supplierConfirmationNumber: undefined,
      supplierContactPerson: 'Mushtaq Reshi (Central Reservations)',
      supplierContactPhone: '+91 1936 243200',
      specialRequests: 'Lidder river facing wing, non-smoking floor.',
      voucherIssued: false,
      createdAt: '2026-10-14T09:00:00.000Z',
      updatedAt: '2026-10-14T09:00:00.000Z',
    },
    {
      id: 'res-sgr-003',
      bookingId: 'demo-booking-kashmir',
      bookingNumber: 'NCT-BK-2026-0042',
      hotelId: 'hotel-sgr-03',
      hotelName: 'Houseboat New Shahzada',
      hotelCity: 'Dal Lake, Srinagar',
      roomCategoryId: 'rc-sgr-03',
      roomCategoryName: 'Royal Cedar Suite',
      hotelItemIndex: 2,
      checkInDate: '2026-11-05',
      checkOutDate: '2026-11-06',
      numberOfNights: 1,
      numberOfRooms: 1,
      mealPlan: 'CP',
      adultsCount: 2,
      childrenCount: 1,
      status: 'CANCELLED',
      supplierCancellation: {
        status: 'PENDING_SUPPLIER_ACKNOWLEDGEMENT',
        requestedAt: '2026-10-14T11:00:00.000Z',
        requestedBy: 'Faisal Bikanerwala',
        reason: 'Guest departure flight timing rescheduled earlier by airline',
      },
      voucherIssued: false,
      createdAt: '2026-10-14T09:00:00.000Z',
      updatedAt: '2026-10-14T11:00:00.000Z',
    },
  ],
  transportAssignments: [
    {
      id: 'assign-kash-001',
      bookingId: 'demo-booking-kashmir',
      bookingNumber: 'NCT-BK-2026-0042',
      transportItemIndex: 0,
      assignedVehicleId: 'veh-001',
      vehicleRegistrationNumber: 'JK-01-AB-1234',
      vehicleModel: 'Toyota Innova Crysta (6+1 Seater)',
      vehicleCategory: 'SUV',
      assignedDriverId: 'drv-001',
      driverName: 'Tariq Ahmad Lone',
      driverMobile: '+91 94190 12345',
      driverLicenseNumber: 'JK-01-2018-DL-00984',
      status: 'DISPATCHED',
      startDate: '2026-11-01',
      endDate: '2026-11-06',
      pickupLocation: 'Srinagar International Airport (SXR)',
      dropLocation: 'Srinagar International Airport (SXR)',
      pickupTime: '10:30 AM',
      reportingAddress: 'Arrival Terminal Exit Gate #2, SXR Airport',
      dutySlipIssued: true,
      currentDutySlip: {
        documentNumber: 'DS-JK01-2026-001',
        version: 1,
        issuedAt: '2026-10-14T10:45:00.000Z',
        issuedBy: 'Faisal Bikanerwala',
        documentSnapshot: {
          customerName: 'Aarav Patel',
          vehicleModel: 'Toyota Innova Crysta (6+1 Seater)',
          vehicleRegistrationNumber: 'JK-01-AB-1234',
          driverName: 'Tariq Ahmad Lone',
          driverMobile: '+91 94190 12345',
          driverLicenseNumber: 'JK-01-2018-DL-00984',
          pickupLocation: 'Srinagar International Airport (SXR)',
          dropLocation: 'Srinagar International Airport (SXR)',
        },
      },
      dutySlipHistory: [
        {
          documentNumber: 'DS-JK01-2026-001',
          version: 1,
          issuedAt: '2026-10-14T10:45:00.000Z',
          issuedBy: 'Faisal Bikanerwala',
          documentSnapshot: {
            customerName: 'Aarav Patel',
            vehicleModel: 'Toyota Innova Crysta (6+1 Seater)',
          },
        },
      ],
      dispatchedAt: '2026-10-14T10:50:00.000Z',
      dispatchedBy: 'Faisal Bikanerwala',
      dispatchNotes: 'Guest arriving on IndiGo 6E-212 from Mumbai. Boarding with 2 large luggage bags.',
      createdAt: '2026-10-14T09:00:00.000Z',
      updatedAt: '2026-10-14T10:50:00.000Z',
    },
  ],
};

export function OperationsManagementView({
  bookingId,
  onRefreshParent,
}: OperationsManagementViewProps) {
  const [summary, setSummary] = useState<OperationalSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('ADMIN');

  // Master Data Cache for Fleet & Drivers
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [drivers, setDrivers] = useState<DriverDto[]>([]);
  const [masterDataLoaded, setMasterDataLoaded] = useState(false);

  // Modals for Viewing Documents
  const [viewingVoucherReservation, setViewingVoucherReservation] =
    useState<HotelReservationDto | null>(null);
  const [viewingDutySlipAssignment, setViewingDutySlipAssignment] =
    useState<TransportAssignmentDto | null>(null);

  // Modals for Updating Status & Inputs
  const [editingReservation, setEditingReservation] = useState<HotelReservationDto | null>(null);
  const [resStatus, setResStatus] = useState<HotelReservationStatus>('CONFIRMED');
  const [resConfNumber, setResConfNumber] = useState('');
  const [resContactPerson, setResContactPerson] = useState('');
  const [resContactPhone, setResContactPhone] = useState('');
  const [resSpecialRequests, setResSpecialRequests] = useState('');
  const [resNotes, setResNotes] = useState('');
  const [resSaving, setResSaving] = useState(false);
  const [resError, setResError] = useState<string | null>(null);

  // Reissuing Document Modals
  const [reissuingVoucherRes, setReissuingVoucherRes] = useState<HotelReservationDto | null>(null);
  const [reissuingDutySlipAssign, setReissuingDutySlipAssign] =
    useState<TransportAssignmentDto | null>(null);
  const [reissueReason, setReissueReason] = useState('');
  const [reissueSubmitting, setReissueSubmitting] = useState(false);
  const [reissueError, setReissueError] = useState<string | null>(null);

  // Assigning Transport Modal
  const [assigningTransport, setAssigningTransport] = useState<TransportAssignmentDto | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [reportingAddress, setReportingAddress] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Dispatching Transport Modal
  const [dispatchingAssignment, setDispatchingAssignment] =
    useState<TransportAssignmentDto | null>(null);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchSaving, setDispatchSaving] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // Action Loading Trackers
  const [generatingVoucherId, setGeneratingVoucherId] = useState<string | null>(null);
  const [generatingDutySlipId, setGeneratingDutySlipId] = useState<string | null>(null);
  const [completingAssignmentId, setCompletingAssignmentId] = useState<string | null>(null);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const role = getUserRole();
    if (role) setUserRole(role);
    loadOperations();
  }, [bookingId]);

  const loadOperations = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    if (bookingId === 'demo-booking-kashmir') {
      setSummary(SAMPLE_DEMO_SUMMARY);
      setVehicles([
        {
          id: 'veh-001',
          registrationNumber: 'JK-01-AB-1234',
          model: 'Toyota Innova Crysta',
          category: 'SUV_LUXURY',
          seatingCapacity: 7,
          isActive: true,
          insuranceExpiryDate: '2027-12-31',
          fitnessExpiryDate: '2027-12-31',
        } as any,
      ]);
      setDrivers([
        {
          id: 'drv-001',
          fullName: 'Tariq Ahmad Lone',
          mobile: '+91 94190 12345',
          licenseNumber: 'JK-01-2018-DL-00984',
          licenseExpiryDate: '2028-05-15',
          isActive: true,
        } as any,
      ]);
      setMasterDataLoaded(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // 1. Try to fetch existing summary
      let data: OperationalSummaryDto;
      try {
        data = await apiRequest<OperationalSummaryDto>(`/operations/bookings/${bookingId}`);
      } catch (err: any) {
        // If not initialized yet and user is ADMIN, initialize it
        if (err?.message?.includes('not found') || err?.statusCode === 404) {
          data = await apiRequest<OperationalSummaryDto>(
            `/operations/bookings/${bookingId}/initialize`,
            { method: 'POST' }
          );
        } else {
          throw err;
        }
      }

      setSummary(data);

      // Lazy load fleet and drivers for admin assignment if not already loaded
      if (!masterDataLoaded && userRole === 'ADMIN') {
        const [vList, dList] = await Promise.all([
          apiRequest<VehicleDto[]>('/transport/vehicles').catch(() => []),
          apiRequest<DriverDto[]>('/transport/drivers').catch(() => []),
        ]);
        setVehicles(vList || []);
        setDrivers(dList || []);
        setMasterDataLoaded(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load operational records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 1. Hotel Reservation Confirmation Handler
  const handleOpenEditReservation = (res: HotelReservationDto) => {
    setEditingReservation(res);
    setResStatus(res.status);
    setResConfNumber(res.supplierConfirmationNumber || '');
    setResContactPerson(res.supplierContactPerson || '');
    setResContactPhone(res.supplierContactPhone || '');
    setResSpecialRequests(res.specialRequests || '');
    setResNotes(res.internalNotes || '');
    setResError(null);
  };

  const handleSaveReservation = async () => {
    if (!editingReservation) return;
    setResSaving(true);
    setResError(null);

    try {
      await apiRequest(`/operations/hotel-reservations/${editingReservation.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: resStatus,
          supplierConfirmationNumber: resConfNumber.trim() || undefined,
          supplierContactPerson: resContactPerson.trim() || undefined,
          supplierContactPhone: resContactPhone.trim() || undefined,
          specialRequests: resSpecialRequests.trim() || undefined,
          internalNotes: resNotes.trim() || undefined,
        }),
      });

      showToast('Hotel reservation updated successfully');
      setEditingReservation(null);
      await loadOperations(true);
      onRefreshParent?.();
    } catch (err: any) {
      setResError(err?.message || 'Failed to update reservation');
    } finally {
      setResSaving(false);
    }
  };

  // 2. Hotel Voucher Generation Handler
  const handleGenerateHotelVoucher = async (res: HotelReservationDto) => {
    setGeneratingVoucherId(res.id);
    try {
      const updated = await apiRequest<HotelReservationDto>(
        `/operations/hotel-reservations/${res.id}/voucher`,
        { method: 'POST' }
      );
      showToast(`Hotel voucher ${updated.currentVoucher?.documentNumber} generated successfully!`);
      await loadOperations(true);
      onRefreshParent?.();
      setViewingVoucherReservation(updated);
    } catch (err: any) {
      showToast(err?.message || 'Failed to generate hotel voucher', 'error');
    } finally {
      setGeneratingVoucherId(null);
    }
  };

  // 3. Hotel Voucher Reissue Handler
  const handleReissueVoucher = async () => {
    if (!reissuingVoucherRes || !reissueReason.trim()) return;
    setReissueSubmitting(true);
    setReissueError(null);

    try {
      const updated = await apiRequest<HotelReservationDto>(
        `/operations/hotel-reservations/${reissuingVoucherRes.id}/reissue-voucher`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: reissueReason.trim() }),
        }
      );
      showToast(`Voucher reissued to v${updated.currentVoucher?.version}`);
      setReissuingVoucherRes(null);
      setReissueReason('');
      await loadOperations(true);
      onRefreshParent?.();
      setViewingVoucherReservation(updated);
    } catch (err: any) {
      setReissueError(err?.message || 'Failed to reissue voucher');
    } finally {
      setReissueSubmitting(false);
    }
  };

  // 4. Transport Assignment Handler
  const handleOpenAssignTransport = (assign: TransportAssignmentDto) => {
    setAssigningTransport(assign);
    setSelectedVehicleId(assign.assignedVehicleId || '');
    setSelectedDriverId(assign.assignedDriverId || '');
    setPickupLocation(assign.pickupLocation || 'Airport / Hotel Pickup');
    setDropLocation(assign.dropLocation || 'Tour Circuit Sightseeing');
    setPickupTime(assign.pickupTime || '09:00 AM');
    setReportingAddress(assign.reportingAddress || '');
    setReassignReason('');
    setAssignError(null);
  };

  const handleSaveTransportAssignment = async () => {
    if (!assigningTransport || !selectedVehicleId || !selectedDriverId) return;
    setAssignSaving(true);
    setAssignError(null);

    try {
      await apiRequest(`/operations/transport-assignments/${assigningTransport.id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({
          vehicleId: selectedVehicleId,
          driverId: selectedDriverId,
          pickupLocation: pickupLocation.trim(),
          dropLocation: dropLocation.trim(),
          pickupTime: pickupTime.trim(),
          reportingAddress: reportingAddress.trim() || undefined,
          reason: reassignReason.trim() || undefined,
        }),
      });

      showToast('Vehicle and driver assigned successfully');
      setAssigningTransport(null);
      await loadOperations(true);
      onRefreshParent?.();
    } catch (err: any) {
      setAssignError(err?.message || 'Failed to assign vehicle/driver');
    } finally {
      setAssignSaving(false);
    }
  };

  // 5. Driver Dispatch Handler
  const handleDispatchTransport = async () => {
    if (!dispatchingAssignment) return;
    setDispatchSaving(true);
    setDispatchError(null);

    try {
      await apiRequest(`/operations/transport-assignments/${dispatchingAssignment.id}/dispatch`, {
        method: 'PATCH',
        body: JSON.stringify({
          dispatchNotes: dispatchNotes.trim() || undefined,
        }),
      });

      showToast('Driver dispatched successfully');
      setDispatchingAssignment(null);
      setDispatchNotes('');
      await loadOperations(true);
      onRefreshParent?.();
    } catch (err: any) {
      setDispatchError(err?.message || 'Failed to dispatch driver');
    } finally {
      setDispatchSaving(false);
    }
  };

  // 6. Complete Transport Leg Handler
  const [completeLegToConfirm, setCompleteLegToConfirm] = useState<TransportAssignmentDto | null>(null);

  const handleCompleteTransportLeg = (assign: TransportAssignmentDto) => {
    setCompleteLegToConfirm(assign);
  };

  const executeCompleteTransportLeg = async () => {
    if (!completeLegToConfirm) return;
    const assign = completeLegToConfirm;
    setCompletingAssignmentId(assign.id);

    try {
      await apiRequest(`/operations/transport-assignments/${assign.id}/complete`, {
        method: 'PATCH',
      });
      showToast('Transport leg completed successfully. Schedule locks released.');
      setCompleteLegToConfirm(null);
      await loadOperations(true);
      onRefreshParent?.();
    } catch (err: any) {
      showToast(err?.message || 'Failed to complete transport leg', 'error');
    } finally {
      setCompletingAssignmentId(null);
    }
  };

  // 7. Transport Duty Slip Generation Handler
  const handleGenerateDutySlip = async (assign: TransportAssignmentDto) => {
    setGeneratingDutySlipId(assign.id);
    try {
      const updated = await apiRequest<TransportAssignmentDto>(
        `/operations/transport-assignments/${assign.id}/duty-slip`,
        { method: 'POST' }
      );
      showToast(`Duty slip ${updated.currentDutySlip?.documentNumber} generated successfully!`);
      await loadOperations(true);
      onRefreshParent?.();
      setViewingDutySlipAssignment(updated);
    } catch (err: any) {
      showToast(err?.message || 'Failed to generate duty slip', 'error');
    } finally {
      setGeneratingDutySlipId(null);
    }
  };

  // 8. Transport Duty Slip Reissue Handler
  const handleReissueDutySlip = async () => {
    if (!reissuingDutySlipAssign || !reissueReason.trim()) return;
    setReissueSubmitting(true);
    setReissueError(null);

    try {
      const updated = await apiRequest<TransportAssignmentDto>(
        `/operations/transport-assignments/${reissuingDutySlipAssign.id}/reissue-duty-slip`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: reissueReason.trim() }),
        }
      );
      showToast(`Duty slip reissued to v${updated.currentDutySlip?.version}`);
      setReissuingDutySlipAssign(null);
      setReissueReason('');
      await loadOperations(true);
      onRefreshParent?.();
      setViewingDutySlipAssignment(updated);
    } catch (err: any) {
      setReissueError(err?.message || 'Failed to reissue duty slip');
    } finally {
      setReissueSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-slate-800">
          Loading Operational Records & Resource Locks...
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          Checking hotel holds, fleet schedule reservations and voucher state
        </p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-900">
          Failed to Load Operations Engine
        </h4>
        <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 mb-4">
          {error || 'No operational summary returned for this booking'}
        </p>
        <button
          onClick={() => loadOperations()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Operations Engine
        </button>
      </div>
    );
  }

  const isCancelledBooking = summary.bookingStatus === 'CANCELLED';

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : 'bg-rose-900 text-rose-100 border-rose-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Explicit Pending Supplier Cancellation Alert Banner */}
      {isCancelledBooking && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-start gap-3 text-amber-950">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <span>Parent Booking is CANCELLED</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-200 text-amber-900 border border-amber-300">
                PENDING SUPPLIER ACKNOWLEDGEMENT
              </span>
            </h4>
            <p className="text-xs text-amber-900/90 leading-relaxed">
              Operational records have been marked as cancelled and fleet schedule locks have been released. However, <strong>supplier cancellation is pending formal property & vendor acknowledgement</strong>. Never imply or represent to customers or management that supplier cancellation penalties or charges have been waived until written supplier confirmation is received.
            </p>
          </div>
        </div>
      )}

      {/* Operational Readiness Dashboard Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          color: '#ffffff',
          padding: '22px 24px',
          borderRadius: '16px',
          border: '1px solid #334155',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '16px', position: 'relative', zIndex: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                OPERATIONS CONTROL DESK
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace', fontWeight: 600 }}>
                {summary.bookingNumber}
              </span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              Tour Readiness & Supplier Execution Status
            </h3>
            <p style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px', marginBottom: 0 }}>
              Guest: <strong style={{ color: '#ffffff' }}>{summary.customerName}</strong> ({summary.customerPhone}) • Tour Window: {formatDate(summary.travelStartDate)} to {formatDate(summary.travelEndDate)}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Readiness Gauge */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Readiness Score</div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#34d399', lineHeight: 1.1 }}>
                {summary.operationalReadinessPercent}%
              </div>
            </div>

            <button
              onClick={() => loadOperations(true)}
              disabled={refreshing}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                background: '#1e293b',
                border: '1px solid #475569',
                color: '#e2e8f0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              title="Refresh operational records"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Readiness Progress Bar */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', position: 'relative', zIndex: 10 }}>
          <div style={{ width: '100%', height: '10px', borderRadius: '9999px', background: '#334155', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div
              style={{
                height: '100%',
                borderRadius: '9999px',
                transition: 'all 0.7s ease',
                width: `${Math.max(5, summary.operationalReadinessPercent)}%`,
                background: summary.operationalReadinessPercent === 100
                  ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                  : summary.operationalReadinessPercent >= 50
                  ? 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'
                  : 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
              }}
            />
          </div>

          <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: summary.allHotelVouchersIssued ? '#34d399' : '#fbbf24', display: 'inline-block' }} />
              <span style={{ color: '#cbd5e1' }}>Hotel Vouchers: <strong style={{ color: '#ffffff' }}>{summary.allHotelVouchersIssued ? 'All Generated' : 'Pending Confirmation'}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: summary.allDriverDutySlipsIssued ? '#34d399' : '#fbbf24', display: 'inline-block' }} />
              <span style={{ color: '#cbd5e1' }}>Driver Duty Slips: <strong style={{ color: '#ffffff' }}>{summary.allDriverDutySlipsIssued ? 'All Generated' : 'Pending Fleet Assignment'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECTION 1: HOTEL RESERVATIONS & VOUCHERS                            */}
      {/* =================================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Hotel Reservations & Property Confirmation
              </h4>
              <p className="text-xs text-slate-500">
                Supplier booking references, meal plans and issued hotel confirmation vouchers
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {summary.hotelReservations.length} Hotel Leg{summary.hotelReservations.length > 1 ? 's' : ''}
          </span>
        </div>

        {summary.hotelReservations.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
            No hotel stays in this booking itinerary snapshot.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {summary.hotelReservations.map((res, idx) => {
              const statusCfg = HOTEL_RESERVATION_STATUS_CONFIG[res.status];
              const isConfirmed = res.status === 'CONFIRMED';
              const hasVoucher = res.voucherIssued && res.currentVoucher;

              return (
                <div
                  key={res.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-slate-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h5 className="text-base font-bold text-slate-900">
                          {res.hotelName || (res as any).hotel?.name || 'Hotel Property'}
                        </h5>
                        <span className="text-xs font-semibold text-slate-500">
                          ({res.hotelCity || (res as any).hotel?.city || 'J&K'})
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Room: <strong className="text-slate-800">{res.roomCategoryName || (res as any).roomCategory?.name || 'Standard Room'}</strong> • Plan: <strong className="text-emerald-700">{res.mealPlan}</strong> • Rooms: <strong>{res.numberOfRooms}</strong> ({res.adultsCount} Adults{res.childrenCount > 0 ? `, ${res.childrenCount} Ch` : ''})
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Check-in: <strong>{formatDate(res.checkInDate)}</strong></span>
                        <span>•</span>
                        <span>Check-out: <strong>{formatDate(res.checkOutDate)}</strong></span>
                        <span>({res.numberOfNights} Nights)</span>
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                        {statusCfg.label}
                      </span>

                      {/* Supplier Confirmation Reference */}
                      {res.supplierConfirmationNumber ? (
                        <span className="text-xs font-mono font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          CONF: {res.supplierConfirmationNumber}
                        </span>
                      ) : isConfirmed ? (
                        <span className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Missing Confirmation #
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Supplier Cancellation Warning (if cancelled) */}
                  {res.status === 'CANCELLED' && res.supplierCancellation && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        <span>Supplier Cancellation Status: {SUPPLIER_CANCELLATION_STATUS_CONFIG[res.supplierCancellation.status]?.label}</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Reason: &quot;{res.supplierCancellation.reason}&quot; • Awaiting hotel formal confirmation and penalty schedule.
                      </p>
                    </div>
                  )}

                  {/* Supplier Cost Confidentiality Notice (Admin only view) */}
                  {userRole === 'ADMIN' && res.supplierCost !== undefined && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 border-t border-slate-100 pt-2">
                      <Info className="w-3 h-3 text-slate-400" />
                      <span>Internal Net Supplier Cost: <strong className="text-slate-700 font-mono">₹{res.supplierCost.toLocaleString('en-IN')}</strong> (Hidden from agents and public)</span>
                    </div>
                  )}

                  {/* Operational Action Controls */}
                  <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {userRole === 'ADMIN' && !isCancelledBooking && res.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleOpenEditReservation(res)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Update Hotel Status / Ref
                        </button>
                      )}

                      {/* Generate Voucher Button */}
                      {userRole === 'ADMIN' && !hasVoucher && !isCancelledBooking && res.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleGenerateHotelVoucher(res)}
                          disabled={!isConfirmed || !res.supplierConfirmationNumber || generatingVoucherId === res.id}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-sm transition"
                          title={!isConfirmed ? 'Reservation must be confirmed by hotel first' : 'Generate voucher'}
                        >
                          {generatingVoucherId === res.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileCheck className="w-3.5 h-3.5" />
                          )}
                          Generate Hotel Voucher
                        </button>
                      )}

                      {/* View Voucher Button */}
                      {hasVoucher && (
                        <button
                          id="view-voucher-btn"
                          onClick={() => setViewingVoucherReservation(res)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Voucher ({res.currentVoucher?.documentNumber})
                        </button>
                      )}

                      {/* Reissue Voucher Button */}
                      {userRole === 'ADMIN' && hasVoucher && !isCancelledBooking && (
                        <button
                          onClick={() => {
                            setReissuingVoucherRes(res);
                            setReissueReason('');
                            setReissueError(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reissue Voucher (v{(res.currentVoucher?.version || 1) + 1})
                        </button>
                      )}
                    </div>

                    {/* Voucher Version Badge */}
                    {hasVoucher && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        Voucher v{res.currentVoucher?.version} • Issued {formatDate(res.currentVoucher?.issuedAt)}
                      </span>
                    )}
                  </div>

                  {/* Reissue History Timeline (if reissued) */}
                  {res.voucherHistory && res.voucherHistory.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <span className="font-bold text-[11px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <History className="w-3.5 h-3.5" />
                        Prior Voucher Reissuance History ({res.voucherHistory.length})
                      </span>
                      <div className="space-y-1 divide-y divide-slate-200/60">
                        {res.voucherHistory.map((vh, vIdx) => (
                          <div key={vIdx} className="pt-1 flex items-center justify-between text-[11px]">
                            <span>
                              v{vh.version} ({formatDate(vh.issuedAt)}): &quot;{vh.reissueReason || 'Amended reservation'}&quot;
                            </span>
                            <span className="font-mono text-slate-400">{vh.documentNumber}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* SECTION 2: TRANSPORT ASSIGNMENTS & DISPATCH                         */}
      {/* =================================================================== */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Transport Fleet, Chauffeurs & Driver Dispatch
              </h4>
              <p className="text-xs text-slate-500">
                Vehicle schedule locks, driver dispatch status and duty slip generation
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {summary.transportAssignments.length} Transport Leg{summary.transportAssignments.length > 1 ? 's' : ''}
          </span>
        </div>

        {summary.transportAssignments.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
            No transport legs configured in this booking itinerary snapshot.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {summary.transportAssignments.map((assign, idx) => {
              const statusCfg = TRANSPORT_ASSIGNMENT_STATUS_CONFIG[assign.status];
              const isAssigned = ['ASSIGNED', 'DISPATCHED', 'IN_TRANSIT', 'COMPLETED'].includes(assign.status);
              const hasDutySlip = assign.dutySlipIssued && assign.currentDutySlip;
              const isDispatched = assign.status === 'DISPATCHED' || assign.status === 'IN_TRANSIT';

              return (
                <div
                  key={assign.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-slate-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h5 className="text-base font-bold text-slate-900">
                          {assign.pickupLocation || 'Airport / Station'} ➔ {assign.dropLocation || 'Sightseeing Circuit'}
                        </h5>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Tour Dates: <strong>{formatDate(assign.startDate)}</strong> to <strong>{formatDate(assign.endDate)}</strong></span>
                        {assign.pickupTime && (
                          <>
                            <span>•</span>
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Pickup: <strong>{assign.pickupTime}</strong></span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Assigned Fleet & Driver Badge Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Assigned Vehicle
                      </span>
                      {assign.assignedVehicleId ? (
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-slate-900">
                            {assign.vehicleModel || 'Vehicle Model'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            {assign.vehicleRegistrationNumber || 'REG-PENDING'}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-amber-700 font-medium">
                          No vehicle assigned yet
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Assigned Chauffeur / Driver
                      </span>
                      {assign.assignedDriverId ? (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-slate-900">
                            {assign.driverName || 'Driver Name'}
                          </span>
                          {assign.driverMobile && (
                            <span className="text-xs text-slate-600 font-mono">
                              ({assign.driverMobile})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-amber-700 font-medium">
                          No driver assigned yet
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Supplier Cancellation Notice (if cancelled) */}
                  {assign.status === 'CANCELLED' && assign.supplierCancellation && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        <span>Transport Cancellation: {SUPPLIER_CANCELLATION_STATUS_CONFIG[assign.supplierCancellation.status]?.label}</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Reason: &quot;{assign.supplierCancellation.reason}&quot; • Schedule reservation locks released.
                      </p>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {userRole === 'ADMIN' && !isCancelledBooking && assign.status !== 'CANCELLED' && assign.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleOpenAssignTransport(assign)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
                        >
                          <Car className="w-3.5 h-3.5" />
                          {assign.assignedVehicleId ? 'Reassign Cab & Driver' : 'Assign Cab & Driver'}
                        </button>
                      )}

                      {/* Dispatch Driver Action */}
                      {userRole === 'ADMIN' && assign.status === 'ASSIGNED' && !isCancelledBooking && (
                        <button
                          onClick={() => {
                            setDispatchingAssignment(assign);
                            setDispatchNotes('');
                            setDispatchError(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Dispatch Driver
                        </button>
                      )}

                      {/* Complete Leg Action */}
                      {userRole === 'ADMIN' && isDispatched && !isCancelledBooking && (
                        <button
                          onClick={() => handleCompleteTransportLeg(assign)}
                          disabled={completingAssignmentId === assign.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                        >
                          {completingAssignmentId === assign.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Mark Leg Completed
                        </button>
                      )}

                      {/* Generate Duty Slip Action */}
                      {userRole === 'ADMIN' && !hasDutySlip && isAssigned && !isCancelledBooking && assign.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleGenerateDutySlip(assign)}
                          disabled={!assign.assignedVehicleId || !assign.assignedDriverId || generatingDutySlipId === assign.id}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition"
                        >
                          {generatingDutySlipId === assign.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileCheck className="w-3.5 h-3.5" />
                          )}
                          Generate Duty Slip
                        </button>
                      )}

                      {/* View Duty Slip Action */}
                      {hasDutySlip && (
                        <button
                          id="view-duty-slip-btn"
                          onClick={() => setViewingDutySlipAssignment(assign)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-300 hover:bg-blue-100 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Duty Slip ({assign.currentDutySlip?.documentNumber})
                        </button>
                      )}

                      {/* Reissue Duty Slip Action */}
                      {userRole === 'ADMIN' && hasDutySlip && !isCancelledBooking && assign.status !== 'COMPLETED' && (
                        <button
                          onClick={() => {
                            setReissuingDutySlipAssign(assign);
                            setReissueReason('');
                            setReissueError(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reissue Duty Slip (v{(assign.currentDutySlip?.version || 1) + 1})
                        </button>
                      )}
                    </div>

                    {/* Duty Slip Version Notice */}
                    {hasDutySlip && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        Duty Slip v{assign.currentDutySlip?.version} • Issued {formatDate(assign.currentDutySlip?.issuedAt)}
                      </span>
                    )}
                  </div>

                  {/* Assignment History (if reassigned) */}
                  {assign.assignmentHistory && assign.assignmentHistory.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <span className="font-bold text-[11px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <History className="w-3.5 h-3.5" />
                        Chauffeur / Fleet Reassignment History ({assign.assignmentHistory.length})
                      </span>
                      <div className="space-y-1 divide-y divide-slate-200/60">
                        {assign.assignmentHistory.map((ah, hIdx) => (
                          <div key={hIdx} className="pt-1 flex items-center justify-between text-[11px]">
                            <span>
                              {formatDate(ah.reassignedAt)}: &quot;{ah.reason}&quot;
                            </span>
                            <span className="text-slate-400">Previous: {ah.previousStatus}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Duty Slip Reissue History */}
                  {assign.dutySlipHistory && assign.dutySlipHistory.length > 0 && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <span className="font-bold text-[11px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <History className="w-3.5 h-3.5" />
                        Duty Slip Reissue History ({assign.dutySlipHistory.length})
                      </span>
                      <div className="space-y-1 divide-y divide-slate-200/60">
                        {assign.dutySlipHistory.map((dh, dIdx) => (
                          <div key={dIdx} className="pt-1 flex items-center justify-between text-[11px]">
                            <span>
                              v{dh.version} ({formatDate(dh.issuedAt)}): &quot;{dh.reissueReason}&quot;
                            </span>
                            <span className="font-mono text-slate-400">{dh.documentNumber}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* MODAL 1: EDIT HOTEL RESERVATION STATUS / CONFIRMATION REF          */}
      {/* =================================================================== */}
      {editingReservation && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-base font-bold text-slate-900">
                Update Hotel Reservation Status
              </h4>
              <button
                onClick={() => setEditingReservation(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Supplier Confirmation Status
                </label>
                <select
                  value={resStatus}
                  onChange={(e) => setResStatus(e.target.value as HotelReservationStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="PENDING">PENDING — Waiting for Hotel Reservation</option>
                  <option value="REQUESTED">REQUESTED — Sent to Hotel Property</option>
                  <option value="CONFIRMED">CONFIRMED — Guaranteed by Hotel (Enables Voucher)</option>
                  <option value="REJECTED">REJECTED — Hotel Sold Out / Unavailable</option>
                  <option value="CANCELLED">CANCELLED — Stay Cancelled</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Supplier Confirmation Number {resStatus === 'CONFIRMED' && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  placeholder="e.g. HOTEL-CONF-98214"
                  value={resConfNumber}
                  onChange={(e) => setResConfNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <span className="text-[11px] text-slate-400">
                  Required when setting status to CONFIRMED. Printed on official guest voucher.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Hotel Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="Front Desk Manager"
                    value={resContactPerson}
                    onChange={(e) => setResContactPerson(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Hotel Phone / Mobile
                  </label>
                  <input
                    type="text"
                    placeholder="+919419..."
                    value={resContactPhone}
                    onChange={(e) => setResContactPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Special Requests / Guest Notes (Printed on Voucher)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Non-smoking room, high floor, quiet wing"
                  value={resSpecialRequests}
                  onChange={(e) => setResSpecialRequests(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Internal Operations Notes (Confidential)
                </label>
                <textarea
                  rows={2}
                  placeholder="Internal settlement notes, rate verification or manager remarks"
                  value={resNotes}
                  onChange={(e) => setResNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingReservation(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReservation}
                disabled={resSaving || (resStatus === 'CONFIRMED' && !resConfNumber.trim())}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition shadow-sm"
              >
                {resSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Reservation Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: ASSIGN VEHICLE & DRIVER (WITH ELIGIBILITY CHECKS)         */}
      {/* =================================================================== */}
      {assigningTransport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {assigningTransport.assignedVehicleId ? 'Reassign Fleet & Driver' : 'Assign Vehicle & Driver'}
                </h4>
                <p className="text-xs text-slate-500">
                  Tour leg: {formatDate(assigningTransport.startDate)} to {formatDate(assigningTransport.endDate)}
                </p>
              </div>
              <button
                onClick={() => setAssigningTransport(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{assignError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Vehicle Selection */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Select Tour Cab / Vehicle <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Choose Available Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.model} ({v.registrationNumber}) • {v.category} • Capacity: {v.seatingCapacity} Pax • [{v.status}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Driver Selection */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Select Chauffeur / Driver <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Choose Verified Driver --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.mobile}) • DL: {d.licenseNumber} • [{d.status}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Pickup & Drop Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Pickup Location
                  </label>
                  <input
                    type="text"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Drop / Circuit Location
                  </label>
                  <input
                    type="text"
                    value={dropLocation}
                    onChange={(e) => setDropLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Reporting Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 09:00 AM"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Reporting Address
                  </label>
                  <input
                    type="text"
                    placeholder="Hotel Lobby / Airport Gate"
                    value={reportingAddress}
                    onChange={(e) => setReportingAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Reassignment Reason (if reassigning) */}
              {assigningTransport.assignedVehicleId && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Reassignment Reason <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vehicle breakdown, driver medical leave, guest request"
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-[11px] text-slate-400">
                    Recorded in immutable assignment history.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setAssigningTransport(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTransportAssignment}
                disabled={assignSaving || !selectedVehicleId || !selectedDriverId}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition shadow-sm"
              >
                {assignSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Lock Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: DISPATCH DRIVER                                            */}
      {/* =================================================================== */}
      {dispatchingAssignment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-600" />
                Dispatch Driver to Tour Circuit
              </h4>
              <button
                onClick={() => setDispatchingAssignment(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {dispatchError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{dispatchError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs text-slate-700">
              <p>
                You are authorizing the dispatch of driver <strong>{dispatchingAssignment.driverName}</strong> with vehicle <strong>{dispatchingAssignment.vehicleRegistrationNumber}</strong> for tour pickup.
              </p>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Dispatch Notes / Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Flight arrives at 11:20 AM. Hold guest name placard at Gate 2."
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDispatchingAssignment(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatchTransport}
                disabled={dispatchSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition shadow-sm"
              >
                {dispatchSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Driver Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: REISSUE DOCUMENT MODAL (REASON PROMPT)                     */}
      {/* =================================================================== */}
      {(reissuingVoucherRes || reissuingDutySlipAssign) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                {reissuingVoucherRes ? 'Reissue Hotel Voucher' : 'Reissue Transport Duty Slip'}
              </h4>
              <button
                onClick={() => {
                  setReissuingVoucherRes(null);
                  setReissuingDutySlipAssign(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reissueError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reissueError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs text-slate-700">
              <p>
                Reissuing will increment the document version and archive the previous issued snapshot into immutable version history.
              </p>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Reason for Document Reissuance <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Customer upgraded room category, chauffeur reassigned due to flight delay"
                  value={reissueReason}
                  onChange={(e) => setReissueReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setReissuingVoucherRes(null);
                  setReissuingDutySlipAssign(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={reissuingVoucherRes ? handleReissueVoucher : handleReissueDutySlip}
                disabled={reissueSubmitting || !reissueReason.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white transition shadow-sm"
              >
                {reissueSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Reissuance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PRINTABLE DOCUMENT VIEWERS                                          */}
      {/* =================================================================== */}
      {viewingVoucherReservation && (
        <HotelVoucherModal
          isOpen={true}
          onClose={() => setViewingVoucherReservation(null)}
          reservation={viewingVoucherReservation}
          bookingNumber={summary.bookingNumber}
        />
      )}

      {viewingDutySlipAssignment && (
        <TransportDutySlipModal
          isOpen={true}
          onClose={() => setViewingDutySlipAssignment(null)}
          assignment={viewingDutySlipAssignment}
          bookingNumber={summary.bookingNumber}
        />
      )}

      {/* Modern Complete Leg Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(completeLegToConfirm)}
        title="Complete Transport Leg"
        variant="primary"
        confirmLabel="Mark as Completed"
        cancelLabel="Cancel"
        isLoading={Boolean(completingAssignmentId)}
        onCancel={() => {
          if (!completingAssignmentId) setCompleteLegToConfirm(null);
        }}
        onConfirm={executeCompleteTransportLeg}
        message={
          completeLegToConfirm && (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">
                Mark transport leg <strong>#{completeLegToConfirm.transportItemIndex + 1}</strong> as <strong>COMPLETED</strong>?
              </p>
              <p className="text-xs text-slate-500">
                This will safely mark the duty as fulfilled and release vehicle and driver schedule locks.
              </p>
            </div>
          )
        }
      />
    </div>
  );
}
