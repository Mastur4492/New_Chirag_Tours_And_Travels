import { Router } from 'express';
import { authRouter } from './auth.routes';
import { customerRouter } from './customer.routes';
import { destinationRouter } from './destination.routes';
import { healthRouter } from './health.routes';
import { hotelRouter } from './hotel.routes';
import { leadRouter } from './lead.routes';
import { quotationRouter } from './quotation.routes';
import { paymentRouter } from './payment.routes';
import { bookingRouter } from './booking.routes';
import { tourPackageRouter } from './package.routes';
import { seasonRouter } from './season.routes';
import { taxConfigRouter } from './taxConfig.routes';
import { transportRouter } from './transport.routes';
import { analyticsRouter } from './analytics.routes';
import { operationsRouter } from './operations.routes';
import { userRouter } from './user.routes';
import { auditLogRouter } from './auditLog.routes';
import { uploadRouter } from './upload.routes';
import { webhookRouter } from './webhook.routes';
import { aiRouter } from './ai.routes';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/destinations', destinationRouter);
router.use('/hotels', hotelRouter);
router.use('/seasons', seasonRouter);
router.use('/transport', transportRouter);
router.use('/packages', tourPackageRouter);
router.use('/taxes', taxConfigRouter);
router.use('/customers', customerRouter);
router.use('/leads', leadRouter);
router.use('/quotations', quotationRouter);
router.use('/payments', paymentRouter);
router.use('/bookings', bookingRouter);
router.use('/analytics', analyticsRouter);
router.use('/operations', operationsRouter);
router.use('/audit-logs', auditLogRouter);
router.use('/upload', uploadRouter);
router.use('/uploads', uploadRouter);
router.use('/webhooks', webhookRouter);
router.use('/ai', aiRouter);

export const apiRouter = router;



