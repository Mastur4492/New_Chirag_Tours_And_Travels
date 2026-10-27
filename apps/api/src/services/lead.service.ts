import {
  AddLeadActivityInput,
  AgentMetricsDto,
  AssignLeadInput,
  CreateLeadInput,
  CreatePublicEnquiryInput,
  LeadDto,
  LeadStatus,
  PublicEnquiryResultDto,
  UpdateLeadFollowUpInput,
  UpdateLeadInput,
  UserRole,
} from '@chirag/types';
import { normalizePhoneNumber } from '@chirag/validation';
import { roundHalfUp } from '@chirag/pricing';
import { leadRepository, FindLeadsFilter } from '../repositories/lead.repository';
import { customerRepository } from '../repositories/customer.repository';
import { destinationRepository } from '../repositories/destination.repository';
import { tourPackageRepository } from '../repositories/package.repository';
import { userRepository } from '../repositories/user.repository';
import { quotationRepository } from '../repositories/quotation.repository';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { getNextSequenceValue } from '../models/sequence.model';
import { emailService } from './email.service';
import { whatsappService } from './whatsapp.service';
import { AppError } from '../utils/appError';

export interface ActorContext {
  userId: string;
  role: UserRole;
  ipAddress?: string;
  userAgent?: string;
}

export class LeadService {
  async createLead(
    input: CreateLeadInput,
    actor: ActorContext
  ): Promise<LeadDto> {
    // 1. Referential integrity: Check customer
    const customer = await customerRepository.findById(input.customerId);
    if (!customer) {
      throw AppError.notFound(`Customer with ID ${input.customerId} not found`);
    }

    // 2. Referential integrity: Check destination
    const destination = await destinationRepository.findById(input.destinationId);
    if (!destination) {
      throw AppError.notFound(`Destination with ID ${input.destinationId} not found`);
    }
    if (!destination.isActive) {
      throw AppError.badRequest(`Destination "${destination.name}" is currently inactive`);
    }

    // 3. Referential integrity: Check package if provided
    if (input.packageId) {
      const tourPackage = await tourPackageRepository.findById(input.packageId);
      if (!tourPackage) {
        throw AppError.notFound(`Tour package with ID ${input.packageId} not found`);
      }
    }

    // 4. Assigned Agent scoping
    let assignedAgentId: any = undefined;
    let assignedBy: any = undefined;
    let assignedAt: Date | undefined = undefined;
    let initialStatus: LeadStatus = 'NEW';

    if (actor.role === 'AGENT') {
      // Agents can only assign newly created leads to themselves
      assignedAgentId = actor.userId;
      assignedBy = actor.userId;
      assignedAt = new Date();
      initialStatus = 'ASSIGNED';
    } else if (input.assignedAgentId) {
      const agent = await userRepository.findById(input.assignedAgentId);
      if (!agent) {
        throw AppError.notFound(`Agent with ID ${input.assignedAgentId} not found`);
      }
      assignedAgentId = input.assignedAgentId;
      assignedBy = actor.userId;
      assignedAt = new Date();
      initialStatus = 'ASSIGNED';
    }

    // 5. Generate unique sequential lead number: NCT-LD-YYYY-XXXXX
    const year = new Date().getFullYear();
    const seq = await getNextSequenceValue(`lead_${year}`);
    const leadNumber = `NCT-LD-${year}-${String(seq).padStart(5, '0')}`;

    const initialTimeline: any[] = [
      {
        type: 'NOTE',
        title: 'Lead Ingested',
        content: `Lead created via ${input.source || (actor.role === 'AGENT' ? 'AGENT' : 'ADMIN_DIRECT')}`,
        actorId: actor.userId,
        createdAt: new Date(),
      },
    ];

    if (assignedAgentId) {
      initialTimeline.push({
        type: 'ASSIGNMENT',
        title: 'Lead Assigned',
        content: actor.role === 'AGENT' ? 'Auto-assigned to creating agent' : 'Assigned upon creation',
        actorId: actor.userId,
        createdAt: new Date(),
      });
    }

    const created = await leadRepository.create({
      leadNumber,
      customerId: input.customerId as any,
      destinationId: input.destinationId as any,
      packageId: input.packageId ? (input.packageId as any) : undefined,
      tentativeTravelDate: input.tentativeTravelDate ? new Date(input.tentativeTravelDate) : undefined,
      durationNights: input.durationNights,
      numberOfAdults: input.numberOfAdults || 2,
      numberOfChildren: input.numberOfChildren || 0,
      budgetEstimate: input.budgetEstimate,
      specialRequirements: input.specialRequirements?.trim(),
      source: input.source || (actor.role === 'AGENT' ? 'AGENT' : 'ADMIN_DIRECT'),
      status: initialStatus,
      assignedAgentId,
      assignedBy,
      assignedAt,
      nextFollowUpDate: input.nextFollowUpDate ? new Date(input.nextFollowUpDate) : undefined,
      followUpNotes: input.followUpNotes?.trim(),
      timeline: initialTimeline,
      createdBy: actor.userId as any,
    });

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'LEAD_CREATED',
      entityType: 'LEAD',
      entityId: created._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: created.toDto() as unknown as Record<string, unknown>,
    });

    return created.toDto();
  }

  async getLeadById(id: string, actor: ActorContext): Promise<LeadDto> {
    const lead = await leadRepository.findById(id);
    if (!lead) {
      throw AppError.notFound(`Lead with ID ${id} not found`);
    }

    // Agent row-level access control: If assigned, only currently assigned agent has access.
    if (actor.role === 'AGENT') {
      const assigned = lead.assignedAgentId
        ? (lead.assignedAgentId as any)._id?.toString() || lead.assignedAgentId.toString()
        : undefined;
      const hasAccess = assigned ? assigned === actor.userId : lead.createdBy?.toString() === actor.userId;
      if (!hasAccess) {
        throw AppError.forbidden('You do not have permission to access this lead');
      }
    }

    return lead.toDto();
  }

  async updateLead(
    id: string,
    input: UpdateLeadInput,
    actor: ActorContext
  ): Promise<LeadDto> {
    const lead = await leadRepository.findById(id);
    if (!lead) {
      throw AppError.notFound(`Lead with ID ${id} not found`);
    }

    // Agent row-level access control: If assigned, only currently assigned agent has access.
    if (actor.role === 'AGENT') {
      const assigned = lead.assignedAgentId
        ? (lead.assignedAgentId as any)._id?.toString() || lead.assignedAgentId.toString()
        : undefined;
      const hasAccess = assigned ? assigned === actor.userId : lead.createdBy?.toString() === actor.userId;
      if (!hasAccess) {
        throw AppError.forbidden('You do not have permission to modify this lead');
      }
    }

    const previousState = lead.toDto();
    const updateData: Record<string, any> = {};

    if (input.destinationId) {
      const destination = await destinationRepository.findById(input.destinationId);
      if (!destination) {
        throw AppError.notFound(`Destination with ID ${input.destinationId} not found`);
      }
      updateData.destinationId = input.destinationId;
    }

    if (input.packageId !== undefined) {
      if (input.packageId) {
        const tourPackage = await tourPackageRepository.findById(input.packageId);
        if (!tourPackage) {
          throw AppError.notFound(`Tour package with ID ${input.packageId} not found`);
        }
        updateData.packageId = input.packageId;
      } else {
        updateData.packageId = undefined;
      }
    }

    if (input.tentativeTravelDate !== undefined) {
      updateData.tentativeTravelDate = input.tentativeTravelDate ? new Date(input.tentativeTravelDate) : undefined;
    }
    if (input.durationNights !== undefined) updateData.durationNights = input.durationNights;
    if (input.numberOfAdults !== undefined) updateData.numberOfAdults = input.numberOfAdults;
    if (input.numberOfChildren !== undefined) updateData.numberOfChildren = input.numberOfChildren;
    if (input.budgetEstimate !== undefined) updateData.budgetEstimate = input.budgetEstimate;
    if (input.specialRequirements !== undefined) updateData.specialRequirements = input.specialRequirements?.trim();

    let statusUpdated = false;
    if (input.status !== undefined && input.status !== lead.status) {
      updateData.status = input.status;
      statusUpdated = true;
    }
    if (input.lostReason !== undefined) updateData.lostReason = input.lostReason?.trim();
    if (input.nextFollowUpDate !== undefined) {
      updateData.nextFollowUpDate = input.nextFollowUpDate ? new Date(input.nextFollowUpDate) : undefined;
    }
    if (input.followUpNotes !== undefined) {
      updateData.followUpNotes = input.followUpNotes?.trim();
    }

    const updated = await leadRepository.update(id, updateData);
    if (!updated) {
      throw AppError.notFound(`Lead with ID ${id} not found`);
    }

    // Audit logs & Timeline event
    if (statusUpdated) {
      const user = await userRepository.findById(actor.userId);
      await leadRepository.addTimelineEvent(id, {
        type: 'STATUS_CHANGE',
        title: `Status changed to ${updated.status}`,
        content: updated.lostReason ? `Reason: ${updated.lostReason}` : undefined,
        actorId: actor.userId,
        actorName: user?.fullName,
      });

      await auditLogRepository.record({
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'LEAD_STATUS_UPDATED',
        entityType: 'LEAD',
        entityId: id,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        previousState: { status: previousState.status },
        newState: { status: updated.status, lostReason: updated.lostReason },
      });
    }

    return updated.toDto();
  }

  async assignLead(
    id: string,
    input: AssignLeadInput,
    actor: ActorContext
  ): Promise<LeadDto> {
    // Lead assignment/reassignment is strictly Admin-controlled per specs
    if (actor.role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can assign or reassign leads');
    }

    const lead = await leadRepository.findById(id);
    if (!lead) {
      throw AppError.notFound(`Lead with ID ${id} not found`);
    }

    const targetAgent = await userRepository.findById(input.assignedAgentId);
    if (!targetAgent) {
      throw AppError.notFound(`Target agent with ID ${input.assignedAgentId} not found`);
    }
    if (targetAgent.status !== 'ACTIVE') {
      throw AppError.badRequest(`Cannot assign lead to inactive user "${targetAgent.fullName}"`);
    }

    const previousAgentId = lead.assignedAgentId ? (lead.assignedAgentId as any)._id?.toString() || lead.assignedAgentId.toString() : undefined;

    const updated = await leadRepository.update(id, {
      assignedAgentId: input.assignedAgentId as any,
      assignedBy: actor.userId as any,
      assignedAt: new Date(),
      status: lead.status === 'NEW' ? 'ASSIGNED' : lead.status,
    });

    if (!updated) {
      throw AppError.notFound(`Lead with ID ${id} not found`);
    }

    const adminUser = await userRepository.findById(actor.userId);
    await leadRepository.addTimelineEvent(id, {
      type: 'ASSIGNMENT',
      title: `Lead assigned to ${targetAgent.fullName}`,
      content: `Assigned by Admin`,
      actorId: actor.userId,
      actorName: adminUser?.fullName,
    });

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'LEAD_ASSIGNED',
      entityType: 'LEAD',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: { assignedAgentId: previousAgentId },
      newState: {
        assignedAgentId: input.assignedAgentId,
        assignedAgentName: targetAgent.fullName,
        assignedBy: actor.userId,
      },
    });

    return updated.toDto();
  }

  async addActivity(
    id: string,
    input: AddLeadActivityInput,
    actor: ActorContext
  ): Promise<LeadDto> {
    const lead = await leadRepository.findById(id);
    if (!lead) {
      throw AppError.notFound(`Lead with ID ${id} not found`);
    }

    if (actor.role === 'AGENT') {
      const assigned = lead.assignedAgentId
        ? (lead.assignedAgentId as any)._id?.toString() || lead.assignedAgentId.toString()
        : undefined;
      const hasAccess = assigned ? assigned === actor.userId : lead.createdBy?.toString() === actor.userId;
      if (!hasAccess) {
        throw AppError.forbidden('You do not have permission to add activities to this lead');
      }
    }

    const user = await userRepository.findById(actor.userId);
    const updated = await leadRepository.addTimelineEvent(id, {
      type: input.type,
      title: input.title,
      content: input.content,
      actorId: actor.userId,
      actorName: user?.fullName,
    });

    if (!updated) {
      throw AppError.notFound(`Lead with ID ${id} not found`);
    }

    return updated.toDto();
  }

  async updateFollowUp(
    id: string,
    input: UpdateLeadFollowUpInput,
    actor: ActorContext
  ): Promise<LeadDto> {
    const lead = await leadRepository.findById(id);
    if (!lead) {
      throw AppError.notFound(`Lead with ID ${id} not found`);
    }

    if (actor.role === 'AGENT') {
      const assigned = lead.assignedAgentId
        ? (lead.assignedAgentId as any)._id?.toString() || lead.assignedAgentId.toString()
        : undefined;
      const hasAccess = assigned ? assigned === actor.userId : lead.createdBy?.toString() === actor.userId;
      if (!hasAccess) {
        throw AppError.forbidden('You do not have permission to schedule follow-ups for this lead');
      }
    }

    const nextDate = input.nextFollowUpDate ? new Date(input.nextFollowUpDate) : undefined;
    const updated = await leadRepository.update(id, {
      nextFollowUpDate: nextDate,
      followUpNotes: input.followUpNotes?.trim(),
    });

    if (!updated) {
      throw AppError.notFound(`Lead with ID ${id} not found`);
    }

    const user = await userRepository.findById(actor.userId);
    await leadRepository.addTimelineEvent(id, {
      type: 'NOTE',
      title: nextDate ? `Follow-up scheduled for ${nextDate.toISOString().split('T')[0]}` : 'Follow-up cleared',
      content: input.followUpNotes ? `Notes: ${input.followUpNotes}` : undefined,
      actorId: actor.userId,
      actorName: user?.fullName,
    });

    return updated.toDto();
  }

  async getMetrics(actor: ActorContext, agentId?: string): Promise<AgentMetricsDto> {
    const targetAgentId = actor.role === 'AGENT' ? actor.userId : agentId;

    let targetAgentName: string | undefined;
    if (targetAgentId) {
      const targetUser = await userRepository.findById(targetAgentId);
      targetAgentName = targetUser?.fullName;
    }

    const [statusBreakdown, followUps, quotes] = await Promise.all([
      leadRepository.countByStatus(targetAgentId),
      leadRepository.countFollowUps(targetAgentId),
      quotationRepository.countQuotationMetrics(targetAgentId),
    ]);

    const assignedLeadsCount = Object.values(statusBreakdown).reduce((a, b) => a + b, 0);
    const closedLeads = (statusBreakdown.CONVERTED || 0) + (statusBreakdown.LOST || 0);

    const leadConversionRate =
      closedLeads > 0
        ? roundHalfUp(((statusBreakdown.CONVERTED || 0) / closedLeads) * 100, 1)
        : 0;

    const quoteConversionRate =
      quotes.issued > 0
        ? roundHalfUp((quotes.accepted / quotes.issued) * 100, 1)
        : 0;

    return {
      agentId: targetAgentId,
      agentName: targetAgentName,
      assignedLeadsCount,
      quotationsCreatedCount: quotes.created,
      quotationsIssuedCount: quotes.issued,
      quotationsAcceptedCount: quotes.accepted,
      leadConversionRate,
      quoteConversionRate,
      followUpsDueCount: followUps.due,
      followUpsOverdueCount: followUps.overdue,
      statusBreakdown,
    };
  }

  async listLeads(
    filter: FindLeadsFilter,
    actor: ActorContext
  ): Promise<{ leads: LeadDto[]; total: number }> {
    const queryFilter: FindLeadsFilter = { ...filter };
    if (actor.role === 'AGENT') {
      queryFilter.assignedAgentId = actor.userId;
    }

    const { leads, total } = await leadRepository.findMany(queryFilter);
    return {
      leads: leads.map((l) => l.toDto()),
      total,
    };
  }

  async createPublicEnquiry(
    input: CreatePublicEnquiryInput,
    context: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<PublicEnquiryResultDto> {
    // 1. Anti-bot honeypot protection: silent drop
    if (input.honeypot && input.honeypot.trim().length > 0) {
      return {
        leadNumber: 'NCT-LD-RECEIVED',
        destinationName: 'Selected Holiday Circuit',
        customerName: input.fullName ? input.fullName.trim() : 'Valued Traveler',
        receivedAt: new Date().toISOString(),
      };
    }

    // 2. Destination validation
    const destination = await destinationRepository.findById(input.destinationId);
    if (!destination || !destination.isActive) {
      throw AppError.notFound('The selected destination is currently unavailable or invalid');
    }

    // 3. Package validation (if provided)
    let tourPackage = null;
    if (input.packageId && input.packageId.trim().length > 0) {
      tourPackage = await tourPackageRepository.findById(input.packageId.trim());
      if (!tourPackage || !tourPackage.isPublished) {
        throw AppError.notFound('The selected tour package is currently unavailable or invalid');
      }
    }

    // 4. Customer Deduplication by Mobile
    const normalizedMobile = normalizePhoneNumber(input.mobile);
    let customer = await customerRepository.findByMobile(normalizedMobile);

    if (!customer) {
      try {
        customer = await customerRepository.create({
          fullName: input.fullName.trim(),
          mobile: normalizedMobile,
          email: input.email && input.email.trim().length > 0 ? input.email.trim().toLowerCase() : undefined,
          source: 'CUSTOMER_WEB',
        });
      } catch (err: any) {
        if (err.code === 11000) {
          customer = await customerRepository.findByMobile(normalizedMobile);
        } else {
          throw err;
        }
      }
    } else {
      // Update customer email if provided and previously empty
      if (!customer.email && input.email && input.email.trim().length > 0) {
        await customerRepository.update(customer._id.toString(), {
          email: input.email.trim().toLowerCase(),
        });
      }
    }

    if (!customer) {
      throw AppError.internal('Failed to process customer profile for enquiry');
    }

    // 5. Generate unique sequential lead number: NCT-LD-YYYY-XXXXX
    const year = new Date().getFullYear();
    const seq = await getNextSequenceValue(`lead_${year}`);
    const leadNumber = `NCT-LD-${year}-${String(seq).padStart(5, '0')}`;

    const tentativeTravelDate = input.tentativeTravelDate ? new Date(input.tentativeTravelDate) : undefined;

    const initialTimeline: any[] = [
      {
        type: 'NOTE',
        title: 'Online Enquiry Ingested',
        content: `Direct enquiry from customer web portal for ${destination.name}${tourPackage ? ` (${tourPackage.title})` : ''}`,
        createdAt: new Date(),
      },
    ];

    const lead = await leadRepository.create({
      leadNumber,
      customerId: customer._id,
      destinationId: destination._id,
      packageId: tourPackage ? tourPackage._id : undefined,
      tentativeTravelDate,
      durationNights: input.durationNights,
      numberOfAdults: input.numberOfAdults || 2,
      numberOfChildren: input.numberOfChildren || 0,
      budgetEstimate: input.budgetEstimate,
      specialRequirements: input.specialRequirements?.trim(),
      source: 'CUSTOMER_WEB',
      status: 'NEW',
      timeline: initialTimeline,
    });

    // 6. Audit Log
    await auditLogRepository.record({
      actorType: 'PUBLIC_CUSTOMER',
      action: 'LEAD_CREATED',
      entityType: 'LEAD',
      entityId: lead._id.toString(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      notes: `Public holiday enquiry received for ${destination.name}: ${leadNumber}`,
    });

    // 7. Fire Email Notification to Admin (async, non-blocking)
    emailService.notifyAdminNewEnquiry({
      leadNumber: lead.leadNumber,
      customerName: customer.fullName,
      mobile: customer.mobile,
      email: customer.email,
      destinationName: destination.name,
      packageName: tourPackage?.title,
      durationNights: input.durationNights,
      numberOfAdults: input.numberOfAdults,
      numberOfChildren: input.numberOfChildren,
      budgetEstimate: input.budgetEstimate,
      tentativeTravelDate: input.tentativeTravelDate,
      specialRequirements: input.specialRequirements,
    }).catch((err) => {
      console.error('[LeadService] Failed to send admin lead email notification:', err);
    });

    // 8. Fire WhatsApp Alert to Admin (async, non-blocking)
    whatsappService
      .sendAdminAlert(
        `🎯 *New Customer Enquiry Received!*\n` +
        `Lead Ref: ${lead.leadNumber}\n` +
        `Customer: ${customer.fullName} (${customer.mobile})\n` +
        `Destination: ${destination.name}\n` +
        `Budget: ₹${input.budgetEstimate || 0} (${input.durationNights || 1} Nights)`
      )
      .catch((err) => {
        console.error('[LeadService] Failed to send WhatsApp admin alert:', err);
      });

    return {
      leadNumber: lead.leadNumber,
      destinationName: destination.name,
      customerName: customer.fullName,
      receivedAt: lead.createdAt.toISOString(),
    };
  }
}

export const leadService = new LeadService();
