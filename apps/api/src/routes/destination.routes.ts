import {
  createDestinationSchema,
  idParamSchema,
  updateDestinationSchema,
} from '@chirag/validation';
import { Router } from 'express';
import { z } from 'zod';
import { destinationController } from '../controllers/destination.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';
import { validateRequest } from '../middlewares/validateRequest';
import { cacheResponse, invalidateCache } from '../middlewares/cache';

const router = Router();

// Public / Authenticated read routes with 60s in-memory caching
router.get('/', cacheResponse(60), destinationController.list.bind(destinationController));
router.get(
  '/:id',
  validateRequest({ params: idParamSchema }),
  destinationController.getById.bind(destinationController)
);
router.get('/slug/:slug', cacheResponse(60), destinationController.getBySlug.bind(destinationController));

// Admin-only write routes
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ body: createDestinationSchema }),
  (_req, _res, next) => {
    invalidateCache('/destinations');
    next();
  },
  destinationController.create.bind(destinationController)
);

router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ params: idParamSchema, body: updateDestinationSchema }),
  (_req, _res, next) => {
    invalidateCache('/destinations');
    next();
  },
  destinationController.update.bind(destinationController)
);

router.patch(
  '/:id/status',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({
    params: idParamSchema,
    body: z.object({ isActive: z.boolean() }),
  }),
  (_req, _res, next) => {
    invalidateCache('/destinations');
    next();
  },
  destinationController.toggleStatus.bind(destinationController)
);

export const destinationRouter = router;
