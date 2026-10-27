export type LeadSource =
  | 'ADMIN_DIRECT'
  | 'CUSTOMER_WEB'
  | 'CUSTOMER_APP'
  | 'AGENT'
  | 'PHONE'
  | 'WALK_IN'
  | 'OTHER';

export type LeadStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'CONTACTED'
  | 'QUOTED'
  | 'NEGOTIATING'
  | 'CONVERTED'
  | 'LOST'
  | 'JUNK';

export interface LeadDto {
  id: string;
  leadNumber: string;
  customerId: string;
  customerName?: string;
  customerMobile?: string;
  destinationId: string;
  destinationName?: string;
  packageId?: string;
  tentativeTravelDate?: string;
  durationNights?: number;
  numberOfAdults: number;
  numberOfChildren: number;
  budgetEstimate?: number;
  specialRequirements?: string;
  source: LeadSource;
  status: LeadStatus;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedBy?: string;
  assignedAt?: string;
  lostReason?: string;
  nextFollowUpDate?: string;
  followUpNotes?: string;
  timeline?: LeadTimelineEvent[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadTimelineEventType =
  | 'NOTE'
  | 'STATUS_CHANGE'
  | 'ASSIGNMENT'
  | 'QUOTATION_CREATED'
  | 'QUOTATION_REVISED'
  | 'QUOTATION_ACCEPTED'
  | 'MODIFICATION_REQUESTED';

export interface LeadTimelineEvent {
  id: string;
  type: LeadTimelineEventType;
  title: string;
  content?: string;
  actorId?: string;
  actorName?: string;
  createdAt: string;
}

export interface CreateLeadInput {
  customerId: string;
  destinationId: string;
  packageId?: string;
  tentativeTravelDate?: string;
  durationNights?: number;
  numberOfAdults: number;
  numberOfChildren?: number;
  budgetEstimate?: number;
  specialRequirements?: string;
  source?: LeadSource;
  assignedAgentId?: string;
  nextFollowUpDate?: string;
  followUpNotes?: string;
}

export interface UpdateLeadInput {
  destinationId?: string;
  packageId?: string;
  tentativeTravelDate?: string;
  durationNights?: number;
  numberOfAdults?: number;
  numberOfChildren?: number;
  budgetEstimate?: number;
  specialRequirements?: string;
  status?: LeadStatus;
  lostReason?: string;
  nextFollowUpDate?: string;
  followUpNotes?: string;
}

export interface AssignLeadInput {
  assignedAgentId: string;
}

export interface UpdateLeadFollowUpInput {
  nextFollowUpDate?: string;
  followUpNotes?: string;
}

export interface AddLeadActivityInput {
  type: LeadTimelineEventType;
  title: string;
  content?: string;
}

export interface CreatePublicEnquiryInput {
  fullName: string;
  mobile: string;
  email?: string;
  destinationId: string;
  packageId?: string;
  tentativeTravelDate?: string;
  durationNights?: number;
  numberOfAdults?: number;
  numberOfChildren?: number;
  budgetEstimate?: number;
  specialRequirements?: string;
  honeypot?: string;
}

export interface PublicEnquiryResultDto {
  leadNumber: string;
  destinationName?: string;
  customerName?: string;
  receivedAt: string;
}

export interface AgentMetricsDto {
  agentId?: string;
  agentName?: string;
  assignedLeadsCount: number;
  quotationsCreatedCount: number;
  quotationsIssuedCount: number;
  quotationsAcceptedCount: number;
  leadConversionRate: number; // (convertedLeads / totalClosedLeads) * 100
  quoteConversionRate: number; // (acceptedQuotes / issuedQuotes) * 100
  followUpsDueCount: number;
  followUpsOverdueCount: number;
  statusBreakdown: Record<LeadStatus, number>;
}
