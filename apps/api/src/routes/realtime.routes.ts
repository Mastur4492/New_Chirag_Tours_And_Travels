import { Request, Response, Router } from 'express';
import { userRepository } from '../repositories/user.repository';
import { realtimeService } from '../services/realtime.service';
import { verifyAccessToken } from '../utils/token.utils';

const router = Router();

/**
 * GET /api/v1/realtime/stream
 * Connects browser EventSource to live real-time server stream
 */
router.get('/stream', async (req: Request, res: Response): Promise<void> => {
  // Support both query param `?token=...` and Bearer authorization header
  const rawToken =
    (req.query.token as string) ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : undefined);

  let role: 'ADMIN' | 'AGENT' | 'CUSTOMER' | 'ANONYMOUS' = 'ANONYMOUS';
  let userId: string | undefined = undefined;

  if (rawToken) {
    try {
      const decoded = verifyAccessToken(rawToken);
      const user = await userRepository.findById(decoded.sub);
      if (user && user.status === 'ACTIVE') {
        role = user.role as 'ADMIN' | 'AGENT';
        userId = user._id.toString();
      }
    } catch {
      // Invalid/expired token falls back to ANONYMOUS/CUSTOMER
      role = 'ANONYMOUS';
    }
  } else if (req.query.scope) {
    role = 'CUSTOMER';
  }

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const scopes = typeof req.query.scope === 'string' ? req.query.scope.split(',') : [];

  realtimeService.registerClient(clientId, req, res, {
    role,
    userId,
    scopes,
  });
});

export const realtimeRouter = router;

