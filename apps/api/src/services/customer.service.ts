import {
  CreateCustomerInput,
  CustomerDto,
  UpdateCustomerInput,
  UserRole,
} from '@chirag/types';
import { normalizePhoneNumber } from '@chirag/validation';
import { customerRepository, FindCustomersFilter } from '../repositories/customer.repository';
import { userRepository } from '../repositories/user.repository';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { AppError } from '../utils/appError';

export interface ActorContext {
  userId: string;
  role: UserRole;
  ipAddress?: string;
  userAgent?: string;
}

export class CustomerService {
  async createCustomer(
    input: CreateCustomerInput,
    actor: ActorContext
  ): Promise<CustomerDto> {
    const normalizedMobile = normalizePhoneNumber(input.mobile);
    const existing = await customerRepository.findByMobile(normalizedMobile);
    if (existing) {
      throw AppError.conflict(
        `Customer with mobile ${normalizedMobile} already exists: "${existing.fullName}"`
      );
    }

    if (input.assignedAgentId) {
      const agent = await userRepository.findById(input.assignedAgentId);
      if (!agent) {
        throw AppError.notFound(`Assigned agent with ID ${input.assignedAgentId} not found`);
      }
    }

    // If actor is AGENT and no assignedAgentId specified, assign to this agent by default
    const assignedAgentId =
      actor.role === 'AGENT'
        ? (actor.userId as any)
        : input.assignedAgentId
          ? (input.assignedAgentId as any)
          : undefined;

    const created = await customerRepository.create({
      fullName: input.fullName.trim(),
      mobile: normalizedMobile,
      email: input.email ? input.email.trim().toLowerCase() : undefined,
      city: input.city?.trim(),
      state: input.state?.trim(),
      notes: input.notes?.trim(),
      source: input.source || (actor.role === 'AGENT' ? 'AGENT' : 'ADMIN_DIRECT'),
      assignedAgentId,
      createdBy: actor.userId as any,
    });

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'CUSTOMER_CREATED',
      entityType: 'CUSTOMER',
      entityId: created._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: created.toDto() as unknown as Record<string, unknown>,
    });

    return created.toDto();
  }

  async getOrCreateCustomer(
    input: CreateCustomerInput,
    actor: ActorContext
  ): Promise<CustomerDto> {
    const normalizedMobile = normalizePhoneNumber(input.mobile);
    const existing = await customerRepository.findByMobile(normalizedMobile);
    if (existing) {
      return existing.toDto();
    }
    return this.createCustomer(input, actor);
  }

  async getCustomerById(id: string, actor: ActorContext): Promise<CustomerDto> {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw AppError.notFound(`Customer with ID ${id} not found`);
    }

    if (actor.role === 'AGENT') {
      // Row-level access scoping: Agent can only view customer if assigned to them or created by them
      const isAssigned = customer.assignedAgentId?.toString() === actor.userId;
      const isCreator = customer.createdBy?.toString() === actor.userId;
      if (!isAssigned && !isCreator && customer.assignedAgentId) {
        throw AppError.forbidden('You do not have permission to access this customer record');
      }
    }

    return customer.toDto();
  }

  async findByMobile(mobile: string): Promise<CustomerDto | null> {
    const normalized = normalizePhoneNumber(mobile);
    const customer = await customerRepository.findByMobile(normalized);
    return customer ? customer.toDto() : null;
  }

  async updateCustomer(
    id: string,
    input: UpdateCustomerInput,
    actor: ActorContext
  ): Promise<CustomerDto> {
    const customer = await customerRepository.findById(id);
    if (!customer) {
      throw AppError.notFound(`Customer with ID ${id} not found`);
    }

    if (actor.role === 'AGENT') {
      const isAssigned = customer.assignedAgentId?.toString() === actor.userId;
      const isCreator = customer.createdBy?.toString() === actor.userId;
      if (!isAssigned && !isCreator) {
        throw AppError.forbidden('You do not have permission to update this customer');
      }
      // Agents cannot reassign customers to other agents
      if (input.assignedAgentId && input.assignedAgentId !== actor.userId) {
        throw AppError.forbidden('Agents cannot reassign customer ownership');
      }
    }

    const previousState = customer.toDto();
    const updateData: Record<string, any> = {};

    if (input.fullName !== undefined) updateData.fullName = input.fullName.trim();
    if (input.mobile !== undefined) {
      const normalizedMobile = normalizePhoneNumber(input.mobile);
      if (normalizedMobile !== customer.mobile) {
        const conflict = await customerRepository.findByMobile(normalizedMobile);
        if (conflict && conflict._id.toString() !== id) {
          throw AppError.conflict(`Another customer with mobile ${normalizedMobile} already exists`);
        }
        updateData.mobile = normalizedMobile;
      }
    }
    if (input.email !== undefined) updateData.email = input.email ? input.email.trim().toLowerCase() : undefined;
    if (input.city !== undefined) updateData.city = input.city?.trim();
    if (input.state !== undefined) updateData.state = input.state?.trim();
    if (input.notes !== undefined) updateData.notes = input.notes?.trim();
    if (input.source !== undefined) updateData.source = input.source;

    if (input.assignedAgentId !== undefined && actor.role === 'ADMIN') {
      if (input.assignedAgentId) {
        const agent = await userRepository.findById(input.assignedAgentId);
        if (!agent) {
          throw AppError.notFound(`Assigned agent with ID ${input.assignedAgentId} not found`);
        }
        updateData.assignedAgentId = input.assignedAgentId;
      } else {
        updateData.assignedAgentId = undefined;
      }
    }

    const updated = await customerRepository.update(id, updateData);
    if (!updated) {
      throw AppError.notFound(`Customer with ID ${id} not found`);
    }

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'CUSTOMER_UPDATED',
      entityType: 'CUSTOMER',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updated.toDto() as unknown as Record<string, unknown>,
    });

    return updated.toDto();
  }

  async listCustomers(
    filter: FindCustomersFilter,
    actor: ActorContext
  ): Promise<{ customers: CustomerDto[]; total: number }> {
    const queryFilter: FindCustomersFilter = { ...filter };
    if (actor.role === 'AGENT') {
      queryFilter.assignedAgentId = actor.userId;
    }

    const { customers, total } = await customerRepository.findMany(queryFilter);
    return {
      customers: customers.map((c) => c.toDto()),
      total,
    };
  }
}

export const customerService = new CustomerService();
