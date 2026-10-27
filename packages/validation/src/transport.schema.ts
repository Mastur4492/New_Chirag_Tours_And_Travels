import { z } from 'zod';
import { emailSchema, mongoIdSchema, phoneSchema } from './common.schema';
import { seasonTypeSchema } from './season.schema';

export const vehicleCategorySchema = z.enum([
  'HATCHBACK',
  'SEDAN',
  'SUV',
  'PREMIUM_SUV',
  'TEMPO_TRAVELLER',
  'BUS',
]);

export const vehicleStatusSchema = z.enum(['AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'INACTIVE']);

export const driverStatusSchema = z.enum(['ACTIVE', 'ON_DUTY', 'OFF_DUTY', 'BLACKLISTED']);

export const tariffBasisSchema = z.enum(['PER_DAY', 'PER_KM', 'FIXED_CIRCUIT']);

export const createVehicleVendorSchema = z.object({
  businessName: z.string().trim().min(2, 'Vendor business name is required').max(150),
  contactPerson: z.string().trim().min(2, 'Contact person is required').max(100),
  phone: phoneSchema,
  email: emailSchema.optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  settlementTerms: z.string().trim().max(500).optional(),
  isActive: z.boolean().default(true),
});

export const updateVehicleVendorSchema = createVehicleVendorSchema.partial();

export const createVehicleSchema = z.object({
  vendorId: mongoIdSchema,
  model: z.string().trim().min(2, 'Model name is required').max(100),
  category: vehicleCategorySchema,
  registrationNumber: z
    .string()
    .trim()
    .min(4, 'Registration number must be at least 4 characters')
    .max(25)
    .toUpperCase(),
  seatingCapacity: z.number().int().min(1).max(60),
  hasAC: z.boolean().default(true),
  insuranceExpiry: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  fitnessExpiry: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  serviceArea: z.string().trim().max(150).optional(),
  status: vehicleStatusSchema.default('AVAILABLE'),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const createDriverSchema = z.object({
  vendorId: mongoIdSchema,
  assignedVehicleId: mongoIdSchema.optional(),
  fullName: z.string().trim().min(2, 'Driver name is required').max(100),
  mobile: phoneSchema,
  licenseNumber: z.string().trim().min(5, 'Valid driving license is required').max(30).toUpperCase(),
  licenseExpiry: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  languages: z.array(z.string().trim()).default(['Hindi', 'English']),
  status: driverStatusSchema.default('ACTIVE'),
});

export const updateDriverSchema = createDriverSchema.partial();

export const createTransportTariffSchema = z.object({
  destinationId: mongoIdSchema,
  vehicleCategory: vehicleCategorySchema,
  seasonType: seasonTypeSchema.default('REGULAR'),
  tariffBasis: tariffBasisSchema,
  circuitName: z.string().trim().max(150).optional(),
  baseSupplierCost: z.number().min(0, 'Base supplier cost must be non-negative'),
  driverDailyAllowanceCost: z.number().min(0).default(0),
  standardSellingRate: z.number().min(0, 'Standard selling rate must be non-negative'),
  includedKmPerDay: z.number().min(0).optional(),
  extraKmRate: z.number().min(0).optional(),
  extraHourRate: z.number().min(0).optional(),
  isTollParkingIncluded: z.boolean().default(false),
  isNightHaltIncluded: z.boolean().default(false),
  nightHaltCharge: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateTransportTariffSchema = createTransportTariffSchema.partial();
