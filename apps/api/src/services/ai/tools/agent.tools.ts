import { z } from 'zod';
import { AiToolDefinition } from '../ai.types';
import { leadService } from '../../lead.service';
import { AiAuditPolicy } from '../aiAuditPolicy';
import { AppError } from '../../../utils/appError';

/**
 * AGENT TOOLS (Strictly scoped to the authenticated agent's assigned clients)
 * Rule 2: Agent identity is derived exclusively from context.actor, NEVER from model args.
 */

// 1. List My Leads Tool
const ListMyLeadsSchema = z.object({
  status: z.enum(['NEW', 'ASSIGNED', 'CONTACTED', 'QUOTED', 'NEGOTIATING', 'CONVERTED', 'LOST', 'JUNK', 'ALL']).default('ALL'),
  limit: z.number().min(1).max(20).default(10),
});

export const listMyLeadsTool: AiToolDefinition<z.infer<typeof ListMyLeadsSchema>> = {
  name: 'listMyLeads',
  description: 'List leads and client inquiries currently assigned to you, with status and next follow-up dates.',
  schema: ListMyLeadsSchema,
  parametersJsonSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['NEW', 'ASSIGNED', 'CONTACTED', 'QUOTED', 'NEGOTIATING', 'CONVERTED', 'LOST', 'JUNK', 'ALL'],
        description: 'Filter leads by current pipeline stage',
      },
      limit: { type: 'number', description: 'Maximum leads to return (1-20)' },
    },
  },
  execute: async (args, context) => {
    if (!context.actor || (context.actor.role !== 'AGENT' && context.actor.role !== 'ADMIN')) {
      throw AppError.forbidden('Only authenticated travel consultants or administrators can access agent leads.');
    }

    const filter: any = { page: 1, limit: args.limit };
    if (args.status !== 'ALL') {
      filter.status = args.status;
    }

    // leadService automatically enforces queryFilter.assignedAgentId = actor.userId
    const { leads, total } = await leadService.listLeads(filter, context.actor);

    return {
      totalAssigned: total,
      returnedCount: leads.length,
      leads: leads.map((l) => ({
        id: l.id,
        leadNumber: l.leadNumber,
        customerName: l.customerName,
        customerMobile: l.customerMobile,
        destinationName: l.destinationName,
        durationNights: l.durationNights,
        status: l.status,
        nextFollowUpDate: l.nextFollowUpDate,
        followUpNotes: l.followUpNotes,
      })),
    };
  },
};

// 2. Get Lead Details Tool
const GetLeadDetailsSchema = z.object({
  leadId: z.string().describe('The Lead ID or Lead Number to inspect'),
});

export const getLeadDetailsTool: AiToolDefinition<z.infer<typeof GetLeadDetailsSchema>> = {
  name: 'getLeadDetails',
  description: 'Get full travel requirements, notes, and activity timeline for an assigned lead.',
  schema: GetLeadDetailsSchema,
  parametersJsonSchema: {
    type: 'object',
    properties: {
      leadId: { type: 'string', description: 'Lead ID' },
    },
    required: ['leadId'],
  },
  execute: async (args, context) => {
    if (!context.actor) {
      throw AppError.forbidden('Authentication required.');
    }

    const lead = await leadService.getLeadById(args.leadId, context.actor);

    if (context.actor.role === 'AGENT' && lead.assignedAgentId !== context.actor.userId) {
      throw AppError.forbidden('Access denied: This lead is not assigned to you.');
    }

    return {
      id: lead.id,
      leadNumber: lead.leadNumber,
      customerName: lead.customerName,
      customerMobile: lead.customerMobile,
      destinationName: lead.destinationName,
      tentativeTravelDate: lead.tentativeTravelDate,
      durationNights: lead.durationNights,
      travelers: `${lead.numberOfAdults} Adults, ${lead.numberOfChildren} Children`,
      status: lead.status,
      specialRequirements: lead.specialRequirements,
      nextFollowUpDate: lead.nextFollowUpDate,
      followUpNotes: lead.followUpNotes,
      timelineEventsCount: lead.timeline?.length || 0,
    };
  },
};

// 3. Update Follow-Up Schedule Tool
const UpdateFollowUpSchema = z.object({
  leadId: z.string().describe('The Lead ID'),
  followUpDate: z.string().describe('Next follow-up date and time in ISO format or YYYY-MM-DDTHH:mm'),
  notes: z.string().min(2).describe('Reminder note for the upcoming conversation'),
});

export const updateFollowUpScheduleTool: AiToolDefinition<z.infer<typeof UpdateFollowUpSchema>> = {
  name: 'updateFollowUpSchedule',
  description: 'Schedule or update the next follow-up date and reminder note for an assigned lead.',
  schema: UpdateFollowUpSchema,
  requiresConfirmation: true,
  parametersJsonSchema: {
    type: 'object',
    properties: {
      leadId: { type: 'string', description: 'Lead ID' },
      followUpDate: { type: 'string', description: 'Next follow-up date/time' },
      notes: { type: 'string', description: 'Follow-up reminder note' },
    },
    required: ['leadId', 'followUpDate', 'notes'],
  },
  execute: async (args, context) => {
    if (!context.actor) {
      throw AppError.forbidden('Authentication required.');
    }

    const updated = await leadService.updateFollowUp(
      args.leadId,
      {
        nextFollowUpDate: args.followUpDate,
        followUpNotes: args.notes,
      },
      context.actor
    );

    await AiAuditPolicy.recordAiAction({
      sessionId: context.sessionId,
      actorType: 'USER',
      actorId: context.actor.userId,
      actorRole: context.actor.role,
      action: 'LEAD_UPDATED' as any,
      entityType: 'LEAD' as any,
      entityId: updated.id,
      toolName: 'updateFollowUpSchedule',
      args,
      result: { nextFollowUpDate: updated.nextFollowUpDate },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      success: true,
      leadNumber: updated.leadNumber,
      nextFollowUpDate: updated.nextFollowUpDate,
      followUpNotes: updated.followUpNotes,
      message: `Follow-up for ${updated.customerName} (${updated.leadNumber}) scheduled for ${new Date(updated.nextFollowUpDate!).toLocaleString('en-IN')}.`,
    };
  },
};

// 4. Add Lead Activity Note Tool
const AddLeadNoteSchema = z.object({
  leadId: z.string().describe('The Lead ID'),
  noteType: z.enum(['NOTE', 'MODIFICATION_REQUESTED']).default('NOTE').describe('Interaction type'),
  notes: z.string().min(2).describe('Details of the discussion or interaction with the client'),
});

export const addLeadActivityNoteTool: AiToolDefinition<z.infer<typeof AddLeadNoteSchema>> = {
  name: 'addLeadActivityNote',
  description: 'Log a client discussion or note to the lead timeline.',
  schema: AddLeadNoteSchema,
  parametersJsonSchema: {
    type: 'object',
    properties: {
      leadId: { type: 'string', description: 'Lead ID' },
      noteType: { type: 'string', enum: ['NOTE', 'MODIFICATION_REQUESTED'], description: 'Interaction type' },
      notes: { type: 'string', description: 'Summary of discussion' },
    },
    required: ['leadId', 'notes'],
  },
  execute: async (args, context) => {
    if (!context.actor) {
      throw AppError.forbidden('Authentication required.');
    }

    const updated = await leadService.addActivity(
      args.leadId,
      {
        type: args.noteType,
        title: args.notes.slice(0, 40),
        content: args.notes,
      },
      context.actor
    );

    await AiAuditPolicy.recordAiAction({
      sessionId: context.sessionId,
      actorType: 'USER',
      actorId: context.actor.userId,
      actorRole: context.actor.role,
      action: 'LEAD_UPDATED' as any,
      entityType: 'LEAD' as any,
      entityId: updated.id,
      toolName: 'addLeadActivityNote',
      args,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      success: true,
      leadNumber: updated.leadNumber,
      message: `Activity logged successfully for ${updated.customerName}.`,
    };
  },
};

// 5. Get My Performance Metrics Tool
const GetMyMetricsSchema = z.object({});

export const getMyPerformanceMetricsTool: AiToolDefinition<z.infer<typeof GetMyMetricsSchema>> = {
  name: 'getMyPerformanceMetrics',
  description: 'Get your current lead conversion stats, active proposals count, and follow-up metrics.',
  schema: GetMyMetricsSchema,
  parametersJsonSchema: {
    type: 'object',
    properties: {},
  },
  execute: async (_args, context) => {
    if (!context.actor) {
      throw AppError.forbidden('Authentication required.');
    }

    const metrics = await leadService.getMetrics(context.actor);

    return {
      agentName: metrics.agentName,
      assignedLeadsCount: metrics.assignedLeadsCount,
      quotationsCreatedCount: metrics.quotationsCreatedCount,
      quotationsAcceptedCount: metrics.quotationsAcceptedCount,
      leadConversionRate: metrics.leadConversionRate,
      quoteConversionRate: metrics.quoteConversionRate,
      followUpsDueCount: metrics.followUpsDueCount,
      followUpsOverdueCount: metrics.followUpsOverdueCount,
    };
  },
};

export const agentTools: AiToolDefinition[] = [
  listMyLeadsTool,
  getLeadDetailsTool,
  updateFollowUpScheduleTool,
  addLeadActivityNoteTool,
  getMyPerformanceMetricsTool,
];
