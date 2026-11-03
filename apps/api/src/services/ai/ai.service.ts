import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/appError';
import { AiPortalType, IAiSessionDocument } from '../../models/aiSession.model';
import { AiSessionService } from './aiSession.service';
import { ToolRegistry } from './toolRegistry';
import { ActorContext } from '../lead.service';

export interface GenerateStreamOptions {
  session: IAiSessionDocument;
  userMessage: string;
  portal: AiPortalType;
  actor?: ActorContext;
  onChunk: (chunk: string) => void;
  onToolStart?: (toolName: string, args: Record<string, unknown>) => void;
  onToolComplete?: (toolName: string, result: Record<string, unknown>) => void;
  onToolError?: (toolName: string, error: string) => void;
  signal?: AbortSignal;
}

export class AiService {
  private client: GoogleGenAI | null = null;
  private primaryModel: string;
  private fallbackModel: string;

  constructor() {
    this.primaryModel = env.AI_MODEL_NAME || 'gemini-3.5-flash';
    this.fallbackModel = 'gemini-3.5-flash-lite';

    if (env.GEMINI_API_KEY) {
      this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
      logger.info(`🤖 AiService initialized with primary model: ${this.primaryModel}`);
    } else {
      logger.warn('⚠️ AiService: GEMINI_API_KEY is not configured. AI endpoints will return an error.');
    }
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      if (env.GEMINI_API_KEY) {
        this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        return this.client;
      }
      throw AppError.internal('Gemini AI API key is not configured on the server. Please contact administrator.');
    }
    return this.client;
  }

  private getSystemInstruction(portal: AiPortalType, actor?: ActorContext): string {
    const baseCompanyContext = `
You are the official AI Assistant for "New Chirag Tours & Travels" (Owner: Faisal Bikanerwala, Ahmedabad, Gujarat).
Brand philosophy: Trust, genuine luxury hospitality, zero hidden costs, transparent itineraries, and verified hotel/transport partners.
Contact: +91 99786 55529 | Email: newchiragtoursandtravels@gmail.com
Address: Shop No 3, Al-Rehman Plaza, Danilimda, Ahmedabad.
Specialized holiday circuits: Kashmir, Ladakh, Himachal, Kerala, Goa, Golden Triangle, Char Dham.
`;

    if (portal === 'ADMIN') {
      return `
${baseCompanyContext}
CURRENT USER ROLE: EXECUTIVE ADMINISTRATOR (Logged in: ${actor?.userId || 'Super Admin'})
PERSONA: Executive Travel Desk Intelligence & Management Copilot.
You have unrestricted access to assist leadership in evaluating pipeline revenue, verifying bank receipts, reviewing team activities, and monitoring overall operations.
Tone: Authoritative, crisp, professional, analytical, and highly structured with bullet points and markdown tables.
`;
    }

    if (portal === 'AGENT') {
      return `
${baseCompanyContext}
CURRENT USER ROLE: AUTHORIZED TRAVEL CONSULTANT / AGENT (Agent ID: ${actor?.userId || 'Assigned Agent'})
PERSONA: Fast, helpful Sales & Quotation Copilot.
Your purpose: Help this travel consultant follow up with their assigned client leads, draft accurate quotations, explain hotel meal plans (EP, CP, MAP), and keep tour proposals on track.
Rule: You must never mention internal B2B cost price margins, hotel vendor net costs, or other agents' private performance.
Tone: Encouraging, efficient, fast, sales-oriented.
`;
    }

    // Default: Public Customer
    return `
${baseCompanyContext}
CURRENT USER ROLE: TRAVELER / PUBLIC CUSTOMER
PERSONA: Luxury Travel Concierge & Personal Holiday Planner.
Your purpose: Help travelers discover dream destinations, recommend optimal nights (e.g., 5N/6D for Kashmir), explain sightseeing highlights, calculate transparent package prices using the official pricing tool, and guide them through getting an instant quote or connecting with travel desk.
STRICT SECURITY BOUNDARIES FOR CUSTOMER:
1. NEVER reveal internal profit margins, hotel net B2B costs, driver vendor rates, or system administration details.
2. NEVER calculate prices manually in your head. Always call the "calculateTripPrice" tool for package estimates.
3. NEVER claim you can reassign consultants or directly modify backend databases.
Tone: Warm, welcoming, courteous ("Namaste!"), inspiring, and knowledgeable.
`;
  }

  /**
   * Streams a conversational response from Gemini with autonomous tool execution loop,
   * automatic disconnect handling, and model fallback.
   */
  async streamChat(options: GenerateStreamOptions): Promise<{ totalTokens: number; fullResponse: string; modelUsed: string }> {
    const client = this.getClient();
    const { session, userMessage, portal, actor, onChunk, onToolStart, onToolComplete, onToolError, signal } = options;

    if (signal?.aborted) {
      throw new Error('Client aborted request before LLM streaming started');
    }

    const systemInstruction = this.getSystemInstruction(portal, actor);
    const functionDeclarations = ToolRegistry.getGeminiFunctionDeclarations(portal);

    // Build history from existing session
    const history = AiSessionService.getFormattedGeminiHistory(session);

    let fullText = '';
    let usedModel = this.primaryModel;

    const executeChatTurn = async (modelName: string) => {
      fullText = '';

      // Initialize Chat instance with tools and system instruction
      const chat = client.chats.create({
        model: modelName,
        history: history.length > 0 ? (history as any) : undefined,
        config: {
          systemInstruction,
          temperature: 0.7,
          tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined,
        },
      });

      // 1. Send user message
      const initialResponse = await chat.sendMessage({ message: userMessage });

      // 2. Check for Function / Tool Calls
      if (initialResponse.functionCalls && initialResponse.functionCalls.length > 0) {
        for (const fc of initialResponse.functionCalls) {
          if (signal?.aborted) break;

          const toolName = fc.name || '';
          const toolArgs = (fc.args as Record<string, unknown>) || {};

          onToolStart?.(toolName, toolArgs);

          // Execute tool safely through ToolRegistry
          const toolResult = await ToolRegistry.executeTool(
            toolName,
            toolArgs,
            {
              actor,
              sessionId: session.sessionId,
              portal,
              ipAddress: actor?.ipAddress,
            }
          );

          if (toolResult.success) {
            onToolComplete?.(toolName, toolResult.result);
          } else {
            onToolError?.(toolName, toolResult.error || 'Tool execution failed');
          }

          // Send function result back to Gemini and stream the final answer
          const followUpStream = await chat.sendMessageStream({
            message: [
              {
                functionResponse: {
                  name: toolName,
                  response: toolResult.success ? toolResult.result : { error: toolResult.error },
                },
              },
            ],
          });

          for await (const chunk of followUpStream) {
            if (signal?.aborted) {
              logger.info(`AI stream aborted by user disconnect [Session: ${session.sessionId}]`);
              break;
            }
            const text = chunk.text || '';
            if (text) {
              fullText += text;
              onChunk(text);
            }
          }
        }
      } else {
        // Plain text response without tool call
        fullText = initialResponse.text || '';
        onChunk(fullText);
      }
    };

    try {
      await executeChatTurn(this.primaryModel);
    } catch (primaryError: any) {
      logger.warn(`Primary model ${this.primaryModel} failed (${primaryError.message}). Attempting fallback to ${this.fallbackModel}...`);
      try {
        usedModel = this.fallbackModel;
        await executeChatTurn(this.fallbackModel);
      } catch (fallbackError: any) {
        logger.error(`Both primary and fallback AI models failed:`, fallbackError);
        throw AppError.internal(`AI Service is currently experiencing high load. Please retry in a moment.`);
      }
    }

    // Estimate token usage
    const estimatedInputTokens = Math.ceil((userMessage.length + systemInstruction.length) / 4);
    const estimatedOutputTokens = Math.ceil(fullText.length / 4);
    const totalTokens = estimatedInputTokens + estimatedOutputTokens;

    // Persist user message and model response in session history
    await AiSessionService.appendMessage(
      session,
      {
        role: 'user',
        parts: [{ text: userMessage }],
        textSummary: userMessage,
      },
      estimatedInputTokens
    );

    if (fullText) {
      await AiSessionService.appendMessage(
        session,
        {
          role: 'model',
          parts: [{ text: fullText }],
          textSummary: fullText.slice(0, 200),
        },
        estimatedOutputTokens
      );
    }

    return {
      totalTokens,
      fullResponse: fullText,
      modelUsed: usedModel,
    };
  }
}

export const aiService = new AiService();
