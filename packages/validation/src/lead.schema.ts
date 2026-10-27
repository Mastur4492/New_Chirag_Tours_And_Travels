import { z } from 'zod';
import { mongoIdSchema, phoneSchema } from './common.schema';
import { leadSourceSchema } from './customer.schema';

export const leadStatusSchema = z.enum([
  'NEW',
  'ASSIGNED',
  'CONTACTED',
  'QUOTED',
  'NEGOTIATING',
  'CONVERTED',
  'LOST',
  'JUNK',
]);

export const createLeadSchema = z.object({
  customerId: mongoIdSchema,
  destinationId: mongoIdSchema,
  packageId: mongoIdSchema.optional(),
  tentativeTravelDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  durationNights: z.number().int().min(1).optional(),
  numberOfAdults: z.number().int().min(1, 'At least 1 adult required').default(2),
  numberOfChildren: z.number().int().min(0).default(0),
  budgetEstimate: z.number().min(0).optional(),
  specialRequirements: z.string().trim().max(2000).optional(),
  source: leadSourceSchema.default('ADMIN_DIRECT'),
  assignedAgentId: mongoIdSchema.optional(),
  nextFollowUpDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  followUpNotes: z.string().trim().max(1000).optional(),
});

export const updateLeadSchema = z.object({
  destinationId: mongoIdSchema.optional(),
  packageId: mongoIdSchema.optional(),
  tentativeTravelDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  durationNights: z.number().int().min(1).optional(),
  numberOfAdults: z.number().int().min(1).optional(),
  numberOfChildren: z.number().int().min(0).optional(),
  budgetEstimate: z.number().min(0).optional(),
  specialRequirements: z.string().trim().max(2000).optional(),
  status: leadStatusSchema.optional(),
  lostReason: z.string().trim().max(500).optional(),
  nextFollowUpDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  followUpNotes: z.string().trim().max(1000).optional(),
});

export const assignLeadSchema = z.object({
  assignedAgentId: mongoIdSchema,
});

export const updateLeadFollowUpSchema = z.object({
  nextFollowUpDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  followUpNotes: z.string().trim().max(1000).optional(),
});

export const leadTimelineEventTypeSchema = z.enum([
  'NOTE',
  'STATUS_CHANGE',
  'ASSIGNMENT',
  'QUOTATION_CREATED',
  'QUOTATION_REVISED',
  'QUOTATION_ACCEPTED',
  'MODIFICATION_REQUESTED',
]);

export const addLeadActivitySchema = z.object({
  type: leadTimelineEventTypeSchema.default('NOTE'),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().max(2000).optional(),
});

export const publicEnquirySchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  mobile: phoneSchema,
  email: z.string().trim().email('Invalid email address format').toLowerCase().optional().or(z.literal('')),
  destinationId: mongoIdSchema,
  packageId: mongoIdSchema.optional().or(z.literal('')),
  tentativeTravelDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().or(z.literal('')),
  durationNights: z.coerce.number().int().min(1).max(60).optional(),
  numberOfAdults: z.coerce.number().int().min(1, 'At least 1 adult required').max(50).default(2),
  numberOfChildren: z.coerce.number().int().min(0).max(30).default(0),
  budgetEstimate: z.coerce.number().min(0).optional(),
  specialRequirements: z.string().trim().max(2000).optional(),
  honeypot: z.string().optional(),
});

export type PublicEnquirySchemaInput = z.infer<typeof publicEnquirySchema>;
