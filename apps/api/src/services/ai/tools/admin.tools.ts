import { z } from 'zod';
import { AiToolDefinition } from '../ai.types';
import { analyticsService } from '../../analytics.service';
import { leadService } from '../../lead.service';
import { bookingService } from '../../booking.service';
import { userRepository } from '../../../repositories/user.repository';
import { AiAuditPolicy } from '../aiAuditPolicy';
import { AppError } from '../../../utils/appError';

/**
 * ADMIN TOOLS (Executive Command & Operations Intelligence)
 * Strictly restricted to authenticated ADMIN users.
 */

// 1. Get Financial Analytics Tool
const GetFinancialAnalyticsSchema = z.object({
  interval: z.enum(['day', 'week', 'month']).default('month').describe('Aggregation interval'),
});

export const getFinancialAnalyticsTool: AiToolDefinition<z.infer<typeof GetFinancialAnalyticsSchema>> = {
  name: 'getFinancialAnalytics',
  description: 'Retrieve real-time business financial metrics: contracted revenue, bank-verified receipts, pending balances, and pipeline conversion.',
  schema: GetFinancialAnalyticsSchema,
  parametersJsonSchema: {
    type: 'object',
    properties: {
      interval: { type: 'string', enum: ['day', 'week', 'month'], description: 'Time interval' },
    },
  },
  execute: async (args, context) => {
    if (!context.actor || context.actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can access financial analytics.');
    }

    const [summary, trends] = await Promise.all([
      analyticsService.getDashboardSummary(
        { range: '30d', dateBasis: 'bookingDate' },
        { userId: context.actor.userId, role: 'ADMIN' }
      ),
      analyticsService.getFinancialTrends(
        { range: '90d', dateBasis: 'bookingDate', interval: args.interval },
        { userId: context.actor.userId, role: 'ADMIN' }
      ),
    ]);

    return {
      financials: {
        contractedBookingValue: summary.contractedBookingValue,
        verifiedCashCollected: summary.verifiedCashCollected,
        outstandingReceivables: summary.outstandingReceivables,
        totalQuotedPipelineValue: summary.totalQuotedPipelineValue,
      },
      bookingsOverview: {
        activeBookingsCount: summary.activeBookingsCount,
        confirmedBookingsCount: summary.confirmedBookingsCount,
        cancelledBookingsCount: summary.cancelledBookingsCount,
      },
      leadsOverview: {
        totalLeadsCount: summary.totalLeadsCount,
        overallWinRatePercent: summary.funnel.overallWinRate,
      },
      trendDataPointsCount: trends.points.length,
      recentPeriodTrend: trends.points.slice(-3).map((p) => ({
        period: p.periodLabel || p.period,
        contractedValue: p.contractedBookingValue,
        cashCollected: p.verifiedCashCollected,
        netCashFlow: p.netCashFlow,
      })),
    };
  },
};

// 2. List All Leads Overview Tool
const ListAllLeadsSchema = z.object({
  status: z.string().optional().describe('Stage filter e.g. "NEW", "CONTACTED", "CONVERTED", "LOST"'),
  unassignedOnly: z.boolean().default(false).describe('Filter for unassigned leads requiring consultant allocation'),
  limit: z.number().min(1).max(25).default(10),
});

export const listAllLeadsOverviewTool: AiToolDefinition<z.infer<typeof ListAllLeadsSchema>> = {
  name: 'listAllLeadsOverview',
  description: 'Query company-wide leads across all consultants, with stage and unassigned filters.',
  schema: ListAllLeadsSchema,
  parametersJsonSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'Lead stage' },
      unassignedOnly: { type: 'boolean', description: 'Filter unassigned leads' },
      limit: { type: 'number', description: 'Max leads to return' },
    },
  },
  execute: async (args, context) => {
    if (!context.actor || context.actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can query company-wide leads.');
    }

    const filter: any = { page: 1, limit: args.limit };
    if (args.status) filter.status = args.status;
    if (args.unassignedOnly) filter.unassignedOnly = true;

    const { leads, total } = await leadService.listLeads(filter, context.actor);

    return {
      totalLeads: total,
      returnedCount: leads.length,
      leads: leads.map((l) => ({
        id: l.id,
        leadNumber: l.leadNumber,
        customerName: l.customerName,
        customerMobile: l.customerMobile,
        destinationName: l.destinationName,
        assignedAgentName: l.assignedAgentName || '⚠️ Unassigned',
        status: l.status,
        nextFollowUpDate: l.nextFollowUpDate,
        createdAt: l.createdAt,
      })),
    };
  },
};

// 3. Reassign Lead Consultant Tool
const ReassignLeadSchema = z.object({
  leadId: z.string().describe('The Lead ID'),
  agentIdentifier: z.string().describe('Agent ID, Name, or Mobile to assign the lead to'),
});

export const reassignLeadConsultantTool: AiToolDefinition<z.infer<typeof ReassignLeadSchema>> = {
  name: 'reassignLeadConsultant',
  description: 'Reassign an enquiry to a specific travel consultant or agent.',
  schema: ReassignLeadSchema,
  requiresConfirmation: true,
  parametersJsonSchema: {
    type: 'object',
    properties: {
      leadId: { type: 'string', description: 'Lead ID' },
      agentIdentifier: { type: 'string', description: 'Agent Name or ID' },
    },
    required: ['leadId', 'agentIdentifier'],
  },
  execute: async (args, context) => {
    if (!context.actor || context.actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can reassign leads.');
    }

    // Resolve target agent
    const { users } = await userRepository.findAgents({ status: 'ACTIVE', skip: 0, limit: 50 });
    const target = users.find(
      (a) =>
        a._id.toString() === args.agentIdentifier ||
        a.fullName.toLowerCase().includes(args.agentIdentifier.toLowerCase()) ||
        a.mobile === args.agentIdentifier
    );

    if (!target) {
      throw AppError.notFound(
        `No active agent found matching "${args.agentIdentifier}". Available agents: ${users.map((a) => a.fullName).join(', ')}`
      );
    }

    const updated = await leadService.assignLead(
      args.leadId,
      { assignedAgentId: target._id.toString() },
      context.actor
    );

    // Reliable strict audit log
    await AiAuditPolicy.recordAiAction({
      sessionId: context.sessionId,
      actorType: 'USER',
      actorId: context.actor.userId,
      actorRole: 'ADMIN',
      action: 'LEAD_ASSIGNED' as any,
      entityType: 'LEAD' as any,
      entityId: updated.id,
      toolName: 'reassignLeadConsultant',
      args: { leadId: args.leadId, targetAgentId: target._id.toString(), targetAgentName: target.fullName },
      result: { assignedAgentName: target.fullName },
      strictAudit: true, // Strict audit required for reassignment
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      success: true,
      leadNumber: updated.leadNumber,
      customerName: updated.customerName,
      assignedTo: target.fullName,
      message: `Enquiry #${updated.leadNumber} successfully assigned to ${target.fullName}.`,
    };
  },
};

// 4. Get Operations Report Tool
const GetOperationsReportSchema = z.object({});

export const getOperationsReportTool: AiToolDefinition<z.infer<typeof GetOperationsReportSchema>> = {
  name: 'getOperationsReport',
  description: 'Query operational metrics: active tour bookings, upcoming trips, and supplier vouchers status.',
  schema: GetOperationsReportSchema,
  parametersJsonSchema: {
    type: 'object',
    properties: {},
  },
  execute: async (_args, context) => {
    if (!context.actor || context.actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can view operations reports.');
    }

    const metrics = await bookingService.getBookingMetrics({
      userId: context.actor.userId,
      role: 'ADMIN',
    });

    return {
      totalBookings: metrics.total,
      confirmedBookings: metrics.confirmed,
      inTripBookings: metrics.inTrip,
      completedBookings: metrics.completed,
      cancelledBookings: metrics.cancelled,
      pendingConfirmation: metrics.pendingConfirmation,
    };
  },
};

export const adminTools: AiToolDefinition[] = [
  getFinancialAnalyticsTool,
  listAllLeadsOverviewTool,
  reassignLeadConsultantTool,
  getOperationsReportTool,
];
