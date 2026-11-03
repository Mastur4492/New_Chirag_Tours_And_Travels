import { AiToolDefinition, ToolExecutionContext, PortalType } from './ai.types';
import { customerTools } from './tools/customer.tools';
import { agentTools } from './tools/agent.tools';
import { adminTools } from './tools/admin.tools';
import { logger } from '../../utils/logger';

export class ToolRegistry {
  private static allTools: Map<string, AiToolDefinition> = new Map();

  static {
    [...customerTools, ...agentTools, ...adminTools].forEach((tool) => {
      this.allTools.set(tool.name, tool);
    });
  }

  /**
   * Retrieves tools allowed for a given portal identity.
   * Ensures strict zero-trust boundary: Customer can never see or execute Admin/Agent tools.
   */
  static getToolsForPortal(portal: PortalType): AiToolDefinition[] {
    switch (portal) {
      case 'ADMIN':
        // Admin has access to admin commands, agent utilities, and public reference lookups
        return [...adminTools, ...agentTools, ...customerTools];
      case 'AGENT':
        // Agent has access to agent lead management tools and customer pricing tools
        return [...agentTools, ...customerTools];
      case 'CUSTOMER':
      default:
        // Customer strictly restricted to public catalog and pricing calculators
        return [...customerTools];
    }
  }

  /**
   * Retrieves a specific tool definition if authorized for the given portal.
   */
  static getTool(name: string, portal: PortalType): AiToolDefinition | undefined {
    const allowed = this.getToolsForPortal(portal);
    return allowed.find((t) => t.name === name);
  }

  /**
   * Formats tools into Gemini SDK FunctionDeclaration schema.
   */
  static getGeminiFunctionDeclarations(portal: PortalType): any[] {
    const tools = this.getToolsForPortal(portal);
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parametersJsonSchema,
    }));
  }

  /**
   * Dispatches and safely executes a tool with strict Zod validation and timeout guard.
   */
  static async executeTool(
    toolName: string,
    rawArgs: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const allowedTools = this.getToolsForPortal(context.portal);
    const tool = allowedTools.find((t) => t.name === toolName);

    if (!tool) {
      logger.warn(`Security violation attempt: Unauthorized tool "${toolName}" called in ${context.portal} portal`, {
        actor: context.actor,
        sessionId: context.sessionId,
      });
      return {
        success: false,
        error: `Permission Denied: Tool "${toolName}" is not authorized for your current role or portal.`,
      };
    }

    // 1. Zod parameter validation
    const parseResult = tool.schema.safeParse(rawArgs);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return {
        success: false,
        error: `Invalid tool parameters: ${errorMsg}`,
      };
    }

    // 2. Execution with 10-second timeout guard
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tool execution timed out after 10 seconds`)), 10000)
      );

      const executionPromise = tool.execute(parseResult.data, context);
      const result = await Promise.race([executionPromise, timeoutPromise]);

      return {
        success: true,
        result,
      };
    } catch (error: any) {
      logger.error(`Error executing tool "${toolName}":`, error);
      return {
        success: false,
        error: error.message || 'Tool execution failed',
      };
    }
  }
}
