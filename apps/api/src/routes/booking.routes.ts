import { updateBookingStatusSchema } from '@chirag/validation';
import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

// Apply authentication to all booking routes
router.use(authenticate);

// List bookings with pagination, search, and status filters (ADMIN sees all, AGENT sees assigned)
router.get(
  '/',
  requireRole('ADMIN', 'AGENT'),
  bookingController.listBookings
);

// Aggregated status metrics
router.get(
  '/metrics',
  requireRole('ADMIN', 'AGENT'),
  bookingController.getBookingMetrics
);

// Get single booking details
router.get(
  '/:id',
  requireRole('ADMIN', 'AGENT'),
  bookingController.getBookingById
);

// Update booking status (ADMIN only, e.g. CONFIRMED, CANCELLED)
router.patch(
  '/:id/status',
  requireRole('ADMIN'),
  validateRequest({ body: updateBookingStatusSchema }),
  bookingController.updateBookingStatus
);

export const bookingRouter = router;
