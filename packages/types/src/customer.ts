import { LeadSource } from './lead';

export interface CustomerDto {
  id: string;
  fullName: string;
  mobile: string;
  email?: string;
  city?: string;
  state?: string;
  notes?: string;
  source: LeadSource;
  assignedAgentId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  fullName: string;
  mobile: string;
  email?: string;
  city?: string;
  state?: string;
  notes?: string;
  source?: LeadSource;
  assignedAgentId?: string;
}

export interface UpdateCustomerInput {
  fullName?: string;
  mobile?: string;
  email?: string;
  city?: string;
  state?: string;
  notes?: string;
  source?: LeadSource;
  assignedAgentId?: string;
}
