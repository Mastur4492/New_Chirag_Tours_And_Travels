import {
  createTaxConfigSchema,
  idParamSchema,
  updateTaxConfigSchema,
} from '@chirag/validation';
import { Router } from 'express';
import { taxConfigController } from '../controllers/taxConfig.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

import { cacheResponse, invalidateCache } from '../middlewares/cache';

// Read routes (authenticated users can read tax rules) with 60s in-memory caching
router.get('/default', cacheResponse(60), taxConfigController.getDefault.bind(taxConfigController));
router.get('/', cacheResponse(60), taxConfigController.list.bind(taxConfigController));
router.get(
  '/:id',
  validateRequest({ params: idParamSchema }),
  taxConfigController.getById.bind(taxConfigController)
);

// Admin-only write routes
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ body: createTaxConfigSchema }),
  (_req, _res, next) => {
    invalidateCache('/taxes');
    next();
  },
  taxConfigController.create.bind(taxConfigController)
);

router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ params: idParamSchema, body: updateTaxConfigSchema }),
  taxConfigController.update.bind(taxConfigController)
);

export const taxConfigRouter = router;
