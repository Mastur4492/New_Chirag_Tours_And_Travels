import { Router } from 'express';
import { agencySettingsController } from '../controllers/agencySettings.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';

const router = Router();

// Public: Get agency settings & bank information
router.get('/', agencySettingsController.getSettings.bind(agencySettingsController));

// Admin only: Update agency branding and banking details
router.put(
  '/',
  authenticate,
  requireRole('ADMIN'),
  agencySettingsController.updateSettings.bind(agencySettingsController)
);

export const agencySettingsRouter = router;

