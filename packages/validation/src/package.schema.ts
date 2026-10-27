import { z } from 'zod';
import { mongoIdSchema, imageUrlOrPathSchema } from './common.schema';
import { mealPlanSchema } from './hotel.schema';
import { vehicleCategorySchema } from './transport.schema';

export const itineraryDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  title: z.string().trim().min(2, 'Day title is required').max(100),
  description: z.string().trim().min(5, 'Day description is required').max(2000),
  nightStayDestination: z.string().trim().min(2, 'Night stay location is required').max(100),
  mealsIncluded: z.array(z.string().trim()).default([]),
  activities: z.array(z.string().trim()).default([]),
});

export const createTourPackageSchema = z.object({
  title: z.string().trim().min(3, 'Tour package title is required').max(150),
  slug: z.string().trim().max(150).optional(),
  destinationId: mongoIdSchema,
  durationNights: z.number().int().min(1, 'Package must be at least 1 night'),
  durationDays: z.number().int().min(1, 'Package must be at least 1 day'),
  overview: z.string().trim().max(5000).optional(),
  dayWiseItinerary: z
    .array(itineraryDaySchema)
    .min(1, 'Tour package must contain at least 1 itinerary day'),
  inclusions: z.array(z.string().trim()).default([]),
  exclusions: z.array(z.string().trim()).default([]),
  termsAndConditions: z.array(z.string().trim()).default([]),
  cancellationPolicy: z.array(z.string().trim()).default([]),
  featuredImage: imageUrlOrPathSchema.optional(),
  galleryImages: z.array(imageUrlOrPathSchema).default([]),
  defaultMealPlan: mealPlanSchema.optional(),
  defaultVehicleCategory: vehicleCategorySchema.optional(),
  startingPrice: z.number().min(0).optional(),
  isPublished: z.boolean().default(true),
});

export const updateTourPackageSchema = createTourPackageSchema.partial();
