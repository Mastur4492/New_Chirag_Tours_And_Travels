import {
  createDriverSchema,
  createTransportTariffSchema,
  createVehicleSchema,
  createVehicleVendorSchema,
  idParamSchema,
  updateDriverSchema,
  updateTransportTariffSchema,
  updateVehicleSchema,
  updateVehicleVendorSchema,
} from '@chirag/validation';
import { Router } from 'express';
import { transportController } from '../controllers/transport.controller';
import { authenticate, optionalAuthenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

import { cacheResponse, invalidateCache } from '../middlewares/cache';

// ===================== VENDORS =====================
router.get('/vendors', optionalAuthenticate, cacheResponse(60), transportController.listVendors.bind(transportController));
router.get(
  '/vendors/:id',
  optionalAuthenticate,
  validateRequest({ params: idParamSchema }),
  transportController.getVendorById.bind(transportController)
);
router.post(
  '/vendors',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ body: createVehicleVendorSchema }),
  (_req, _res, next) => {
    invalidateCache('/transport');
    next();
  },
  transportController.createVendor.bind(transportController)
);
router.patch(
  '/vendors/:id',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ params: idParamSchema, body: updateVehicleVendorSchema }),
  (_req, _res, next) => {
    invalidateCache('/transport');
    next();
  },
  transportController.updateVendor.bind(transportController)
);

// ===================== VEHICLES =====================
router.get('/vehicles', cacheResponse(60), transportController.listVehicles.bind(transportController));
router.get(
  '/vehicles/:id',
  validateRequest({ params: idParamSchema }),
  transportController.getVehicleById.bind(transportController)
);
router.post(
  '/vehicles',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ body: createVehicleSchema }),
  transportController.createVehicle.bind(transportController)
);
router.patch(
  '/vehicles/:id',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ params: idParamSchema, body: updateVehicleSchema }),
  transportController.updateVehicle.bind(transportController)
);

// ===================== DRIVERS =====================
router.get('/drivers', transportController.listDrivers.bind(transportController));
router.get(
  '/drivers/:id',
  validateRequest({ params: idParamSchema }),
  transportController.getDriverById.bind(transportController)
);
router.post(
  '/drivers',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ body: createDriverSchema }),
  transportController.createDriver.bind(transportController)
);
router.patch(
  '/drivers/:id',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ params: idParamSchema, body: updateDriverSchema }),
  transportController.updateDriver.bind(transportController)
);

// ===================== TARIFFS =====================
router.get('/tariffs', optionalAuthenticate, transportController.listTariffs.bind(transportController));
router.get(
  '/tariffs/:id',
  optionalAuthenticate,
  validateRequest({ params: idParamSchema }),
  transportController.getTariffById.bind(transportController)
);
router.post(
  '/tariffs',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ body: createTransportTariffSchema }),
  transportController.createTariff.bind(transportController)
);
router.patch(
  '/tariffs/:id',
  authenticate,
  requireRole('ADMIN'),
  validateRequest({ params: idParamSchema, body: updateTransportTariffSchema }),
  transportController.updateTariff.bind(transportController)
);

export const transportRouter = router;
