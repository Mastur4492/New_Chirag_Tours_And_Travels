import {
  createHotelSchema,
  createRoomCategorySchema,
  createSeasonalRateCardSchema,
  idParamSchema,
  mongoIdSchema,
  updateHotelSchema,
  updateRoomCategorySchema,
  updateSeasonalRateCardSchema,
} from '@chirag/validation';
import { Router } from 'express';
import { z } from 'zod';
import { hotelController } from '../controllers/hotel.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

// Rate cards (defined before /:id parameter match to avoid collision)
router.get('/rate-cards', optionalAuthenticate, hotelController.listRateCards.bind(hotelController));
router.post(
  '/rate-cards',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ body: createSeasonalRateCardSchema }),
  hotelController.createRateCard.bind(hotelController)
);
router.patch(
  '/rate-cards/:id',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ params: idParamSchema, body: updateSeasonalRateCardSchema }),
  hotelController.updateRateCard.bind(hotelController)
);

// Room category standalone update
router.patch(
  '/rooms/:roomId',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({
    params: z.object({ roomId: mongoIdSchema }),
    body: updateRoomCategorySchema,
  }),
  hotelController.updateRoomCategory.bind(hotelController)
);

import { cacheResponse, invalidateCache } from '../middlewares/cache';

// Hotel list and get with 60s in-memory caching
router.get('/', optionalAuthenticate, cacheResponse(60), hotelController.listHotels.bind(hotelController));
router.get(
  '/:id',
  optionalAuthenticate,
  validateRequest({ params: idParamSchema }),
  hotelController.getHotelById.bind(hotelController)
);

// Hotel mutations (ADMIN)
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ body: createHotelSchema }),
  (_req, _res, next) => {
    invalidateCache('/hotels');
    next();
  },
  hotelController.createHotel.bind(hotelController)
);

router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ params: idParamSchema, body: updateHotelSchema }),
  hotelController.updateHotel.bind(hotelController)
);

// Room category under hotel
router.get(
  '/:hotelId/rooms',
  validateRequest({ params: z.object({ hotelId: mongoIdSchema }) }),
  hotelController.listRoomCategories.bind(hotelController)
);

router.post(
  '/:hotelId/rooms',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({
    params: z.object({ hotelId: mongoIdSchema }),
    body: createRoomCategorySchema.omit({ hotelId: true }),
  }),
  hotelController.createRoomCategory.bind(hotelController)
);

export const hotelRouter = router;
