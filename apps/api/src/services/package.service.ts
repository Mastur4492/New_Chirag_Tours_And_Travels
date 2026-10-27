import { CreateTourPackageInput, TourPackageDto, UpdateTourPackageInput, UserRole } from '@chirag/types';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { destinationRepository } from '../repositories/destination.repository';
import { tourPackageRepository } from '../repositories/package.repository';
import { AppError } from '../utils/appError';
import { ActorContext } from './destination.service';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class TourPackageService {
  async createPackage(
    input: CreateTourPackageInput,
    actor: ActorContext
  ): Promise<TourPackageDto> {
    const destination = await destinationRepository.findById(input.destinationId);
    if (!destination) {
      throw AppError.badRequest(`Destination with ID "${input.destinationId}" does not exist`);
    }

    const slug = input.slug ? generateSlug(input.slug) : generateSlug(input.title);
    const existingSlug = await tourPackageRepository.findBySlug(slug);
    if (existingSlug) {
      throw AppError.conflict(`Tour package with slug "${slug}" already exists`);
    }

    if (!input.dayWiseItinerary || input.dayWiseItinerary.length === 0) {
      throw AppError.badRequest('At least one itinerary day is required');
    }

    const created = await tourPackageRepository.create({
      title: input.title,
      slug,
      destinationId: destination._id,
      durationNights: input.durationNights,
      durationDays: input.durationDays,
      overview: input.overview,
      dayWiseItinerary: input.dayWiseItinerary,
      inclusions: input.inclusions || [],
      exclusions: input.exclusions || [],
      termsAndConditions: input.termsAndConditions || [],
      cancellationPolicy: input.cancellationPolicy || [],
      featuredImage: input.featuredImage,
      galleryImages: input.galleryImages || [],
      defaultMealPlan: input.defaultMealPlan,
      defaultVehicleCategory: input.defaultVehicleCategory,
      startingPrice: input.startingPrice,
      isPublished: input.isPublished !== undefined ? input.isPublished : true,
    });

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_CREATED',
      entityType: 'PACKAGE',
      entityId: created._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: created.toDto() as unknown as Record<string, unknown>,
      notes: `Created tour package "${created.title}"`,
    });

    const dto = created.toDto();
    dto.destinationName = destination.name;
    return dto;
  }

  async updatePackage(
    id: string,
    input: UpdateTourPackageInput,
    actor: ActorContext
  ): Promise<TourPackageDto> {
    const pkg = await tourPackageRepository.findById(id);
    if (!pkg) {
      throw AppError.notFound('Tour package not found');
    }

    if (input.destinationId && input.destinationId !== pkg.destinationId.toString()) {
      const dest = await destinationRepository.findById(input.destinationId);
      if (!dest) {
        throw AppError.badRequest(`Destination with ID "${input.destinationId}" does not exist`);
      }
    }

    const updatePayload: Record<string, unknown> = { ...input };
    if (input.slug) {
      const slug = generateSlug(input.slug);
      const existing = await tourPackageRepository.findBySlug(slug);
      if (existing && existing._id.toString() !== id) {
        throw AppError.conflict(`Tour package slug "${slug}" is already in use`);
      }
      updatePayload.slug = slug;
    }

    const previousState = pkg.toDto();
    const updated = await tourPackageRepository.update(id, updatePayload as any);
    if (!updated) {
      throw AppError.notFound('Tour package could not be updated');
    }

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_UPDATED',
      entityType: 'PACKAGE',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updated.toDto() as unknown as Record<string, unknown>,
      notes: `Updated tour package ${updated.title}`,
    });

    const destination = await destinationRepository.findById(updated.destinationId.toString());
    const dto = updated.toDto();
    dto.destinationName = destination?.name;
    return dto;
  }

  async getPackageById(id: string, callerRole?: UserRole): Promise<TourPackageDto> {
    const pkg = await tourPackageRepository.findById(id);
    if (!pkg) {
      throw AppError.notFound('Tour package not found');
    }
    // Publication guard: only authenticated ADMIN and AGENT can access unpublished drafts
    if (!pkg.isPublished && callerRole !== 'ADMIN' && callerRole !== 'AGENT') {
      throw AppError.notFound('Tour package not found');
    }
    const destination = await destinationRepository.findById(pkg.destinationId.toString());
    const dto = pkg.toDto();
    dto.destinationName = destination?.name;
    return dto;
  }

  async getPackageBySlug(slug: string, callerRole?: UserRole): Promise<TourPackageDto> {
    const pkg = await tourPackageRepository.findBySlug(slug);
    if (!pkg) {
      throw AppError.notFound(`Tour package with slug "${slug}" not found`);
    }
    // Publication guard: only authenticated ADMIN and AGENT can access unpublished drafts
    if (!pkg.isPublished && callerRole !== 'ADMIN' && callerRole !== 'AGENT') {
      throw AppError.notFound(`Tour package with slug "${slug}" not found`);
    }
    const destination = await destinationRepository.findById(pkg.destinationId.toString());
    const dto = pkg.toDto();
    dto.destinationName = destination?.name;
    return dto;
  }

  async listPackages(options: {
    page?: number;
    limit?: number;
    destinationId?: string;
    isPublished?: boolean;
    search?: string;
    callerRole?: UserRole;
  }): Promise<{ items: TourPackageDto[]; total: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const skip = (page - 1) * limit;

    // Publication guard: anonymous visitors or unauthorized roles must ONLY see published packages
    let isPublished = options.isPublished;
    if (options.callerRole !== 'ADMIN' && options.callerRole !== 'AGENT') {
      isPublished = true;
    }

    const { packages, total } = await tourPackageRepository.findMany({
      destinationId: options.destinationId,
      isPublished,
      search: options.search,
      skip,
      limit,
    });

    return {
      items: packages.map((p) => p.toDto()),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async togglePublish(
    id: string,
    isPublished: boolean,
    actor: ActorContext
  ): Promise<TourPackageDto> {
    const pkg = await tourPackageRepository.findById(id);
    if (!pkg) {
      throw AppError.notFound('Tour package not found');
    }

    const updated = await tourPackageRepository.update(id, { isPublished });
    if (!updated) {
      throw AppError.notFound('Tour package could not be updated');
    }

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: isPublished ? 'MASTER_DATA_ACTIVATED' : 'MASTER_DATA_DEACTIVATED',
      entityType: 'PACKAGE',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      notes: `Package ${updated.title} ${isPublished ? 'published' : 'unpublished'}`,
    });

    return updated.toDto();
  }
}

export const tourPackageService = new TourPackageService();
