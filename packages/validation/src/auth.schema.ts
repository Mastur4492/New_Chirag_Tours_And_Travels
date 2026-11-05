import { z } from 'zod';
import { emailSchema, mobileSchema } from './common.schema';

export const loginSchema = z.object({
  mobile: mobileSchema,
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must not exceed 100 characters'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(100, 'New password must not exceed 100 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  email: emailSchema.optional().nullable(),
  mobile: mobileSchema.optional(),
  agencyName: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
});

export const updateTravelerPublicSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  mobile: mobileSchema,
  email: emailSchema.optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateTravelerPublicInput = z.infer<typeof updateTravelerPublicSchema>;
