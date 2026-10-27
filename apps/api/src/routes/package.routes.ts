import {
  createTourPackageSchema,
  idParamSchema,
  updateTourPackageSchema,
} from '@chirag/validation';
import { Router } from 'express';
import { z } from 'zod';
import { tourPackageController } from '../controllers/package.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';
import { validateRequest } from '../middlewares/validateRequest';
import { cacheResponse, invalidateCache } from '../middlewares/cache';

const router = Router();

// Public / Authenticated read routes with publication guard and 60s in-memory caching
router.get('/', optionalAuthenticate, cacheResponse(60), tourPackageController.list.bind(tourPackageController));
router.get(
  '/:id',
  optionalAuthenticate,
  validateRequest({ params: idParamSchema }),
  tourPackageController.getById.bind(tourPackageController)
);
router.get('/slug/:slug', optionalAuthenticate, cacheResponse(60), tourPackageController.getBySlug.bind(tourPackageController));

// Admin-only write routes
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ body: createTourPackageSchema }),
  (_req, _res, next) => {
    invalidateCache('/packages');
    next();
  },
  tourPackageController.create.bind(tourPackageController)
);

router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ params: idParamSchema, body: updateTourPackageSchema }),
  (_req, _res, next) => {
    invalidateCache('/packages');
    next();
  },
  tourPackageController.update.bind(tourPackageController)
);

router.patch(
  '/:id/publish',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({
    params: idParamSchema,
    body: z.object({ isPublished: z.boolean() }),
  }),
  (_req, _res, next) => {
    invalidateCache('/packages');
    next();
  },
  tourPackageController.togglePublish.bind(tourPackageController)
);

export const tourPackageRouter = router;
