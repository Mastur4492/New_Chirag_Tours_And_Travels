import { z } from 'zod';
import { imageUrlOrPathSchema } from './common.schema';

export const MAX_MONETARY_RUPEES = 100_000_000; // ₹10 Crore maximum per single transaction

export const monetaryAmountSchema = z
  .number({ invalid_type_error: 'Amount must be a valid number' })
  .finite('Amount must be a finite number')
  .positive('Payment amount must be greater than 0')
  .max(
    MAX_MONETARY_RUPEES,
    `Amount cannot exceed ₹${(MAX_MONETARY_RUPEES / 10_000_000).toFixed(0)} Crore`
  )
  .refine(
    (val) => Number.isSafeInteger(Math.round(val * 100)),
    'Amount in paise must be a safe integer'
  );

export const paymentTypeEnum = z.enum([
  'ADVANCE',
  'PARTIAL',
  'FINAL_BALANCE',
  'SECURITY_DEPOSIT',
  'REFUND',
]);

export const paymentMethodEnum = z.enum([
  'UPI',
  'NEFT_IMPS',
  'BANK_DEPOSIT',
  'CASH',
  'CHEQUE',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'OTHER',
]);

export const paymentStatusEnum = z.enum(['SUBMITTED', 'VERIFIED', 'REJECTED']);

export const recordPaymentSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  amount: monetaryAmountSchema,
  paymentType: paymentTypeEnum,
  paymentMethod: paymentMethodEnum,
  transactionReference: z.string().trim().max(100).optional(),
  paymentDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  proofDocumentUrl: imageUrlOrPathSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
  isRefund: z.boolean().optional(),
  originalPaymentId: z.string().optional(),
  refundReason: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().trim().max(100).optional(),
});

export const recordRefundSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  originalPaymentId: z.string().min(1, 'Original payment ID is required'),
  amount: monetaryAmountSchema,
  refundReason: z.string().trim().min(3, 'Refund reason is required (min 3 characters)').max(500),
  paymentMethod: paymentMethodEnum.optional(),
  transactionReference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
  idempotencyKey: z.string().trim().max(100).optional(),
});

export const verifyPaymentSchema = z.object({
  decision: z.enum(['VERIFY', 'REJECT']),
  rejectionReason: z.string().trim().max(500).optional(),
  reason: z.string().trim().max(500).optional(),
  settlementReference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});

