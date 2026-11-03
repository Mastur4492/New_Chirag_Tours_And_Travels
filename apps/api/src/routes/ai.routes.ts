import { Router } from 'express';
import { AiController } from '../controllers/ai.controller';
import { optionalAuthenticate } from '../middlewares/authenticate';
import { customerAiLimiter, authenticatedAiLimiter, verifyTokenBudget } from '../middlewares/aiRateLimiter';

const router = Router();

// Dynamic rate limiter selector based on authentication state
const dynamicAiLimiter = (req: any, res: any, next: any) => {
  if (req.user) {
    return authenticatedAiLimiter(req, res, next);
  }
  return customerAiLimiter(req, res, next);
};

// 1. SSE Streaming Chat
router.post(
  '/chat',
  optionalAuthenticate,
  dynamicAiLimiter,
  verifyTokenBudget,
  AiController.streamChat
);

// 2. Fetch Session Details & History
router.get(
  '/session/:sessionId',
  optionalAuthenticate,
  AiController.getSession
);

// 3. Clear Session History (POST or DELETE)
router.post(
  '/session/:sessionId/clear',
  optionalAuthenticate,
  AiController.clearSession
);

router.delete(
  '/session/:sessionId',
  optionalAuthenticate,
  AiController.clearSession
);

export const aiRouter = router;

