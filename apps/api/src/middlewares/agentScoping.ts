import { AuthenticatedUser } from '@chirag/types';
import { AppError } from '../utils/appError';

export interface ScopeOptions {
  agentField?: string;
  customerField?: string;
}

/**
 * Build database query filter that enforces data ownership isolation:
 * - ADMIN: Unrestricted global visibility
 * - AGENT: Strictly scoped to resources assigned to/created by this agent
 * - CUSTOMER: Strictly scoped to the customer's own records
 */
export function buildTenantScopedFilter(
  user: AuthenticatedUser,
  options: ScopeOptions = {}
): Record<string, unknown> {
  const agentField = options.agentField ?? 'assignedAgentId';
  const customerField = options.customerField ?? 'customerId';

  if (user.role === 'ADMIN') {
    return {};
  }

  if (user.role === 'AGENT') {
    return { [agentField]: user.id };
  }

  if (user.role === 'CUSTOMER') {
    return { [customerField]: user.id };
  }

  throw AppError.forbidden('Unknown user role cannot access tenant data');
}

/**
 * Validates that an agent is authorized to modify a specific resource.
 * Throws AppError.forbidden if an agent attempts to access a resource belonging to another agent.
 */
export function enforceAgentOwnership(
  resourceOwnerAgentId: string | undefined,
  user: AuthenticatedUser
): void {
  if (user.role === 'ADMIN') {
    return; // Admin has full access
  }

  if (user.role === 'AGENT') {
    if (!resourceOwnerAgentId || resourceOwnerAgentId.toString() !== user.id) {
      throw AppError.forbidden('You are not authorized to access or modify another agent\'s data');
    }
    return;
  }

  throw AppError.forbidden('Unauthorized access');
}
