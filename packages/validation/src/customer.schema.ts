import { z } from 'zod';
import { emailSchema, mongoIdSchema, phoneSchema } from './common.schema';

export const leadSourceSchema = z.enum([
  'ADMIN_DIRECT',
  'CUSTOMER_WEB',
  'CUSTOMER_APP',
  'AGENT',
  'PHONE',
  'WALK_IN',
  'OTHER',
]);

export const createCustomerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  mobile: phoneSchema,
  email: emailSchema.optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
  source: leadSourceSchema.default('ADMIN_DIRECT'),
  assignedAgentId: mongoIdSchema.optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();
