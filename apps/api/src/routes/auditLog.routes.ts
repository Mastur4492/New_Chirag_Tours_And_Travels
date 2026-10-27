import { Router } from 'express';
import { auditLogController } from '../controllers/auditLog.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/', auditLogController.list.bind(auditLogController));

export const auditLogRouter = router;
