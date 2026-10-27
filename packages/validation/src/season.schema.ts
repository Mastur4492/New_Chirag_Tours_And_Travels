import { z } from 'zod';
import { mongoIdSchema } from './common.schema';

export const seasonTypeSchema = z.enum([
  'REGULAR',
  'PEAK',
  'SUPER_PEAK',
  'OFF_SEASON',
  'FESTIVAL',
]);

export const createSeasonSchema = z
  .object({
    name: z.string().trim().min(2, 'Season name must be at least 2 characters').max(100),
    seasonType: seasonTypeSchema,
    destinationId: mongoIdSchema,
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    priority: z.number().int().min(1).max(100).default(10),
    description: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) => new Date(data.endDate).getTime() >= new Date(data.startDate).getTime(),
    {
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    }
  );

export const updateSeasonSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    seasonType: seasonTypeSchema.optional(),
    destinationId: mongoIdSchema.optional(),
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    priority: z.number().int().min(1).max(100).optional(),
    description: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate).getTime() >= new Date(data.startDate).getTime();
      }
      return true;
    },
    {
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    }
  );
