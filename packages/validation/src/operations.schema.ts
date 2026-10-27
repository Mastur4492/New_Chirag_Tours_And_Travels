import { z } from 'zod';

export const hotelReservationStatusEnum = z.enum([
  'PENDING',
  'REQUESTED',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
]);

export const transportAssignmentStatusEnum = z.enum([
  'UNASSIGNED',
  'ASSIGNED',
  'DISPATCHED',
  'IN_TRANSIT',
  'COMPLETED',
  'CANCELLED',
]);

export const updateHotelReservationSchema = z.object({
  status: hotelReservationStatusEnum.optional(),
  supplierConfirmationNumber: z.string().trim().max(100).optional(),
  supplierContactPerson: z.string().trim().max(100).optional(),
  supplierContactPhone: z.string().trim().max(25).optional(),
  specialRequests: z.string().trim().max(500).optional(),
  internalNotes: z.string().trim().max(1000).optional(),
});

export const assignTransportSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  driverId: z.string().min(1, 'Driver ID is required'),
  pickupLocation: z.string().trim().max(200).optional(),
  dropLocation: z.string().trim().max(200).optional(),
  pickupTime: z.string().trim().max(50).optional(),
  reportingAddress: z.string().trim().max(300).optional(),
  reason: z.string().trim().max(500).optional(),
  internalNotes: z.string().trim().max(1000).optional(),
});

export const dispatchTransportSchema = z.object({
  dispatchNotes: z.string().trim().max(1000).optional(),
});

export const reissueDocumentSchema = z.object({
  reason: z.string().trim().min(3, 'Reissue reason must be at least 3 characters').max(500),
  notes: z.string().trim().max(1000).optional(),
});
