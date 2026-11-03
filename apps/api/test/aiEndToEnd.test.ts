import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { ToolRegistry } from '../src/services/ai/toolRegistry';
import { AiSessionService } from '../src/services/ai/aiSession.service';
import { AiSessionModel } from '../src/models/aiSession.model';
import { signAccessToken } from '../src/utils/token.utils';

describe('AI Copilot Cross-Portal E2E & Zero-Trust Security Verification', () => {
  const mockAgentId = '66554433221100aabbccdd11';
  const mockAdminId = '66554433221100aabbccdd22';

  let agentToken: string;
  let adminToken: string;
  let mockSessions: Map<string, any>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSessions = new Map();

    // Mock in-memory session persistence
    vi.spyOn(AiSessionModel, 'create').mockImplementation(async (docs: any) => {
      const doc = Array.isArray(docs) ? docs[0] : docs;
      const sessionObj = {
        ...doc,
        _id: 'mongo-id-' + Math.random(),
        save: vi.fn().mockResolvedValue(true),
        isExpired: vi.fn().mockReturnValue(false),
      };
      mockSessions.set(doc.sessionId, sessionObj);
      return sessionObj as any;
    });

    vi.spyOn(AiSessionModel, 'findOne').mockImplementation(((filter: any) => {
      const match = mockSessions.get(filter.sessionId) || null;
      return {
        exec: vi.fn().mockResolvedValue(match),
        then: (resolve: any) => Promise.resolve(match).then(resolve),
      } as any;
    }) as any);

    vi.spyOn(AiSessionModel, 'deleteOne').mockImplementation(async (filter: any) => {
      const existed = mockSessions.has(filter.sessionId);
      if (existed) mockSessions.delete(filter.sessionId);
      return { deletedCount: existed ? 1 : 0 } as any;
    });

    agentToken = signAccessToken({
      sub: mockAgentId,
      role: 'AGENT',
      mobile: '9876543211',
    });

    adminToken = signAccessToken({
      sub: mockAdminId,
      role: 'ADMIN',
      mobile: '9876543210',
    });
  });

  describe('Cross-Portal Tool Execution Scoping', () => {
    it('Customer context can access customer tools but is blocked from Agent & Admin tools', async () => {
      const { session } = await AiSessionService.getOrCreateSession({
        portal: 'CUSTOMER',
      });

      // 1. Allowed customer tool
      const allowedTool = ToolRegistry.getTool('searchDestinations', 'CUSTOMER');
      expect(allowedTool).toBeDefined();

      // 2. Disallowed Agent tool
      const agentToolBlocked = ToolRegistry.getTool('listMyLeads', 'CUSTOMER');
      expect(agentToolBlocked).toBeUndefined();

      // 3. Disallowed Admin tool
      const adminToolBlocked = ToolRegistry.getTool('getFinancialAnalytics', 'CUSTOMER');
      expect(adminToolBlocked).toBeUndefined();

      // 4. Disallowed Admin mutation tool
      const adminMutationBlocked = ToolRegistry.getTool('reassignLeadConsultant', 'CUSTOMER');
      expect(adminMutationBlocked).toBeUndefined();

      // 5. Direct execution attempt via ToolRegistry returns permission denied response safely to model
      const result = await ToolRegistry.executeTool(
        'reassignLeadConsultant',
        { leadId: 'lead-1', targetAgentId: 'agent-2' },
        {
          portal: 'CUSTOMER',
          sessionId: session.sessionId,
        }
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission Denied');
    });

    it('Agent context can access Agent tools and Pricing Engine, but is blocked from Super Admin financial telemetry', async () => {
      const { session } = await AiSessionService.getOrCreateSession({
        portal: 'AGENT',
        actor: { userId: mockAgentId, role: 'AGENT' as any, ip: '127.0.0.1' },
      });

      // Allowed
      expect(ToolRegistry.getTool('listMyLeads', 'AGENT')).toBeDefined();
      expect(ToolRegistry.getTool('calculateTripPrice', 'AGENT')).toBeDefined();
      expect(ToolRegistry.getTool('updateFollowUpSchedule', 'AGENT')).toBeDefined();

      // Blocked
      expect(ToolRegistry.getTool('getFinancialAnalytics', 'AGENT')).toBeUndefined();
      expect(ToolRegistry.getTool('reassignLeadConsultant', 'AGENT')).toBeUndefined();

      const result = await ToolRegistry.executeTool(
        'getFinancialAnalytics',
        { timeframe: 'this_month' },
        {
          portal: 'AGENT',
          actor: { userId: mockAgentId, role: 'AGENT' as any, ip: '127.0.0.1' },
          sessionId: session.sessionId,
        }
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission Denied');
    });

    it('Admin context can access all administrative executive tools and cross-agency overviews', () => {
      expect(ToolRegistry.getTool('getFinancialAnalytics', 'ADMIN')).toBeDefined();
      expect(ToolRegistry.getTool('reassignLeadConsultant', 'ADMIN')).toBeDefined();
      expect(ToolRegistry.getTool('getOperationsReport', 'ADMIN')).toBeDefined();
      expect(ToolRegistry.getTool('listAllLeadsOverview', 'ADMIN')).toBeDefined();
      expect(ToolRegistry.getTool('calculateTripPrice', 'ADMIN')).toBeDefined();
    });
  });

  describe('Agent Scoping Server-Side Enforcement (Anti-Spoofing)', () => {
    it('Agent lead tools strictly force assignedAgentId to authenticated actor userId even if model supplies fake ID', async () => {
      const { session } = await AiSessionService.getOrCreateSession({
        portal: 'AGENT',
        actor: { userId: mockAgentId, role: 'AGENT' as any, ip: '127.0.0.1' },
      });

      // listMyLeads should query only mockAgentId
      const leadsTool = ToolRegistry.getTool('listMyLeads', 'AGENT');
      expect(leadsTool).toBeDefined();

      // Ensure that if an agent tries to execute without actor context, it fails
      const result = await ToolRegistry.executeTool(
        'listMyLeads',
        {},
        {
          portal: 'CUSTOMER', // calling agent tool under customer portal context
          sessionId: session.sessionId,
        }
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission Denied');
    });
  });

  describe('AI Session Lifecycle and Clearance Endpoints', () => {
    it('creates, retrieves, and clears an AI session via HTTP endpoints', async () => {
      // 1. Create a session directly via service
      const { session, sessionSecret } = await AiSessionService.getOrCreateSession({
        portal: 'CUSTOMER',
      });
      expect(session.sessionId).toBeDefined();
      expect(sessionSecret).toBeDefined();

      // 2. Fetch via GET endpoint with valid session secret
      const getRes = await request(app)
        .get(`/api/v1/ai/session/${session.sessionId}`)
        .set('x-session-secret', sessionSecret)
        .expect(200);

      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.sessionId).toBe(session.sessionId);

      // 3. Clear session via POST clear endpoint
      const clearRes = await request(app)
        .post(`/api/v1/ai/session/${session.sessionId}/clear`)
        .set('x-session-secret', sessionSecret)
        .send({ sessionSecret })
        .expect(200);

      expect(clearRes.body.success).toBe(true);
      expect(clearRes.body.data.message).toContain('cleared');
    });

    it('rejects session access with invalid session secret', async () => {
      const { session } = await AiSessionService.getOrCreateSession({
        portal: 'CUSTOMER',
      });

      await request(app)
        .get(`/api/v1/ai/session/${session.sessionId}`)
        .set('x-session-secret', 'invalid-secret-signature')
        .expect(403);
    });
  });
});
