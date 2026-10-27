import { z } from 'zod';

export const bookingStatusEnum = z.enum([
  'QUOTE_ACCEPTED',
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'OPERATIONAL_PREPARATION',
  'IN_TRIP',
  'COMPLETED',
  'CANCELLED',
]);

export const createBookingFromQuotationSchema = z.object({
  quotationId: z.string().min(1, 'Quotation ID is required'),
  quotationVersion: z.number().int().min(1, 'Quotation version must be at least 1'),
  advancePercentage: z.number().min(0).max(100).optional(),
  customerNotes: z.string().max(1000).optional(),
  internalNotes: z.string().max(1000).optional(),
});

export const updateBookingStatusSchema = z.object({
  status: bookingStatusEnum,
  cancellationReason: z.string().trim().max(500).optional(),
  cancellationFee: z
    .number({ invalid_type_error: 'Cancellation fee must be a valid number' })
    .finite('Cancellation fee must be a finite number')
    .min(0, 'Cancellation fee cannot be negative')
    .max(100_000_000, 'Cancellation fee cannot exceed ₹10 Crore')
    .refine(
      (val) => Number.isSafeInteger(Math.round(val * 100)),
      'Cancellation fee in paise must be a safe integer'
    )
    .optional(),
  notes: z.string().trim().max(1000).optional(),
});
