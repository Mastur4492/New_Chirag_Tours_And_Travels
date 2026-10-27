import { Router } from 'express';
import {
  getDashboardSummary,
  getFinancialTrends,
  getTopDestinations,
} from '../controllers/analytics.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';
import { validateRequest } from '../middlewares/validateRequest';
import {
  dashboardSummaryQuerySchema,
  financialTrendsQuerySchema,
  topDestinationsQuerySchema,
} from '@chirag/validation';

const router = Router();

// All analytics endpoints require authentication and ADMIN or AGENT role
router.use(authenticate);
router.use(requireRole('ADMIN', 'AGENT'));

/**
 * GET /api/v1/analytics/dashboard-summary
 * Fetches high-level executive summary, conversion funnel, and status distributions.
 */
router.get(
  '/dashboard-summary',
  validateRequest({ query: dashboardSummaryQuerySchema }),
  getDashboardSummary
);

/**
 * GET /api/v1/analytics/financial-trends
 * Time-series comparison of Contracted Booking Value vs Verified Cash Collected.
 */
router.get(
  '/financial-trends',
  validateRequest({ query: financialTrendsQuerySchema }),
  getFinancialTrends
);

/**
 * GET /api/v1/analytics/top-destinations
 * Top destinations by booking volume and revenue.
 */
router.get(
  '/top-destinations',
  validateRequest({ query: topDestinationsQuerySchema }),
  getTopDestinations
);

export const analyticsRouter = router;
