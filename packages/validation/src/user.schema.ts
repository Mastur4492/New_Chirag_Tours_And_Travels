import { z } from 'zod';
import { emailSchema, mobileSchema } from './common.schema';

export const agentProfileSchema = z.object({
  agencyName: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  maxDiscountPercent: z.number().min(0).max(50).default(5),
  maxMarkupPercent: z.number().min(0).max(100).default(20),
  canApproveFinalPrice: z.boolean().default(false),
  commissionRatePercent: z.number().min(0).max(50).optional(),
});

export const createAgentSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  mobile: mobileSchema,
  email: emailSchema.optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  agentProfile: agentProfileSchema.optional(),
});

export const updateAgentPermissionsSchema = z.object({
  maxDiscountPercent: z.number().min(0).max(50),
  maxMarkupPercent: z.number().min(0).max(100),
  canApproveFinalPrice: z.boolean(),
  commissionRatePercent: z.number().min(0).max(50).optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
});

export const updateAgentProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100).optional(),
  email: emailSchema.optional().nullable(),
  agentProfile: z
    .object({
      agencyName: z.string().trim().max(100).optional(),
      city: z.string().trim().max(100).optional(),
    })
    .optional(),
});

export const adminResetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentPermissionsInput = z.infer<typeof updateAgentPermissionsSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateAgentProfileInput = z.infer<typeof updateAgentProfileSchema>;
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
