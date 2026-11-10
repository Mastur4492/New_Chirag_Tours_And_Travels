export type UserRole = 'ADMIN' | 'AGENT' | 'CUSTOMER';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface AgentProfile {
  agencyName?: string;
  city?: string;
  maxDiscountPercent?: number; // Default 100% (autonomous)
  maxMarkupPercent?: number; // Default 100%
  canApproveFinalPrice?: boolean; // Default true
  commissionRatePercent?: number;
  rateSheetTier?: 'STANDARD_B2B' | 'VIP_PARTNER' | 'DIRECT_NET' | string;
  pricingModel?: 'B2B_NET_RATES' | 'WHOLESALE_NET' | string;
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
  maxDiscountPercent?: number;
  maxMarkupPercent?: number;
  canApproveFinalPrice?: boolean;
  commissionRatePercent?: number;
  rateSheetTier?: string;
  pricingModel?: string;
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

