import {
  addLeadActivitySchema,
  assignLeadSchema,
  createLeadSchema,
  idParamSchema,
  paginationQuerySchema,
  publicEnquirySchema,
  updateLeadFollowUpSchema,
  updateLeadSchema,
} from '@chirag/validation';
import { Router } from 'express';
import { leadController } from '../controllers/lead.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';
import { enquiryRateLimiter } from '../middlewares/rateLimiter';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

// Public Holiday Enquiry Endpoint (Rate-limited, Honeypot protected, source: CUSTOMER_WEB)
router.post(
  '/public-enquiry',
  enquiryRateLimiter,
  validateRequest({ body: publicEnquirySchema }),
  leadController.createPublicEnquiry.bind(leadController)
);

// All subsequent routes require authenticated staff credentials
router.use(authenticate);

router.post(
  '/',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ body: createLeadSchema }),
  leadController.create.bind(leadController)
);

router.get(
  '/',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ query: paginationQuerySchema }),
  leadController.list.bind(leadController)
);

// Agent / CRM Metrics (Aggregated from real MongoDB data)
router.get(
  '/metrics',
  requireRole('ADMIN', 'AGENT'),
  leadController.getMetrics.bind(leadController)
);

router.get(
  '/:id',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ params: idParamSchema }),
  leadController.getById.bind(leadController)
);

router.put(
  '/:id',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ params: idParamSchema, body: updateLeadSchema }),
  leadController.update.bind(leadController)
);

// Admin-only lead assignment / reassignment
router.post(
  '/:id/assign',
  requireRole('ADMIN'),
  validateRequest({ params: idParamSchema, body: assignLeadSchema }),
  leadController.assign.bind(leadController)
);

// Add timeline activity/note
router.post(
  '/:id/activities',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ params: idParamSchema, body: addLeadActivitySchema }),
  leadController.addActivity.bind(leadController)
);

// Schedule or update next follow-up
router.patch(
  '/:id/follow-up',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ params: idParamSchema, body: updateLeadFollowUpSchema }),
  leadController.updateFollowUp.bind(leadController)
);

export const leadRouter = router;
