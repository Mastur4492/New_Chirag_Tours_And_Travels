import { changePasswordSchema, loginSchema, updateProfileSchema } from '@chirag/validation';
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';
import { authRateLimiter } from '../middlewares/rateLimiter';
import { validateRequest } from '../middlewares/validateRequest';

const router = Router();

router.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  authController.login.bind(authController)
);

router.post(
  '/refresh',
  authController.refresh.bind(authController)
);

router.post(
  '/logout',
  authenticate,
  authController.logout.bind(authController)
);

router.get(
  '/me',
  authenticate,
  authController.getMe.bind(authController)
);

router.patch(
  '/profile',
  authenticate,
  validateRequest({ body: updateProfileSchema }),
  authController.updateProfile.bind(authController)
);

router.post(
  '/change-password',
  authenticate,
  validateRequest({ body: changePasswordSchema }),
  authController.changePassword.bind(authController)
);

export const authRouter = router;
