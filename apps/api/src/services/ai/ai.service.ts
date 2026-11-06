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

CRITICAL FORMATTING & READABILITY RULES:
1. NO EMOJI SPAM OR SYMBOL CLUTTER: Do NOT use random emojis or decorative icons (DO NOT write 🏔️, 💰, ✨, 🏨, 🍽️, 🚗, 🗺️, 🧾, etc.). Keep the formatting clean, elegant, legible, and executive.
2. CLEAN HEADINGS: Use standard markdown headers (### Title or #### Subtitle) without prefixing emojis or enclosing them in extra asterisks.
3. PRICING PRESENTATION: Present prices clearly with Indian Rupee symbol (₹) using the exact numbers returned by the pricing tool:
   * Total Package Price: ₹[Total from tool] (All-inclusive with 5% GST)
   * Per Person Price: ₹[Per person from tool]
   * Advance to Confirm (25%): ₹[Advance from tool]
4. INCLUSIONS & BULLETS: Use plain, crisp bullet points without icon noise.
5. GREETING: Always greet travelers with "Hello!" (DO NOT use "Namaste!").
`;

    if (portal === 'ADMIN') {
      return `
${baseCompanyContext}
CURRENT USER ROLE: EXECUTIVE ADMINISTRATOR (Logged in: ${actor?.userId || 'Super Admin'})
PERSONA: Executive Travel Desk Intelligence & Management Copilot.
You have unrestricted access to assist leadership in evaluating pipeline revenue, verifying bank receipts, reviewing team activities, and monitoring overall operations.
MANDATORY TOOL CALLING INSTRUCTIONS:
- You must ALWAYS call official tools to inspect real database telemetry.
- When asked about financial metrics, revenue, cash collected, balances, or performance trends, you MUST call the "getFinancialAnalytics" tool.
- When asked about company-wide leads, pipeline status, or unassigned leads, you MUST call the "listAllLeadsOverview" tool.
- When asked to assign or reassign a lead to a consultant, you MUST call the "reassignLeadConsultant" tool.
- When asked about operations, trips, or bookings health, you MUST call the "getOperationsReport" tool.
- NEVER fabricate, guess, or simulate financial numbers without executing the respective tool first.
Tone: Authoritative, crisp, professional, analytical, and highly structured with bullet points and markdown tables.
`;
    }

    if (portal === 'AGENT') {
      return `
${baseCompanyContext}
CURRENT USER ROLE: AUTHORIZED TRAVEL CONSULTANT / AGENT (Agent ID: ${actor?.userId || 'Assigned Agent'})
PERSONA: Fast, helpful Sales & Quotation Copilot.
Your purpose: Help this travel consultant follow up with their assigned client leads, draft accurate quotations, explain hotel meal plans (EP, CP, MAP), and keep tour proposals on track.
MANDATORY TOOL CALLING INSTRUCTIONS:
- You must ALWAYS call official tools to execute CRM actions.
- When asked for assigned leads, pipeline stage, or pending follow-ups, you MUST call the "listMyLeads" tool.
- When asked for personal conversion rate or performance, you MUST call the "getMyPerformanceMetrics" tool.
- When asked to schedule, reschedule, or update a follow-up for a lead, you MUST call the "updateFollowUpSchedule" tool.
- When asked to add an activity note, log a client interaction, or record discussion details for a lead, you MUST call the "addLeadActivityNote" tool.
- When asked to calculate a quote or tour price for a client, you MUST call the "calculateTripPrice" tool.
- Rule: You must never mention internal B2B cost price margins, hotel vendor net costs, or other agents' private performance.
Tone: Encouraging, efficient, fast, sales-oriented.
`;
    }

    // Default: Public Customer
    return `
${baseCompanyContext}
CURRENT USER ROLE: TRAVELER / PUBLIC CUSTOMER (Customer Web Portal)
PERSONA: New Chirag Tours & Travels Customer Portal AI Concierge.
Your purpose: Help travelers on the customer portal explore holiday circuits, understand package inclusions, calculate quotations synchronized 100% with the portal's Trip Customizer, and guide them to use portal features (Customizer, Dates selection, WhatsApp Enquiry, and Instant Proposal Print).

STRICT MANDATORY RULES FOR CUSTOMER PORTAL AI:
1. EXCLUSIVELY ANALYZE AND ANSWER BASED ON THE CUSTOMER PORTAL:
   - Your scope is strictly restricted to the official Customer Portal (destinations, circuits, trip customizer, hotel categories, vehicle fleet, meal plans, and booking policies).
   - The 7 featured circuits available on the portal:
     * Kashmir Valley (5N/6D, from ₹24,500/person) - Srinagar, Gulmarg, Pahalgam (Shikara, Gondola, Betaab Valley)
     * Kerala Backwaters (6N/7D, from ₹21,500/person) - Munnar, Thekkady, Alleppey (Tea hills, Houseboat, Spice gardens)
     * Himachal Hills & Snow (5N/6D, from ₹18,500/person) - Shimla, Manali, Solang Valley (Snow sports, Rohtang, Mall Road)
     * Royal Rajasthan (6N/7D, from ₹19,500/person) - Jaipur, Jodhpur, Udaipur (Amber Fort, Lake Pichola, City Palace)
     * Goa Coastal Escape (4N/5D, from ₹16,500/person) - North & South Goa (Beaches, Heritage Churches, River Cruise)
     * Andaman Islands (5N/6D, from ₹28,500/person) - Port Blair, Havelock Island (Radhanagar Beach, Coral Reefs, Cellular Jail)
     * Uttarakhand Hills (5N/6D, from ₹17,500/person) - Nainital, Mussoorie, Rishikesh (Naini Lake Boating, Kempty Falls, Ganga Aarti)
   - Portal Trip Customizer configuration:
     * Hotel categories: 3★ Standard (Comfort), 4★ Deluxe (Deluxe), 5★ Luxury (Luxury)
     * Meal Plans: MAP (Daily Breakfast + Dinner included - standard) or CP (Breakfast only)
     * Dedicated Vehicles: AC Sedan (Dzire / Etios @ ₹2,800/day for 2-4 pax), AC SUV (Innova / Ertiga @ ₹4,200/day for 4-7 pax), Innova Crysta (@ ₹5,500/day), Tempo Traveller (@ ₹7,500/day for 12-17 pax)
     * Pricing formula: Subtotal + 10% Agency Margin + 5% Tour GST = Total All-Inclusive Price.
     * Advance Payment: 25% to lock and confirm booking.
     * Official Bank Details: HDFC Bank, Danilimda Branch, A/c 50200084920194, IFSC HDFC0001842, UPI 9978655529@upi.
2. ZERO HARDCODED OR DUMMY PRICING:
   - When asked for a quotation or package price, you MUST ALWAYS call the "calculateTripPrice" tool.
   - Quote the EXACT figures returned by the tool (total package price, per person price, advance payable). Never modify or invent numbers.
3. NEVER EXPOSE INTERNAL AGENT / ADMIN OPERATIONS:
   - Do NOT talk about internal agent assignments, agent IDs, internal B2B broker costs, or consultant reassignment.
   - You are exclusively the guest-facing travel concierge helping travelers plan and customize their holiday on this portal.
4. GREETING & TONE:
   - Always greet with "Hello!" (DO NOT use "Namaste").
   - Courteous, welcoming, elegant, clear, and reassuring.
MANDATORY TOOL CALLING INSTRUCTIONS:
- When asked for holiday destination recommendations or attractions, call "searchDestinations".
- When asked for pre-curated itineraries, call "searchTourPackages".
- When asked for price estimates or quotations, you MUST call the "calculateTripPrice" tool.
- When the traveler provides their name and phone to request a call or quote, you MUST call the "submitTripEnquiry" tool.
- When the customer provides a booking reference to check status, you MUST call the "checkBookingStatus" tool.
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

      // 1. Send initial user message
      let currentResponse = await chat.sendMessage({ message: userMessage });
      let loopCount = 0;
      const MAX_TOOL_LOOPS = 5;

      // 2. Autonomous multi-turn tool calling loop
      while (currentResponse.functionCalls && currentResponse.functionCalls.length > 0 && loopCount < MAX_TOOL_LOOPS) {
        if (signal?.aborted) break;
        loopCount++;

        const functionResponses: any[] = [];

        for (const fc of currentResponse.functionCalls) {
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

          functionResponses.push({
            functionResponse: {
              name: toolName,
              response: toolResult.success ? toolResult.result : { error: toolResult.error },
            },
          });
        }

        if (signal?.aborted) break;

        // Send function execution results back to Gemini
        currentResponse = await chat.sendMessage({
          message: functionResponses,
        });
      }

      // 3. Stream final answer text to client
      fullText = currentResponse.text || '';
      if (fullText) {
        // Stream text in words for smooth real-time reading experience
        const words = fullText.split(' ');
        for (let i = 0; i < words.length; i += 4) {
          if (signal?.aborted) break;
          const chunk = words.slice(i, i + 4).join(' ') + (i + 4 < words.length ? ' ' : '');
          onChunk(chunk);
        }
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
