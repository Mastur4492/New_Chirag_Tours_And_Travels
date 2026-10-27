import {
  assignTransportSchema,
  dispatchTransportSchema,
  reissueDocumentSchema,
  updateHotelReservationSchema,
} from '@chirag/validation';
import { Router } from 'express';
import { operationsController } from '../controllers/operations.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

// Require authentication for all operational routes
router.use(authenticate);

// 1. Booking Operations Initialization & Summary
router.post(
  '/bookings/:bookingId/initialize',
  requireRole('ADMIN', 'AGENT'),
  operationsController.initializeOperations
);

router.get(
  '/bookings/:bookingId',
  requireRole('ADMIN', 'AGENT'),
  operationsController.getOperationalSummary
);

// 2. Hotel Reservations & Vouchers
router.patch(
  '/hotel-reservations/:id',
  requireRole('ADMIN'),
  validateRequest({ body: updateHotelReservationSchema }),
  operationsController.updateHotelReservation
);

router.post(
  '/hotel-reservations/:id/voucher',
  requireRole('ADMIN'),
  operationsController.generateHotelVoucher
);

router.post(
  '/hotel-reservations/:id/reissue-voucher',
  requireRole('ADMIN'),
  validateRequest({ body: reissueDocumentSchema }),
  operationsController.reissueHotelVoucher
);

// 3. Transport Assignments & Duty Slips
router.patch(
  '/transport-assignments/:id/assign',
  requireRole('ADMIN'),
  validateRequest({ body: assignTransportSchema }),
  operationsController.assignTransport
);

router.patch(
  '/transport-assignments/:id/dispatch',
  requireRole('ADMIN'),
  validateRequest({ body: dispatchTransportSchema }),
  operationsController.dispatchTransport
);

router.post(
  '/transport-assignments/:id/duty-slip',
  requireRole('ADMIN'),
  operationsController.generateTransportDutySlip
);

router.post(
  '/transport-assignments/:id/reissue-duty-slip',
  requireRole('ADMIN'),
  validateRequest({ body: reissueDocumentSchema }),
  operationsController.reissueTransportDutySlip
);

router.patch(
  '/transport-assignments/:id/complete',
  requireRole('ADMIN'),
  operationsController.completeTransportAssignment
);

export const operationsRouter = router;
