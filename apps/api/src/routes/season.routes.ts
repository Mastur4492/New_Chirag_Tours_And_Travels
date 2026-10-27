import {
  createSeasonSchema,
  idParamSchema,
  mongoIdSchema,
  updateSeasonSchema,
} from '@chirag/validation';
import { Router } from 'express';
import { z } from 'zod';
import { seasonController } from '../controllers/season.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

// Resolve season for specific destination and date
router.get(
  '/resolve',
  validateRequest({
    query: z.object({
      destinationId: mongoIdSchema,
      date: z.string().optional(),
    }),
  }),
  seasonController.resolveSeason.bind(seasonController)
);

import { cacheResponse, invalidateCache } from '../middlewares/cache';

// List seasons with 60s in-memory caching
router.get('/', cacheResponse(60), seasonController.list.bind(seasonController));

// Get season by ID
router.get(
  '/:id',
  validateRequest({ params: idParamSchema }),
  seasonController.getById.bind(seasonController)
);

// Admin-only write routes
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ body: createSeasonSchema }),
  (_req, _res, next) => {
    invalidateCache('/seasons');
    next();
  },
  seasonController.create.bind(seasonController)
);

router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ params: idParamSchema, body: updateSeasonSchema }),
  seasonController.update.bind(seasonController)
);

router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ params: idParamSchema }),
  seasonController.delete.bind(seasonController)
);

export const seasonRouter = router;
