import { MealPlan } from './hotel';
import { VehicleCategory } from './vehicle';

export type HotelReservationStatus =
  | 'PENDING'
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED';

export type TransportAssignmentStatus =
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export type SupplierCancellationStatus =
  | 'PENDING_SUPPLIER_ACKNOWLEDGEMENT'
  | 'SUPPLIER_CONFIRMED'
  | 'SUPPLIER_PENALTY_DISPUTED';

export interface IDocumentSnapshotDto {
  documentNumber: string;
  version: number;
  issuedAt: string;
  issuedBy: string;
  issuedByName?: string;
  reissueReason?: string;
  documentSnapshot: Record<string, unknown>;
}

export interface HotelReservationDto {
  id: string;
  bookingId: string;
  bookingNumber: string;
  hotelId: string;
  hotelName?: string;
  hotelCity?: string;
  roomCategoryId: string;
  roomCategoryName?: string;
  hotelItemIndex: number;
  checkInDate: string;
  checkOutDate: string;
  numberOfNights: number;
  numberOfRooms: number;
  mealPlan: MealPlan;
  adultsCount: number;
  childrenCount: number;
  status: HotelReservationStatus;
  supplierConfirmationNumber?: string;
  supplierContactPerson?: string;
  supplierContactPhone?: string;
  specialRequests?: string;
  supplierCost?: number; // Confidential: ADMIN only
  voucherIssued: boolean;
  currentVoucher?: IDocumentSnapshotDto;
  voucherHistory?: IDocumentSnapshotDto[];
  supplierCancellation?: {
    status: SupplierCancellationStatus;
    requestedAt?: string;
    requestedBy?: string;
    reason?: string;
    supplierConfirmationReference?: string;
    acknowledgedAt?: string;
  };
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransportAssignmentHistoryDto {
  previousVehicleId?: string;
  previousDriverId?: string;
  previousVendorId?: string;
  reassignedAt: string;
  reassignedBy: string;
  reason?: string;
  previousStatus?: string;
}

export interface TransportAssignmentDto {
  id: string;
  bookingId: string;
  bookingNumber: string;
  transportItemIndex: number;
  assignedVehicleId?: string;
  vehicleRegistrationNumber?: string;
  vehicleModel?: string;
  vehicleCategory?: VehicleCategory;
  assignedDriverId?: string;
  driverName?: string;
  driverMobile?: string;
  driverLicenseNumber?: string;
  assignedVendorId?: string;
  vendorName?: string;
  status: TransportAssignmentStatus;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  dropLocation: string;
  pickupTime?: string;
  reportingAddress?: string;
  dutySlipIssued: boolean;
  currentDutySlip?: IDocumentSnapshotDto;
  dutySlipHistory?: IDocumentSnapshotDto[];
  assignmentHistory?: TransportAssignmentHistoryDto[];
  dispatchedAt?: string;
  dispatchedBy?: string;
  dispatchNotes?: string;
  supplierCancellation?: {
    status: SupplierCancellationStatus;
    requestedAt?: string;
    requestedBy?: string;
    reason?: string;
    supplierConfirmationReference?: string;
    acknowledgedAt?: string;
  };
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalSummaryDto {
  bookingId: string;
  bookingNumber: string;
  bookingStatus: string;
  travelStartDate: string;
  travelEndDate: string;
  customerName?: string;
  customerPhone?: string;
  hotelReservations: HotelReservationDto[];
  transportAssignments: TransportAssignmentDto[];
  allHotelVouchersIssued: boolean;
  allDriverDutySlipsIssued: boolean;
  operationalReadinessPercent: number;
}

export interface UpdateHotelReservationInput {
  status?: HotelReservationStatus;
  supplierConfirmationNumber?: string;
  supplierContactPerson?: string;
  supplierContactPhone?: string;
  specialRequests?: string;
  internalNotes?: string;
}

export interface AssignTransportInput {
  vehicleId: string;
  driverId: string;
  pickupLocation?: string;
  dropLocation?: string;
  pickupTime?: string;
  reportingAddress?: string;
  reason?: string;
  internalNotes?: string;
}

export interface DispatchTransportInput {
  dispatchNotes?: string;
}

export interface ReissueDocumentInput {
  reason: string;
  notes?: string;
}
