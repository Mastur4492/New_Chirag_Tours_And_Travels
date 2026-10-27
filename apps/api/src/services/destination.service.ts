import {
  CreateDestinationInput,
  DestinationDto,
  DestinationRegion,
  UpdateDestinationInput,
  UserRole,
} from '@chirag/types';
import { destinationRepository } from '../repositories/destination.repository';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { AppError } from '../utils/appError';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface ActorContext {
  userId: string;
  role: UserRole;
  ipAddress?: string;
  userAgent?: string;
}

export class DestinationService {
  async createDestination(
    input: CreateDestinationInput,
    actor: ActorContext
  ): Promise<DestinationDto> {
    const slug = input.slug ? generateSlug(input.slug) : generateSlug(input.name);

    const [existingSlug, existingName] = await Promise.all([
      destinationRepository.findBySlug(slug),
      destinationRepository.findByName(input.name),
    ]);

    if (existingSlug || existingName) {
      throw AppError.conflict(
        `Destination with name "${input.name}" or slug "${slug}" already exists`
      );
    }

    const created = await destinationRepository.create({
      name: input.name,
      slug,
      country: input.country || 'India',
      state: input.state,
      region: input.region,
      description: input.description,
      coverImages: input.coverImages || [],
      highlights: input.highlights || [],
      isActive: input.isActive !== undefined ? input.isActive : true,
    });

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_CREATED',
      entityType: 'DESTINATION',
      entityId: created._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: created.toDto() as unknown as Record<string, unknown>,
      notes: `Created destination ${created.name}`,
    });

    return created.toDto();
  }

  async updateDestination(
    id: string,
    input: UpdateDestinationInput,
    actor: ActorContext
  ): Promise<DestinationDto> {
    const destination = await destinationRepository.findById(id);
    if (!destination) {
      throw AppError.notFound('Destination not found');
    }

    const previousState = destination.toDto();
    const updateData: Record<string, unknown> = { ...input };

    if (input.slug) {
      const slug = generateSlug(input.slug);
      const existing = await destinationRepository.findBySlug(slug);
      if (existing && existing._id.toString() !== id) {
        throw AppError.conflict(`Destination slug "${slug}" is already in use`);
      }
      updateData.slug = slug;
    }

    if (input.name && input.name !== destination.name) {
      const existing = await destinationRepository.findByName(input.name);
      if (existing && existing._id.toString() !== id) {
        throw AppError.conflict(`Destination name "${input.name}" is already in use`);
      }
    }

    const updated = await destinationRepository.update(id, updateData);
    if (!updated) {
      throw AppError.notFound('Destination could not be updated');
    }

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_UPDATED',
      entityType: 'DESTINATION',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updated.toDto() as unknown as Record<string, unknown>,
      notes: `Updated destination ${updated.name}`,
    });

    return updated.toDto();
  }

  async toggleDestinationStatus(
    id: string,
    isActive: boolean,
    actor: ActorContext
  ): Promise<DestinationDto> {
    const destination = await destinationRepository.findById(id);
    if (!destination) {
      throw AppError.notFound('Destination not found');
    }

    const updated = await destinationRepository.update(id, { isActive });
    if (!updated) {
      throw AppError.notFound('Destination could not be updated');
    }

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: isActive ? 'MASTER_DATA_ACTIVATED' : 'MASTER_DATA_DEACTIVATED',
      entityType: 'DESTINATION',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      notes: `Destination ${updated.name} ${isActive ? 'activated' : 'deactivated'}`,
    });

    return updated.toDto();
  }

  async getDestinationById(id: string): Promise<DestinationDto> {
    const destination = await destinationRepository.findById(id);
    if (!destination) {
      throw AppError.notFound('Destination not found');
    }
    return destination.toDto();
  }

  async getDestinationBySlug(slug: string): Promise<DestinationDto> {
    const destination = await destinationRepository.findBySlug(slug);
    if (!destination) {
      throw AppError.notFound(`Destination with slug "${slug}" not found`);
    }
    return destination.toDto();
  }

  async listDestinations(options: {
    page?: number;
    limit?: number;
    search?: string;
    region?: DestinationRegion;
    isActive?: boolean;
  }): Promise<{ items: DestinationDto[]; total: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const skip = (page - 1) * limit;

    const { destinations, total } = await destinationRepository.findMany({
      search: options.search,
      region: options.region,
      isActive: options.isActive,
      skip,
      limit,
    });

    return {
      items: destinations.map((d) => d.toDto()),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const destinationService = new DestinationService();
