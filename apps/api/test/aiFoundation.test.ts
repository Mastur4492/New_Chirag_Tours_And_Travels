import request from 'supertest';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { app } from '../src/app';
import { AiSessionService } from '../src/services/ai/aiSession.service';
import { AiAuditPolicy } from '../src/services/ai/aiAuditPolicy';
import { auditLogRepository } from '../src/repositories/auditLog.repository';
import { AiSessionModel } from '../src/models/aiSession.model';
import { verifyTokenBudget } from '../src/middlewares/aiRateLimiter';
import { AppError } from '../src/utils/appError';

describe('AI Foundation - Step 1 Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Session Ownership & Credentials Generation', () => {
    it('should generate cryptographically unique random session IDs and secrets', () => {
      const creds1 = AiSessionService.generateSessionCredentials();
      const creds2 = AiSessionService.generateSessionCredentials();

      expect(creds1.sessionId).toMatch(/^nct-ai-[a-f0-9-]+$/);
      expect(creds2.sessionId).toMatch(/^nct-ai-[a-f0-9-]+$/);
      expect(creds1.sessionId).not.toBe(creds2.sessionId);

      expect(creds1.sessionSecret.length).toBe(48); // 24 bytes in hex = 48 chars
      expect(creds2.sessionSecret.length).toBe(48);
      expect(creds1.sessionSecret).not.toBe(creds2.sessionSecret);
    });

    it('should format Gemini history correctly with function calls and text parts', () => {
      const mockSession: any = {
        messages: [
          {
            role: 'user',
            parts: [{ text: 'Hello, what packages do you offer?' }],
          },
          {
            role: 'model',
            parts: [
              { text: 'We offer Kashmir, Ladakh, and Kerala tours.' },
              {
                functionCall: {
                  name: 'searchPackages',
                  args: { destination: 'Kashmir' },
                },
              },
            ],
          },
          {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: 'searchPackages',
                  response: { count: 3, packages: ['Kashmir 5D', 'Gulmarg Special'] },
                },
              },
            ],
          },
        ],
      };

      const history = AiSessionService.getFormattedGeminiHistory(mockSession);
      expect(history.length).toBe(3);
      expect(history[0].role).toBe('user');
      expect(history[0].parts[0].text).toBe('Hello, what packages do you offer?');
      expect(history[1].role).toBe('model');
      expect(history[1].parts[1].functionCall?.name).toBe('searchPackages');
      expect(history[2].role).toBe('user');
      expect(history[2].parts[0].functionResponse?.name).toBe('searchPackages');
    });
  });

  describe('Reliable AI Audit Policy', () => {
    it('should sanitize sensitive tokens and invoke audit repository', async () => {
      const recordSpy = vi.spyOn(auditLogRepository, 'record').mockResolvedValue({} as any);

      await AiAuditPolicy.recordAiAction({
        sessionId: 'test-session-123',
        actorType: 'USER',
        actorId: '66554433221100aabbccddee',
        actorRole: 'ADMIN',
        action: 'LEAD_UPDATED' as any,
        entityType: 'LEAD' as any,
        entityId: 'lead-999',
        toolName: 'updateLeadStatus',
        args: {
          leadId: 'lead-999',
          status: 'CONTACTED',
          password: 'sensitive_password',
          token: 'bearer_token_123',
        },
        result: { success: true },
      });

      expect(recordSpy).toHaveBeenCalledTimes(1);
      const callArgs = recordSpy.mock.calls[0][0];
      expect(callArgs.actorRole).toBe('ADMIN');
      expect(callArgs.action).toBe('LEAD_UPDATED');
      expect(callArgs.entityId).toBe('lead-999');
      // Passwords and tokens must be stripped
      expect((callArgs.newState?.args as any).password).toBeUndefined();
      expect((callArgs.newState?.args as any).token).toBeUndefined();
      expect((callArgs.newState?.args as any).status).toBe('CONTACTED');
    });

    it('should throw an error on audit failure if strictAudit is true', async () => {
      vi.spyOn(auditLogRepository, 'record').mockResolvedValue(null);

      await expect(
        AiAuditPolicy.recordAiAction({
          sessionId: 'test-session-123',
          actorType: 'USER',
          action: 'LEAD_REASSIGNED' as any,
          entityType: 'LEAD' as any,
          entityId: 'lead-999',
          toolName: 'reassignLead',
          args: {},
          strictAudit: true,
        })
      ).rejects.toThrow('Audit system verification failed');
    });
  });

  describe('Token Budget Guard Middleware', () => {
    it('should allow requests when session is within token budget', async () => {
      vi.spyOn(AiSessionModel, 'findOne').mockResolvedValue({
        sessionId: 'nct-ai-123',
        totalTokensUsed: 1500,
        tokenBudget: 60000,
      } as any);

      const req: any = { body: { sessionId: 'nct-ai-123' } };
      const res: any = {};
      const next = vi.fn();

      await verifyTokenBudget(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject requests when session has exceeded token budget', async () => {
      vi.spyOn(AiSessionModel, 'findOne').mockResolvedValue({
        sessionId: 'nct-ai-123',
        totalTokensUsed: 65000,
        tokenBudget: 60000,
      } as any);

      const req: any = { body: { sessionId: 'nct-ai-123' } };
      const res: any = {};
      const next = vi.fn();

      await verifyTokenBudget(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const errorPassed = next.mock.calls[0][0];
      expect(errorPassed.statusCode).toBe(400);
      expect(errorPassed.message).toContain('reached its session token budget limit');
    });
  });

  describe('AI HTTP Endpoints & Validation', () => {
    it('POST /api/v1/ai/chat should reject empty message payloads', async () => {
      const res = await request(app).post('/api/v1/ai/chat').send({
        message: '',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/v1/ai/chat should reject oversized messages exceeding 3000 characters', async () => {
      const oversizedText = 'A'.repeat(3005);
      const res = await request(app).post('/api/v1/ai/chat').send({
        message: oversizedText,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details?.[0]?.issue).toContain('3000 characters');
    });

    it('GET /api/v1/ai/session/:sessionId should return 404 for non-existent session', async () => {
      vi.spyOn(AiSessionModel, 'findOne').mockResolvedValue(null);

      const res = await request(app).get('/api/v1/ai/session/non-existent-session-id');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Chat session not found');
    });
  });
});

