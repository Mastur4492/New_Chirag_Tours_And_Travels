import { z } from 'zod';
import { imageUrlOrPathSchema } from './common.schema';

export const destinationRegionSchema = z.enum([
  'NORTH',
  'SOUTH',
  'EAST',
  'WEST',
  'CENTRAL',
  'NORTH_EAST',
  'ISLANDS',
  'INTERNATIONAL',
]);

export const createDestinationSchema = z.object({
  name: z.string().trim().min(2, 'Destination name must be at least 2 characters').max(100),
  slug: z.string().trim().max(100).optional(),
  country: z.string().trim().default('India'),
  state: z.string().trim().max(100).optional(),
  region: destinationRegionSchema,
  description: z.string().trim().max(5000).optional(),
  coverImages: z.array(imageUrlOrPathSchema).default([]),
  highlights: z.array(z.string().trim().min(1)).default([]),
  isActive: z.boolean().default(true),
});

export const updateDestinationSchema = createDestinationSchema.partial();

export type CreateDestinationSchemaInput = z.infer<typeof createDestinationSchema>;
export type UpdateDestinationSchemaInput = z.infer<typeof updateDestinationSchema>;
