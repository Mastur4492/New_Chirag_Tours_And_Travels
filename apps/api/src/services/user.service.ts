import { CreateAgentInput, UpdateAgentPermissionsInput, UpdateAgentProfileInput, UserDto, UserStatus } from '@chirag/types';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/appError';
import { authService } from './auth.service';

export class UserService {
  async getUserById(id: string): Promise<UserDto> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw AppError.notFound('User not found');
    }
    return user.toDto();
  }

  async createAgent(
    input: CreateAgentInput,
    adminId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserDto> {
    const existingMobile = await userRepository.findByMobile(input.mobile);
    if (existingMobile) {
      throw AppError.conflict('A user with this mobile number already exists');
    }

    if (input.email) {
      const existingEmail = await userRepository.findByEmail(input.email);
      if (existingEmail) {
        throw AppError.conflict('A user with this email address already exists');
      }
    }

    const passwordHash = await authService.hashPassword(input.password);

    const createdAgent = await userRepository.create({
      fullName: input.fullName,
      mobile: input.mobile,
      email: input.email,
      passwordHash,
      role: 'AGENT',
      status: 'ACTIVE',
      agentProfile: {
        agencyName: input.agentProfile?.agencyName,
        city: input.agentProfile?.city,
        maxDiscountPercent: input.agentProfile?.maxDiscountPercent ?? 5,
        maxMarkupPercent: input.agentProfile?.maxMarkupPercent ?? 20,
        canApproveFinalPrice: input.agentProfile?.canApproveFinalPrice ?? false,
        commissionRatePercent: input.agentProfile?.commissionRatePercent,
      },
    });

    await auditLogRepository.record({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'AGENT_CREATED',
      entityType: 'USER',
      entityId: createdAgent._id.toString(),
      ipAddress,
      userAgent,
      newState: {
        fullName: createdAgent.fullName,
        mobile: createdAgent.mobile,
        role: createdAgent.role,
        agentProfile: createdAgent.agentProfile,
      },
    });

    return createdAgent.toDto();
  }

  async updateAgentPermissions(
    agentId: string,
    permissions: UpdateAgentPermissionsInput,
    adminId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserDto> {
    const agent = await userRepository.findById(agentId);
    if (!agent) {
      throw AppError.notFound('Agent not found');
    }

    if (agent.role !== 'AGENT') {
      throw AppError.badRequest('User is not an agent');
    }

    const previousProfile = agent.agentProfile ? JSON.parse(JSON.stringify(agent.agentProfile)) : {};

    const updatedProfile = {
      agencyName: agent.agentProfile?.agencyName,
      city: agent.agentProfile?.city,
      maxDiscountPercent: permissions.maxDiscountPercent,
      maxMarkupPercent: permissions.maxMarkupPercent,
      canApproveFinalPrice: permissions.canApproveFinalPrice,
      commissionRatePercent: permissions.commissionRatePercent ?? agent.agentProfile?.commissionRatePercent,
    };

    const updated = await userRepository.update(agentId, {
      agentProfile: updatedProfile,
    });

    if (!updated) {
      throw AppError.notFound('Agent not found during update');
    }

    await auditLogRepository.record({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'AGENT_PERMISSIONS_UPDATED',
      entityType: 'USER',
      entityId: agentId,
      ipAddress,
      userAgent,
      previousState: previousProfile,
      newState: updatedProfile,
    });

    return updated.toDto();
  }

  async updateAgentProfile(
    agentId: string,
    input: UpdateAgentProfileInput,
    adminId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserDto> {
    const agent = await userRepository.findById(agentId);
    if (!agent) {
      throw AppError.notFound('Agent not found');
    }

    if (agent.role !== 'AGENT') {
      throw AppError.badRequest('User is not an agent');
    }

    if (input.email && input.email.toLowerCase() !== agent.email?.toLowerCase()) {
      const existingEmail = await userRepository.findByEmail(input.email);
      if (existingEmail && existingEmail._id.toString() !== agentId) {
        throw AppError.conflict('A user with this email address already exists');
      }
    }

    const previousProfile = agent.toDto();

    const updateData: Record<string, unknown> = {};
    if (input.fullName) {
      updateData.fullName = input.fullName;
    }
    if (input.email !== undefined) {
      updateData.email = input.email ? input.email.toLowerCase() : undefined;
    }
    if (input.agentProfile) {
      updateData.agentProfile = {
        agencyName:
          input.agentProfile.agencyName !== undefined
            ? input.agentProfile.agencyName
            : agent.agentProfile?.agencyName,
        city:
          input.agentProfile.city !== undefined
            ? input.agentProfile.city
            : agent.agentProfile?.city,
        maxDiscountPercent: agent.agentProfile?.maxDiscountPercent ?? 5,
        maxMarkupPercent: agent.agentProfile?.maxMarkupPercent ?? 20,
        canApproveFinalPrice: agent.agentProfile?.canApproveFinalPrice ?? false,
        commissionRatePercent: agent.agentProfile?.commissionRatePercent,
      };
    }

    const updated = await userRepository.update(agentId, updateData as any);
    if (!updated) {
      throw AppError.notFound('Agent not found during update');
    }

    await auditLogRepository.record({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'AGENT_PROFILE_UPDATED',
      entityType: 'USER',
      entityId: agentId,
      ipAddress,
      userAgent,
      previousState: previousProfile as unknown as Record<string, unknown>,
      newState: updated.toDto() as unknown as Record<string, unknown>,
      notes: `Updated profile for agent ${updated.fullName}`,
    });

    return updated.toDto();
  }

  async updateAgentStatus(
    agentId: string,
    status: UserStatus,
    adminId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserDto> {
    const agent = await userRepository.findById(agentId);
    if (!agent) {
      throw AppError.notFound('Agent not found');
    }

    if (agent.role !== 'AGENT') {
      throw AppError.badRequest('User is not an agent');
    }

    const previousStatus = agent.status;
    const updated = await userRepository.update(agentId, { status });
    if (!updated) {
      throw AppError.notFound('Agent not found during status update');
    }

    await auditLogRepository.record({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'AGENT_STATUS_UPDATED',
      entityType: 'USER',
      entityId: agentId,
      ipAddress,
      userAgent,
      previousState: { status: previousStatus },
      newState: { status },
      notes: `Updated agent status from ${previousStatus} to ${status}`,
    });

    return updated.toDto();
  }

  async resetAgentPassword(
    agentId: string,
    newPassword: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserDto> {
    const agent = await userRepository.findById(agentId);
    if (!agent) {
      throw AppError.notFound('Agent not found');
    }

    if (agent.role !== 'AGENT') {
      throw AppError.badRequest('User is not an agent');
    }

    const passwordHash = await authService.hashPassword(newPassword);

    const updated = await userRepository.update(agentId, {
      passwordHash,
      refreshTokenHash: null,
    } as any);

    if (!updated) {
      throw AppError.notFound('Agent not found during password reset');
    }

    await auditLogRepository.record({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'AGENT_PASSWORD_RESET',
      entityType: 'USER',
      entityId: agentId,
      ipAddress,
      userAgent,
      notes: `Admin initiated password reset for agent ${agent.fullName}`,
    });

    return updated.toDto();
  }

  async listAgents(options: {
    page: number;
    limit: number;
    search?: string;
    status?: UserStatus;
  }): Promise<{ agents: UserDto[]; total: number; totalPages: number }> {
    const skip = (options.page - 1) * options.limit;
    const { users, total } = await userRepository.findAgents({
      search: options.search,
      status: options.status,
      skip,
      limit: options.limit,
    });

    const totalPages = Math.ceil(total / options.limit) || 1;

    return {
      agents: users.map((u) => u.toDto()),
      total,
      totalPages,
    };
  }

  async updateOwnProfile(
    userId: string,
    input: {
      fullName?: string;
      email?: string | null;
      mobile?: string;
      agencyName?: string;
      city?: string;
    },
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserDto> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const previousProfile = user.toDto();
    const updateData: Record<string, any> = {};

    if (input.fullName && input.fullName.trim()) {
      updateData.fullName = input.fullName.trim();
    }

    if (input.email !== undefined) {
      const trimmedEmail = input.email ? input.email.trim().toLowerCase() : undefined;
      if (trimmedEmail && trimmedEmail !== user.email?.toLowerCase()) {
        const existingEmail = await userRepository.findByEmail(trimmedEmail);
        if (existingEmail && existingEmail._id.toString() !== userId) {
          throw AppError.conflict('A user with this email address already exists');
        }
      }
      updateData.email = trimmedEmail;
    }

    if (input.mobile !== undefined && input.mobile.trim()) {
      const trimmedMobile = input.mobile.trim();
      if (trimmedMobile !== user.mobile) {
        const existingMobile = await userRepository.findByMobile(trimmedMobile);
        if (existingMobile && existingMobile._id.toString() !== userId) {
          throw AppError.conflict('A user with this mobile number already exists');
        }
        updateData.mobile = trimmedMobile;
      }
    }

    if (input.agencyName !== undefined || input.city !== undefined) {
      updateData.agentProfile = {
        ...(user.agentProfile || {}),
        agencyName: input.agencyName !== undefined ? input.agencyName.trim() : user.agentProfile?.agencyName,
        city: input.city !== undefined ? input.city.trim() : user.agentProfile?.city,
        maxDiscountPercent: user.agentProfile?.maxDiscountPercent ?? 5,
        maxMarkupPercent: user.agentProfile?.maxMarkupPercent ?? 20,
        canApproveFinalPrice: user.agentProfile?.canApproveFinalPrice ?? false,
      };
    }

    const updated = await userRepository.update(userId, updateData as any);
    if (!updated) {
      throw AppError.notFound('Failed to update user profile');
    }

    await auditLogRepository.record({
      actorId: userId,
      actorRole: user.role,
      action: 'AGENT_PROFILE_UPDATED',
      entityType: 'USER',
      entityId: userId,
      ipAddress,
      userAgent,
      previousState: previousProfile as unknown as Record<string, unknown>,
      newState: updated.toDto() as unknown as Record<string, unknown>,
      notes: `User ${updated.fullName} updated their account profile`,
    });

    return updated.toDto();
  }
}

export const userService = new UserService();
