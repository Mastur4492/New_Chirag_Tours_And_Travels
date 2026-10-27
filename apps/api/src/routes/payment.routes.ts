import {
  recordPaymentSchema,
  recordRefundSchema,
  verifyPaymentSchema,
} from '@chirag/validation';
import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

// Apply authentication to all payment routes
router.use(authenticate);

// Record a manual payment (SUBMITTED status, does not affect balance pending)
router.post(
  '/',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ body: recordPaymentSchema }),
  paymentController.recordPayment
);

// Record a refund against a verified payment (SUBMITTED status, atomic reservation)
router.post(
  '/refund',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ body: recordRefundSchema }),
  paymentController.recordRefund
);

// Verify a submitted payment or refund (ADMIN only, recalculates verified ledger)
router.post(
  '/:id/verify',
  requireRole('ADMIN'),
  paymentController.verifyPayment
);

// Reject a submitted payment or refund (ADMIN only, releases reserved paise if refund)
router.post(
  '/:id/reject',
  requireRole('ADMIN'),
  paymentController.rejectPayment
);

// Handle decision (VERIFY or REJECT with schema validation)
router.post(
  '/:id/decision',
  requireRole('ADMIN'),
  validateRequest({ body: verifyPaymentSchema }),
  paymentController.handleDecision
);

// Reconcile and self-heal refund allocations for a payment (ADMIN only, recovery tool)
router.post(
  '/:id/reconcile-refunds',
  requireRole('ADMIN'),
  paymentController.reconcileRefunds
);

// List payment ledger and verified summary for a booking
router.get(
  '/booking/:bookingId',
  requireRole('ADMIN', 'AGENT'),
  paymentController.getPaymentsForBooking
);

// Get single payment record details
router.get(
  '/:id',
  requireRole('ADMIN', 'AGENT'),
  paymentController.getPaymentById
);

export const paymentRouter = router;
