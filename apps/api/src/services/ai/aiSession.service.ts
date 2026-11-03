import crypto from 'crypto';
import mongoose from 'mongoose';
import { AiSessionModel, IAiSessionDocument, AiPortalType, IGeminiPart } from '../../models/aiSession.model';
import { AppError } from '../../utils/appError';
import { ActorContext } from '../lead.service';

export interface CreateSessionOptions {
  portal: AiPortalType;
  actor?: ActorContext;
  customerMobile?: string;
}

export interface GetOrCreateSessionInput {
  sessionId?: string;
  sessionSecret?: string;
  portal: AiPortalType;
  actor?: ActorContext;
}

export class AiSessionService {
  /**
   * Generates a new cryptographically secure session ID and secret.
   */
  static generateSessionCredentials(): { sessionId: string; sessionSecret: string } {
    const sessionId = `nct-ai-${crypto.randomUUID()}`;
    const sessionSecret = crypto.randomBytes(24).toString('hex');
    return { sessionId, sessionSecret };
  }

  /**
   * Retrieves an existing session or creates a new one with strict ownership checks.
   */
  static async getOrCreateSession(input: GetOrCreateSessionInput): Promise<{
    session: IAiSessionDocument;
    isNew: boolean;
    sessionSecret: string;
  }> {
    const { sessionId, sessionSecret, portal, actor } = input;

    if (sessionId) {
      const existing = await AiSessionModel.findOne({ sessionId });
      if (existing) {
        // Enforce session expiration check
        if (existing.isExpired()) {
          throw AppError.forbidden('AI chat session has expired due to inactivity. Please start a new conversation.');
        }

        // Enforce ownership:
        if (actor) {
          // Authenticated user session
          if (existing.userId && existing.userId.toString() !== actor.userId && actor.role !== 'ADMIN') {
            throw AppError.forbidden('Unauthorized access: You do not own this AI chat session.');
          }
          // If session was created anonymously and user logs in, bind to this user
          if (!existing.userId) {
            existing.userId = new mongoose.Types.ObjectId(actor.userId);
            existing.portal = portal;
          }
        } else {
          // Anonymous customer session: require matching sessionSecret if one was set
          if (existing.sessionSecret && existing.sessionSecret !== sessionSecret) {
            throw AppError.forbidden('Invalid session credentials. Unauthorized access to chat session.');
          }
        }

        existing.lastActiveAt = new Date();
        await existing.save();

        return {
          session: existing,
          isNew: false,
          sessionSecret: existing.sessionSecret || sessionSecret || '',
        };
      }
    }

    // Create new session
    const creds = this.generateSessionCredentials();
    const tokenBudget = portal === 'ADMIN' ? 500000 : portal === 'AGENT' ? 200000 : 60000;

    const newSession = await AiSessionModel.create({
      sessionId: creds.sessionId,
      sessionSecret: creds.sessionSecret,
      portal,
      userId: actor ? new mongoose.Types.ObjectId(actor.userId) : undefined,
      messages: [],
      totalTokensUsed: 0,
      tokenBudget,
      lastActiveAt: new Date(),
    });

    return {
      session: newSession,
      isNew: true,
      sessionSecret: creds.sessionSecret,
    };
  }

  /**
   * Appends messages and enforces bounded sliding history (last 12 messages)
   */
  static async appendMessage(
    session: IAiSessionDocument,
    message: { role: 'user' | 'model'; parts: IGeminiPart[]; textSummary?: string },
    tokensUsed: number = 0
  ): Promise<void> {
    session.messages.push({
      role: message.role,
      parts: message.parts,
      textSummary: message.textSummary || '',
      timestamp: new Date(),
    });

    // Enforce sliding context window (keep last 14 messages max to prevent token bloat)
    if (session.messages.length > 14) {
      session.messages = session.messages.slice(-14);
    }

    session.totalTokensUsed += Math.max(0, tokensUsed);
    session.lastActiveAt = new Date();
    await session.save();
  }

  /**
   * Retrieves conversation history formatted for Gemini SDK Contents
   */
  static getFormattedGeminiHistory(session: IAiSessionDocument): Array<{
    role: 'user' | 'model';
    parts: Array<{
      text?: string;
      functionCall?: { name: string; args: Record<string, unknown> };
      functionResponse?: { name: string; response: Record<string, unknown> };
    }>;
  }> {
    return session.messages.map((m) => ({
      role: m.role,
      parts: m.parts.map((p) => {
        const part: any = {};
        if (p.text) part.text = p.text;
        if (p.functionCall) part.functionCall = p.functionCall;
        if (p.functionResponse) part.functionResponse = p.functionResponse;
        return part;
      }),
    }));
  }

  /**
   * Resets/clears messages for a session while preserving session ID and ownership.
   */
  static async clearSessionHistory(sessionId: string, actor?: ActorContext, sessionSecret?: string): Promise<void> {
    const session = await AiSessionModel.findOne({ sessionId });
    if (!session) {
      throw AppError.notFound('Session not found');
    }

    if (actor) {
      if (session.userId && session.userId.toString() !== actor.userId && actor.role !== 'ADMIN') {
        throw AppError.forbidden('You do not have permission to clear this session.');
      }
    } else {
      if (session.sessionSecret && session.sessionSecret !== sessionSecret) {
        throw AppError.forbidden('Invalid session credentials.');
      }
    }

    session.messages = [];
    session.lastActiveAt = new Date();
    await session.save();
  }
}
