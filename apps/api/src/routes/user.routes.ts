import {
  adminResetPasswordSchema,
  createAgentSchema,
  idParamSchema,
  paginationQuerySchema,
  updateAgentPermissionsSchema,
  updateAgentProfileSchema,
  updateUserStatusSchema,
} from '@chirag/validation';
import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

// All agent management routes are strictly reserved for ADMIN
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.post(
  '/agents',
  validateRequest({ body: createAgentSchema }),
  userController.createAgent.bind(userController)
);

router.get(
  '/agents',
  validateRequest({ query: paginationQuerySchema }),
  userController.listAgents.bind(userController)
);

router.get(
  '/agents/:id',
  validateRequest({ params: idParamSchema }),
  userController.getAgentById.bind(userController)
);

router.patch(
  '/agents/:id',
  validateRequest({ params: idParamSchema, body: updateAgentProfileSchema }),
  userController.updateAgentProfile.bind(userController)
);

router.patch(
  '/agents/:id/status',
  validateRequest({ params: idParamSchema, body: updateUserStatusSchema }),
  userController.updateAgentStatus.bind(userController)
);

router.patch(
  '/agents/:id/permissions',
  validateRequest({ params: idParamSchema, body: updateAgentPermissionsSchema }),
  userController.updateAgentPermissions.bind(userController)
);

router.post(
  '/agents/:id/reset-password',
  validateRequest({ params: idParamSchema, body: adminResetPasswordSchema }),
  userController.resetAgentPassword.bind(userController)
);

export const userRouter = router;
