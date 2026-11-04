import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/authorize';

const router = Router();

// All notification endpoints require authenticated staff (ADMIN or AGENT)
router.use(authenticate);
router.use(requireRole('ADMIN', 'AGENT'));

router.get('/', notificationController.list.bind(notificationController));
router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));
router.patch('/read-all', notificationController.markAllRead.bind(notificationController));
router.patch('/:id/read', notificationController.markRead.bind(notificationController));

export const notificationRoutes = router;
