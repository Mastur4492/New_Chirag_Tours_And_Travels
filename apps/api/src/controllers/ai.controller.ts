import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { aiService } from '../services/ai/ai.service';
import { AiSessionService } from '../services/ai/aiSession.service';
import { AiPortalType, AiSessionModel } from '../models/aiSession.model';
import { ActorContext } from '../services/lead.service';
import { AppError } from '../utils/appError';
import { ErrorCodes } from '../constants/errorCodes';

const ChatMessageInputSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(3000, 'Message exceeds 3000 characters limit'),
  sessionId: z.string().optional(),
  sessionSecret: z.string().optional(),
});

/**
 * Derives true portal identity and actor context strictly from verified server auth.
 * Never trusts client-supplied portalContext or user roles.
 */
function deriveServerContext(req: Request): { portal: AiPortalType; actor?: ActorContext } {
  if (req.user) {
    const actor: ActorContext = {
      userId: req.user.id,
      role: req.user.role,
      ipAddress: req.ip || req.socket.remoteAddress,
    };

    if (req.user.role === 'ADMIN') {
      return { portal: 'ADMIN', actor };
    }
    if (req.user.role === 'AGENT') {
      return { portal: 'AGENT', actor };
    }
  }

  // Unauthenticated or customer user
  return { portal: 'CUSTOMER' };
}

export class AiController {
  /**
   * SSE Streaming Chat Endpoint
   */
  static async streamChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    const abortController = new AbortController();

    // Disconnect handling
    req.on('close', () => {
      abortController.abort();
    });

    try {
      const parseResult = ChatMessageInputSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest(
          'Invalid chat payload',
          ErrorCodes.VALIDATION_ERROR,
          parseResult.error.errors.map((err) => ({
            field: err.path.join('.'),
            issue: err.message,
          }))
        );
      }

      const { message, sessionId, sessionSecret } = parseResult.data;
      const { portal, actor } = deriveServerContext(req);

      // Verify or instantiate session with cryptographic ownership check
      const { session, isNew, sessionSecret: resolvedSecret } = await AiSessionService.getOrCreateSession({
        sessionId,
        sessionSecret,
        portal,
        actor,
      });

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      // Emit session metadata header
      res.write(
        `data: ${JSON.stringify({
          type: 'session',
          sessionId: session.sessionId,
          sessionSecret: resolvedSecret,
          portal: session.portal,
          isNew,
        })}\n\n`
      );

      // Stream tokens and tool executions from AI Service
      const { totalTokens, modelUsed } = await aiService.streamChat({
        session,
        userMessage: message,
        portal,
        actor,
        signal: abortController.signal,
        onChunk: (tokenChunk) => {
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: 'token', content: tokenChunk })}\n\n`);
          }
        },
        onToolStart: (toolName, toolArgs) => {
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: 'tool_start', toolName, args: toolArgs })}\n\n`);
          }
        },
        onToolComplete: (toolName, result) => {
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: 'tool_complete', toolName, result })}\n\n`);
          }
        },
        onToolError: (toolName, error) => {
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: 'tool_error', toolName, error })}\n\n`);
          }
        },
      });

      // Emit completion event
      if (!res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({
            type: 'done',
            totalTokens,
            totalSessionTokens: session.totalTokensUsed,
            modelUsed,
          })}\n\n`
        );
        res.end();
      }
    } catch (error: any) {
      if (res.headersSent) {
        // If SSE streaming already commenced, emit structured error frame
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            message: error.message || 'An unexpected error occurred during AI generation',
          })}\n\n`
        );
        res.end();
      } else {
        next(error);
      }
    }
  }

  /**
   * Retrieves Session History & Metadata
   */
  static async getSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      if (!sessionId) {
        throw AppError.badRequest('Session ID is required');
      }
      const sessionSecret = (req.headers['x-session-secret'] as string) || (req.query.secret as string);
      const { actor } = deriveServerContext(req);

      const session = await AiSessionModel.findOne({ sessionId });
      if (!session) {
        throw AppError.notFound(`Chat session not found: ${sessionId}`);
      }

      // Check ownership
      if (actor) {
        if (session.userId && session.userId.toString() !== actor.userId && actor.role !== 'ADMIN') {
          throw AppError.forbidden('You do not have access to this chat session.');
        }
      } else {
        if (session.sessionSecret && session.sessionSecret !== sessionSecret) {
          throw AppError.forbidden('Invalid session credentials.');
        }
      }

      res.status(200).json({
        success: true,
        data: {
          sessionId: session.sessionId,
          portal: session.portal,
          totalTokensUsed: session.totalTokensUsed,
          tokenBudget: session.tokenBudget,
          lastActiveAt: session.lastActiveAt,
          messages: session.messages.map((m) => ({
            role: m.role,
            text: m.parts.map((p) => p.text).filter(Boolean).join('\n') || m.textSummary,
            timestamp: m.timestamp,
          })),
        },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clears Session History
   */
  static async clearSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      if (!sessionId) {
        throw AppError.badRequest('Session ID is required');
      }
      const sessionSecret = (req.headers['x-session-secret'] as string) || req.body?.sessionSecret;
      const { actor } = deriveServerContext(req);

      await AiSessionService.clearSessionHistory(sessionId, actor, sessionSecret);

      res.status(200).json({
        success: true,
        data: { message: 'Chat history cleared successfully' },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      next(error);
    }
  }
}
