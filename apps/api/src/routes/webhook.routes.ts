import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { whatsappService } from '../services/whatsapp.service';

const router = Router();

/**
 * Meta WhatsApp Cloud API Webhook Verification Challenge
 */
router.get('/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[WebhookRouter] WhatsApp Webhook successfully verified by Meta.');
    return res.status(200).send(challenge);
  }

  console.warn('[WebhookRouter] Rejected WhatsApp webhook verification challenge: token mismatch.');
  return res.status(403).json({ error: 'Forbidden: Verification token mismatch' });
});

/**
 * Handle Incoming WhatsApp Events & Messages
 */
router.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    // Acknowledge Meta immediately with 200 OK to prevent retries
    res.status(200).json({ status: 'EVENT_RECEIVED' });

    // Process asynchronously
    await whatsappService.handleIncomingWebhook(req.body);
  } catch (error) {
    console.error('[WebhookRouter] Error processing incoming WhatsApp webhook:', error);
  }
});

export const webhookRouter = router;
