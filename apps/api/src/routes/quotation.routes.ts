import {
  approveQuotationSchema,
  createQuotationSchema,
  customerAcceptQuotationSchema,
  idParamSchema,
  paginationQuerySchema,
  requestModificationSchema,
  reviseQuotationSchema,
  tokenParamSchema,
} from '@chirag/validation';
import { Router } from 'express';
import { quotationController } from '../controllers/quotation.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

// 1. PUBLIC ENDPOINTS - No authentication required (Customer Portal Access)
router.get(
  '/public/:token',
  validateRequest({ params: tokenParamSchema }),
  quotationController.getPublicByToken.bind(quotationController)
);

router.post(
  '/public/:token/accept',
  validateRequest({ params: tokenParamSchema, body: customerAcceptQuotationSchema }),
  quotationController.acceptPublic.bind(quotationController)
);

router.post(
  '/public/:token/request-changes',
  validateRequest({ params: tokenParamSchema, body: requestModificationSchema }),
  quotationController.requestChangesPublic.bind(quotationController)
);

router.get(
  '/public/:token/pdf',
  validateRequest({ params: tokenParamSchema }),
  quotationController.downloadPdfPublic.bind(quotationController)
);

// 2. AUTHENTICATED ENDPOINTS
router.use(authenticate);

router.post(
  '/calculate',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ body: createQuotationSchema }),
  quotationController.calculate.bind(quotationController)
);

router.post(
  '/',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ body: createQuotationSchema }),
  quotationController.create.bind(quotationController)
);

router.get(
  '/',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ query: paginationQuerySchema }),
  quotationController.list.bind(quotationController)
);

router.get(
  '/:id',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ params: idParamSchema }),
  quotationController.getById.bind(quotationController)
);

router.post(
  '/:id/revise',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ params: idParamSchema, body: reviseQuotationSchema }),
  quotationController.revise.bind(quotationController)
);

router.post(
  '/:id/issue',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ params: idParamSchema }),
  quotationController.issue.bind(quotationController)
);

router.get(
  '/:id/versions',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ params: idParamSchema }),
  quotationController.listVersions.bind(quotationController)
);

// Admin-only approval of price overrides
router.post(
  '/:id/approve',
  requireRole('ADMIN'),
  validateRequest({ params: idParamSchema, body: approveQuotationSchema }),
  quotationController.approve.bind(quotationController)
);

// PDF Proposal & Invoice Generation
router.get(
  '/:id/pdf',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ params: idParamSchema }),
  quotationController.downloadPdf.bind(quotationController)
);

router.post(
  '/:id/pdf/queue',
  requireRole('ADMIN', 'AGENT'),
  validateRequest({ params: idParamSchema }),
  quotationController.queuePdfGeneration.bind(quotationController)
);

export const quotationRouter = router;

