import { z } from 'zod';

export const analyticsDateRangeOptionSchema = z.enum(['30d', '90d', 'ytd', 'all', 'custom']);
export const analyticsDateBasisSchema = z.enum(['bookingDate', 'travelDate']);
export const analyticsTrendIntervalSchema = z.enum(['day', 'week', 'month']);

export const dashboardSummaryQuerySchema = z
  .object({
    range: analyticsDateRangeOptionSchema.default('30d'),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format')
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format')
      .optional(),
    dateBasis: analyticsDateBasisSchema.default('bookingDate'),
  })
  .refine(
    (data) => {
      if (data.range === 'custom') {
        return !!(data.startDate && data.endDate);
      }
      return true;
    },
    {
      message: 'startDate and endDate are required when range is "custom"',
      path: ['startDate'],
    }
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: 'startDate cannot be later than endDate',
      path: ['startDate'],
    }
  );

export const financialTrendsQuerySchema = z
  .object({
    range: analyticsDateRangeOptionSchema.default('30d'),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format')
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format')
      .optional(),
    dateBasis: analyticsDateBasisSchema.default('bookingDate'),
    interval: analyticsTrendIntervalSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.range === 'custom') {
        return !!(data.startDate && data.endDate);
      }
      return true;
    },
    {
      message: 'startDate and endDate are required when range is "custom"',
      path: ['startDate'],
    }
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: 'startDate cannot be later than endDate',
      path: ['startDate'],
    }
  );

export const topDestinationsQuerySchema = z
  .object({
    range: analyticsDateRangeOptionSchema.default('30d'),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format')
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format')
      .optional(),
    dateBasis: analyticsDateBasisSchema.default('bookingDate'),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .refine(
    (data) => {
      if (data.range === 'custom') {
        return !!(data.startDate && data.endDate);
      }
      return true;
    },
    {
      message: 'startDate and endDate are required when range is "custom"',
      path: ['startDate'],
    }
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: 'startDate cannot be later than endDate',
      path: ['startDate'],
    }
  );

export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;
export type FinancialTrendsQuery = z.infer<typeof financialTrendsQuerySchema>;
export type TopDestinationsQuery = z.infer<typeof topDestinationsQuerySchema>;
