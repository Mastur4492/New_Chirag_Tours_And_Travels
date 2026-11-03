import { z } from 'zod';
import { ActorContext } from '../lead.service';

export type PortalType = 'CUSTOMER' | 'AGENT' | 'ADMIN';

export interface ToolExecutionContext {
  actor?: ActorContext;
  sessionId: string;
  portal: PortalType;
  ipAddress?: string;
  userAgent?: string;
}

export interface AiToolDefinition<TArgs = any, TResult = any> {
  name: string;
  description: string;
  schema: z.ZodType<TArgs, any, any>;
  parametersJsonSchema: Record<string, unknown>;
  requiresConfirmation?: boolean;
  execute: (args: TArgs, context: ToolExecutionContext) => Promise<TResult>;
}

export type StreamChunk =
  | { type: 'token'; content: string }
  | { type: 'tool_start'; toolName: string; args: Record<string, unknown> }
  | { type: 'tool_complete'; toolName: string; result: Record<string, unknown> }
  | { type: 'tool_error'; toolName: string; error: string }
  | { type: 'done'; totalTokens?: number; finishReason?: string }
  | { type: 'error'; message: string };
