import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ToolRegistry } from '../src/services/ai/toolRegistry';
import { calculateTripPriceTool } from '../src/services/ai/tools/customer.tools';
import { listMyLeadsTool, getLeadDetailsTool } from '../src/services/ai/tools/agent.tools';
import { getFinancialAnalyticsTool, reassignLeadConsultantTool } from '../src/services/ai/tools/admin.tools';
import { leadService } from '../src/services/lead.service';
import { analyticsService } from '../src/services/analytics.service';
import { destinationRepository } from '../src/repositories/destination.repository';
import { hotelService } from '../src/services/hotel.service';
import { transportRepository } from '../src/repositories/transport.repository';

describe('AI Role-Based Tool Registries - Step 2 Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(destinationRepository, 'findMany').mockResolvedValue({
      destinations: [
        {
          _id: { toString: () => 'dest-1' },
          name: 'Kashmir',
          slug: 'kashmir',
          isActive: true,
        } as any,
      ],
      total: 1,
    });
    vi.spyOn(hotelService, 'listHotels').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    } as any);
    vi.spyOn(transportRepository, 'findTariffs').mockResolvedValue({
      tariffs: [],
      total: 0,
    } as any);
  });

  describe('Zero-Trust Tool Isolation & Registry RBAC', () => {
    it('CUSTOMER portal must ONLY receive customer tools (Zero Admin/Agent leaks)', () => {
      const customerTools = ToolRegistry.getToolsForPortal('CUSTOMER');
      const toolNames = customerTools.map((t) => t.name);

      expect(toolNames).toContain('searchDestinations');
      expect(toolNames).toContain('searchTourPackages');
      expect(toolNames).toContain('calculateTripPrice');
      expect(toolNames).toContain('submitTripEnquiry');
      expect(toolNames).toContain('checkBookingStatus');

      // Crucial Security Verification: Must NEVER contain any agent or admin tools
      expect(toolNames).not.toContain('listMyLeads');
      expect(toolNames).not.toContain('reassignLeadConsultant');
      expect(toolNames).not.toContain('getFinancialAnalytics');
      expect(toolNames).not.toContain('updateFollowUpSchedule');
    });

    it('AGENT portal receives agent tools + public tools, but NEVER admin tools', () => {
      const agentTools = ToolRegistry.getToolsForPortal('AGENT');
      const toolNames = agentTools.map((t) => t.name);

      expect(toolNames).toContain('listMyLeads');
      expect(toolNames).toContain('getLeadDetails');
      expect(toolNames).toContain('updateFollowUpSchedule');
      expect(toolNames).toContain('calculateTripPrice');

      // Crucial Security Verification: Must NEVER contain admin tools
      expect(toolNames).not.toContain('reassignLeadConsultant');
      expect(toolNames).not.toContain('getFinancialAnalytics');
    });

    it('ADMIN portal receives administrative and management tools', () => {
      const adminTools = ToolRegistry.getToolsForPortal('ADMIN');
      const toolNames = adminTools.map((t) => t.name);

      expect(toolNames).toContain('getFinancialAnalytics');
      expect(toolNames).toContain('listAllLeadsOverview');
      expect(toolNames).toContain('reassignLeadConsultant');
      expect(toolNames).toContain('getOperationsReport');
    });

    it('ToolRegistry.executeTool strictly denies execution of unauthorized tools', async () => {
      const result = await ToolRegistry.executeTool(
        'reassignLeadConsultant',
        { leadId: 'lead-1', agentIdentifier: 'agent-2' },
        {
          sessionId: 'anon-session-1',
          portal: 'CUSTOMER',
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission Denied');
    });
  });

  describe('Customer Tools & Pricing Engine Isolation (Rule 1)', () => {
    it('calculateTripPriceTool invokes @chirag/pricing deterministically without LLM math', async () => {
      const quote = await calculateTripPriceTool.execute(
        {
          destinationName: 'Kashmir',
          nights: 5,
          adults: 2,
          children: 0,
          hotelTier: 'Deluxe',
          vehicleType: 'Sedan',
        },
        {
          sessionId: 'session-cust-1',
          portal: 'CUSTOMER',
        }
      );

      expect(quote.currency).toBe('INR (₹)');
      expect(quote.nights).toBe(5);
      expect(quote.days).toBe(6);
      expect(quote.adults).toBe(2);
      expect(quote.roomsAllocated).toBe(1);

      // Financials must be populated through @chirag/pricing calculation
      expect(quote.financials.totalSellingPrice).toBeGreaterThan(0);
      expect(quote.financials.perPersonPrice).toBe(quote.financials.totalSellingPrice / 2);
      expect(quote.financials.gstRatePercent).toBe(5);
      expect(quote.financials.advanceToLock25Percent).toBe(
        Math.round(quote.financials.totalSellingPrice * 0.25)
      );
      expect(quote.inclusions.length).toBeGreaterThanOrEqual(4);
    });

    it('calculateTripPriceTool validates parameters with Zod schema', async () => {
      const result = await ToolRegistry.executeTool(
        'calculateTripPrice',
        { nights: 0, adults: 0 }, // Invalid input
        { sessionId: 's1', portal: 'CUSTOMER' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid tool parameters');
    });
  });

  describe('Agent Scoping & Ownership (Rule 2)', () => {
    it('listMyLeadsTool rejects unauthenticated callers', async () => {
      await expect(
        listMyLeadsTool.execute(
          { status: 'ALL', limit: 10 },
          { sessionId: 's1', portal: 'AGENT' } // No actor
        )
      ).rejects.toThrow('Only authenticated travel consultants');
    });

    it('listMyLeadsTool calls leadService with actor context', async () => {
      const listLeadsSpy = vi.spyOn(leadService, 'listLeads').mockResolvedValue({
        leads: [
          {
            id: 'l1',
            leadNumber: 'NCT-LD-001',
            customerName: 'Aarav Patel',
            customerMobile: '9988776655',
            destinationName: 'Kashmir',
            durationNights: 5,
            status: 'NEW' as any,
          } as any,
        ],
        total: 1,
      });

      const actor = { userId: 'agent-123', role: 'AGENT' as const };
      const res = await listMyLeadsTool.execute(
        { status: 'ALL', limit: 10 },
        { sessionId: 's1', portal: 'AGENT', actor }
      );

      expect(listLeadsSpy).toHaveBeenCalledWith(expect.anything(), actor);
      expect(res.totalAssigned).toBe(1);
      expect(res.leads[0].leadNumber).toBe('NCT-LD-001');
    });

    it('getLeadDetailsTool prevents an agent from viewing another agent lead', async () => {
      vi.spyOn(leadService, 'getLeadById').mockResolvedValue({
        id: 'l2',
        leadNumber: 'NCT-LD-002',
        assignedAgentId: 'other-agent-999',
      } as any);

      const actor = { userId: 'agent-123', role: 'AGENT' as const };
      await expect(
        getLeadDetailsTool.execute(
          { leadId: 'l2' },
          { sessionId: 's1', portal: 'AGENT', actor }
        )
      ).rejects.toThrow('Access denied: This lead is not assigned to you');
    });
  });

  describe('Admin Tools & Executive Capabilities', () => {
    it('getFinancialAnalyticsTool rejects non-admin users', async () => {
      const agentActor = { userId: 'agent-123', role: 'AGENT' as const };
      await expect(
        getFinancialAnalyticsTool.execute(
          { interval: 'month' },
          { sessionId: 's1', portal: 'AGENT', actor: agentActor }
        )
      ).rejects.toThrow('Only administrators can access financial analytics');
    });

    it('getFinancialAnalyticsTool returns executive financial overview for admin', async () => {
      vi.spyOn(analyticsService, 'getDashboardSummary').mockResolvedValue({
        contractedBookingValue: 1250000,
        verifiedCashCollected: 980000,
        outstandingReceivables: 270000,
        totalQuotedPipelineValue: 3500000,
        activeBookingsCount: 15,
        confirmedBookingsCount: 12,
        cancelledBookingsCount: 1,
        totalLeadsCount: 45,
        funnel: { overallWinRate: 38.5 } as any,
      } as any);

      vi.spyOn(analyticsService, 'getFinancialTrends').mockResolvedValue({
        interval: 'month',
        dateBasis: 'bookingDate',
        points: [
          {
            period: '2026-10',
            periodLabel: 'Oct 2026',
            contractedBookingValue: 1250000,
            verifiedCashCollected: 980000,
            netCashFlow: 980000,
          } as any,
        ],
        totals: {} as any,
      });

      const adminActor = { userId: 'admin-1', role: 'ADMIN' as const };
      const res = await getFinancialAnalyticsTool.execute(
        { interval: 'month' },
        { sessionId: 's1', portal: 'ADMIN', actor: adminActor }
      );

      expect(res.financials.contractedBookingValue).toBe(1250000);
      expect(res.financials.verifiedCashCollected).toBe(980000);
      expect(res.bookingsOverview.confirmedBookingsCount).toBe(12);
      expect(res.trendDataPointsCount).toBe(1);
    });

    it('reassignLeadConsultantTool rejects non-admin callers', async () => {
      await expect(
        reassignLeadConsultantTool.execute(
          { leadId: 'l1', agentIdentifier: 'Rahul' },
          { sessionId: 's1', portal: 'AGENT', actor: { userId: 'ag-1', role: 'AGENT' } }
        )
      ).rejects.toThrow('Only administrators can reassign leads');
    });
  });
});

