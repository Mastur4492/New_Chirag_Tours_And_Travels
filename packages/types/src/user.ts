export type UserRole = 'ADMIN' | 'AGENT' | 'CUSTOMER';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface AgentProfile {
  agencyName?: string;
  city?: string;
  maxDiscountPercent: number; // Default 5%
  maxMarkupPercent: number; // Default 20%
  canApproveFinalPrice: boolean; // Default false
  commissionRatePercent?: number;
}

export interface UserDto {
  id: string;
  fullName: string;
  email?: string;
  mobile: string;
  role: UserRole;
  status: UserStatus;
  agentProfile?: AgentProfile;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  fullName: string;
  email?: string;
  mobile: string;
  password: string;
  role: UserRole;
  agentProfile?: Partial<AgentProfile>;
}

export interface CreateAgentInput {
  fullName: string;
  email?: string;
  mobile: string;
  password: string;
  agentProfile?: Partial<AgentProfile>;
}

export interface UpdateAgentPermissionsInput {
  maxDiscountPercent: number;
  maxMarkupPercent: number;
  canApproveFinalPrice: boolean;
  commissionRatePercent?: number;
}

export interface UpdateAgentProfileInput {
  fullName?: string;
  email?: string;
  agentProfile?: {
    agencyName?: string;
    city?: string;
  };
}

export interface UpdateUserStatusInput {
  status: UserStatus;
}

export interface AdminResetPasswordInput {
  password: string;
}

