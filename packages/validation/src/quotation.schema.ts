import { z } from 'zod';
import { mongoIdSchema } from './common.schema';
import { mealPlanSchema } from './hotel.schema';

export const quotationStatusSchema = z.enum([
  'DRAFT',
  'PENDING_ADMIN_APPROVAL',
  'APPROVED',
  'ISSUED',
  'SENT',
  'ACCEPTED',
  'REVISED',
  'EXPIRED',
  'REJECTED',
]);

export const transportPricingBasisSchema = z.enum(['PER_DAY', 'PER_KM', 'FIXED_CIRCUIT']);

export const createQuotationHotelSchema = z.object({
  hotelId: mongoIdSchema,
  roomCategoryId: mongoIdSchema,
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'checkInDate must be YYYY-MM-DD'),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'checkOutDate must be YYYY-MM-DD'),
  numberOfRooms: z.number().int().min(1, 'At least 1 room required').default(1),
  adultsCount: z.number().int().min(1, 'At least 1 adult required').default(2),
  childrenWithBedCount: z.number().int().min(0).default(0),
  childrenWithoutBedCount: z.number().int().min(0).default(0),
  mealPlan: mealPlanSchema.default('CP'),
});

export const createQuotationTransportSchema = z.object({
  vehicleId: mongoIdSchema.optional(),
  tariffId: mongoIdSchema.optional(),
  pricingBasis: transportPricingBasisSchema,
  numberOfDays: z.number().int().min(1).optional(),
  estimatedKm: z.number().min(0).optional(),
  driverAllowanceDays: z.number().int().min(0).optional(),
  nightHaltDays: z.number().int().min(0).optional(),
  tollsAndParking: z.number().min(0).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const createQuotationSchema = z.object({
  leadId: mongoIdSchema,
  destinationId: mongoIdSchema,
  packageId: mongoIdSchema.optional(),
  travelStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'travelStartDate must be YYYY-MM-DD'),
  travelEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'travelEndDate must be YYYY-MM-DD'),
  numberOfAdults: z.number().int().min(1, 'At least 1 adult required').default(2),
  numberOfChildren: z.number().int().min(0).default(0),
  numberOfInfants: z.number().int().min(0).default(0),
  hotels: z.array(createQuotationHotelSchema).default([]),
  transports: z.array(createQuotationTransportSchema).default([]),
  markupType: z.enum(['PERCENT', 'FLAT']).default('PERCENT'),
  markupPercent: z.number().min(0, 'Markup cannot be negative').max(100).optional().default(10),
  markupAmount: z.number().min(0, 'Markup amount cannot be negative').optional(),
  discountType: z.enum(['PERCENT', 'FLAT']).default('PERCENT'),
  discountPercent: z.number().min(0, 'Discount cannot be negative').max(100).optional().default(0),
  discountAmount: z.number().min(0, 'Discount amount cannot be negative').optional(),
  isTaxApplicable: z.boolean().default(true),
  taxRatePercent: z.number().min(0).max(100).optional(),
  inclusions: z.array(z.string().trim()).default([]),
  exclusions: z.array(z.string().trim()).default([]),
  terms: z.array(z.string().trim()).default([]),
  notes: z.string().trim().max(2000).optional(),
  validityDays: z.number().int().min(1).max(90).default(7),
});

export const reviseQuotationSchema = createQuotationSchema.extend({
  changeReason: z.string().trim().min(3, 'Change reason must be at least 3 characters').max(500),
});

export const approveQuotationSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().trim().max(500).optional(),
});

export const tokenParamSchema = z.object({
  token: z.string().trim().min(16, 'Token too short').max(128),
});

export const requestModificationSchema = z.object({
  message: z.string().trim().min(3, 'Message must be at least 3 characters').max(2000),
});

export const customerAcceptQuotationSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});
