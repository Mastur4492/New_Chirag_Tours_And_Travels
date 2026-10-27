import { z } from 'zod';

export const taxConfigTypeSchema = z.enum(['GST', 'VAT', 'CUSTOM', 'ZERO_RATED', 'EXEMPT']);

export const createTaxConfigSchema = z.object({
  name: z.string().trim().min(2, 'Tax rule name is required').max(100),
  taxType: taxConfigTypeSchema.default('GST'),
  ratePercent: z
    .number()
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%'),
  isApplicable: z.boolean().default(true),
  jurisdiction: z.string().trim().min(2).max(50).default('IN'),
  description: z.string().trim().max(500).optional(),
  isDefault: z.boolean().default(false),
  isConfirmed: z.boolean().default(false),
});


export const updateTaxConfigSchema = createTaxConfigSchema.partial();
