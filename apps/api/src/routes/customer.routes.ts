import {
  createCustomerSchema,
  idParamSchema,
  paginationQuerySchema,
  updateCustomerSchema,
} from '@chirag/validation';
import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN', 'AGENT'));

router.post(
  '/',
  validateRequest({ body: createCustomerSchema }),
  customerController.create.bind(customerController)
);

router.get(
  '/',
  validateRequest({ query: paginationQuerySchema }),
  customerController.list.bind(customerController)
);

router.get(
  '/:id',
  validateRequest({ params: idParamSchema }),
  customerController.getById.bind(customerController)
);

router.put(
  '/:id',
  validateRequest({ params: idParamSchema, body: updateCustomerSchema }),
  customerController.update.bind(customerController)
);

export const customerRouter = router;
