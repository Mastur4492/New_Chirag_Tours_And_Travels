import { z } from 'zod';
import { emailSchema, mongoIdSchema, phoneSchema, imageUrlOrPathSchema } from './common.schema';

export const mealPlanSchema = z.preprocess(
  (val) => (typeof val === 'string' && val.trim().toUpperCase() === 'EP' ? 'RO' : val),
  z.enum(['RO', 'CP', 'MAP', 'AP'])
);

export const hotelPropertyTypeSchema = z.enum([
  'HOTEL',
  'RESORT',
  'HOUSEBOAT',
  'HOMESTAY',
  'LUXURY_CAMP',
  'HERITAGE_HAVELI',
]);

export const createHotelSchema = z.object({
  name: z.string().trim().min(2, 'Hotel name must be at least 2 characters').max(150),
  destinationId: mongoIdSchema,
  starRating: z.number().int().min(1).max(5),
  propertyType: hotelPropertyTypeSchema,
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  contactPhone: phoneSchema.optional(),
  contactEmail: emailSchema.optional(),
  vendorName: z.string().trim().max(150).optional(),
  amenities: z.array(z.string().trim()).default([]),
  images: z.array(imageUrlOrPathSchema).default([]),
  checkInTime: z.string().trim().default('14:00'),
  checkOutTime: z.string().trim().default('11:00'),
  isActive: z.boolean().default(true),
});

export const updateHotelSchema = createHotelSchema.partial();

export const createRoomCategorySchema = z.object({
  hotelId: mongoIdSchema,
  name: z.string().trim().min(2, 'Room category name must be at least 2 characters').max(100),
  baseOccupancy: z.number().int().min(1).max(10).default(2),
  maxAdults: z.number().int().min(1).max(15).default(3),
  maxChildren: z.number().int().min(0).max(10).default(2),
  extraBedSupported: z.boolean().default(true),
  maxExtraBeds: z.number().int().min(0).max(5).default(1),
  extraBedPricePerNight: z.number().min(0, 'Extra bed price must be non-negative').default(1200).optional(),
  allowedMealPlans: z.array(mealPlanSchema).default(['RO', 'CP', 'MAP', 'AP']),
  pricePerNight: z.number().min(0, 'Price per night must be non-negative').optional(),
  totalRooms: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
});

export const updateRoomCategorySchema = createRoomCategorySchema.partial().omit({ hotelId: true });

export const seasonalRateCardBaseSchema = z.object({
  hotelId: mongoIdSchema,
  roomCategoryId: mongoIdSchema,
  seasonId: mongoIdSchema,
  mealPlan: mealPlanSchema,
  baseCostPerNight: z.number().min(0, 'Base cost must be non-negative'),
  extraAdultBedCost: z.number().min(0).default(0),
  childWithBedCost: z.number().min(0).default(0),
  childWithoutBedCost: z.number().min(0).default(0),
  standardSellingPrice: z.number().min(0, 'Standard selling price must be non-negative'),
  validFrom: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  validTo: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  isActive: z.boolean().default(true),
});

export const createSeasonalRateCardSchema = seasonalRateCardBaseSchema.refine(
  (data) => new Date(data.validTo).getTime() >= new Date(data.validFrom).getTime(),
  {
    message: 'validTo date must be on or after validFrom date',
    path: ['validTo'],
  }
);

export const updateSeasonalRateCardSchema = seasonalRateCardBaseSchema
  .partial()
  .omit({ hotelId: true, roomCategoryId: true, seasonId: true })
  .refine(
    (data) => {
      if (data.validFrom && data.validTo) {
        return new Date(data.validTo).getTime() >= new Date(data.validFrom).getTime();
      }
      return true;
    },
    {
      message: 'validTo date must be on or after validFrom date',
      path: ['validTo'],
    }
  );
