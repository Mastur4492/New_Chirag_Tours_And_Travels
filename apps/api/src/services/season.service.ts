import {
  CreateSeasonInput,
  SeasonDto,
  SeasonType,
  UpdateSeasonInput,
} from '@chirag/types';
import { resolveSeasonForDate } from '@chirag/pricing';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { destinationRepository } from '../repositories/destination.repository';
import { seasonRepository } from '../repositories/season.repository';
import { seasonalRateCardRepository } from '../repositories/seasonalRateCard.repository';
import { cacheService } from './cache.service';
import { AppError } from '../utils/appError';
import { ActorContext } from './destination.service';

export class SeasonService {
  async createSeason(input: CreateSeasonInput, actor: ActorContext): Promise<SeasonDto> {
    const destination = await destinationRepository.findById(input.destinationId);
    if (!destination) {
      throw AppError.badRequest(`Destination with ID "${input.destinationId}" does not exist`);
    }

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (endDate.getTime() < startDate.getTime()) {
      throw AppError.badRequest('endDate must be on or after startDate');
    }

    const created = await seasonRepository.create({
      name: input.name,
      seasonType: input.seasonType,
      destinationId: destination._id,
      startDate,
      endDate,
      priority: input.priority ?? 10,
      description: input.description,
    });

    // Invalidate cached season lookups
    await cacheService.delPattern('season:');

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_CREATED',
      entityType: 'SEASON',
      entityId: created._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: created.toDto() as unknown as Record<string, unknown>,
      notes: `Created season "${created.name}" for destination ${destination.name}`,
    });

    return created.toDto();
  }

  async updateSeason(
    id: string,
    input: UpdateSeasonInput,
    actor: ActorContext
  ): Promise<SeasonDto> {
    const season = await seasonRepository.findById(id);
    if (!season) {
      throw AppError.notFound('Season not found');
    }

    if (input.destinationId && input.destinationId !== season.destinationId.toString()) {
      const dest = await destinationRepository.findById(input.destinationId);
      if (!dest) {
        throw AppError.badRequest(`Destination with ID "${input.destinationId}" does not exist`);
      }
    }

    const startDate = input.startDate ? new Date(input.startDate) : season.startDate;
    const endDate = input.endDate ? new Date(input.endDate) : season.endDate;
    if (endDate.getTime() < startDate.getTime()) {
      throw AppError.badRequest('endDate must be on or after startDate');
    }

    const previousState = season.toDto();
    const updated = await seasonRepository.update(id, input as any);
    if (!updated) {
      throw AppError.notFound('Season could not be updated');
    }

    // Invalidate cached season lookups
    await cacheService.delPattern('season:');

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_UPDATED',
      entityType: 'SEASON',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updated.toDto() as unknown as Record<string, unknown>,
      notes: `Updated season ${updated.name}`,
    });

    return updated.toDto();
  }

  async getSeasonById(id: string): Promise<SeasonDto> {
    const season = await seasonRepository.findById(id);
    if (!season) {
      throw AppError.notFound('Season not found');
    }
    return season.toDto();
  }

  async listSeasons(options: {
    page?: number;
    limit?: number;
    destinationId?: string;
    seasonType?: SeasonType;
  }): Promise<{ items: SeasonDto[]; total: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const skip = (page - 1) * limit;

    const { seasons, total } = await seasonRepository.findMany({
      destinationId: options.destinationId,
      seasonType: options.seasonType,
      skip,
      limit,
    });

    return {
      items: seasons.map((s) => s.toDto()),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async deleteSeason(id: string, actor: ActorContext): Promise<void> {
    const season = await seasonRepository.findById(id);
    if (!season) {
      throw AppError.notFound('Season not found');
    }

    const { total } = await seasonalRateCardRepository.findMany({ seasonId: id, limit: 1 });
    if (total > 0) {
      throw AppError.conflict(
        `Cannot delete season "${season.name}": ${total} seasonal rate card(s) are linked to this season. Remove or reassign linked rate cards first.`
      );
    }

    const previousState = season.toDto();
    await seasonRepository.delete(id);

    // Invalidate cached season lookups
    await cacheService.delPattern('season:');

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_DELETED',
      entityType: 'SEASON',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: previousState as unknown as Record<string, unknown>,
      notes: `Deleted season ${season.name}`,
    });
  }

  async resolveSeasonForDate(destinationId: string, dateStr: string): Promise<SeasonType> {
    const cacheKey = `season:resolve:${destinationId}:${dateStr}`;
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const seasonsKey = `season:dest:${destinationId}`;
        const seasonDtos = await cacheService.getOrSet(
          seasonsKey,
          async () => {
            const seasons = await seasonRepository.findByDestination(destinationId);
            return seasons.map((s) => s.toDto());
          },
          600 // 10 minutes cache
        );

        const resolved = resolveSeasonForDate(dateStr, seasonDtos);
        return resolved ? resolved.seasonType : 'REGULAR';
      },
      600 // 10 minutes cache
    );
  }
}

export const seasonService = new SeasonService();
