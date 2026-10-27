import {
  CreateHotelInput,
  CreateRoomCategoryInput,
  CreateSeasonalRateCardInput,
  HotelDto,
  HotelPropertyType,
  MealPlan,
  RoomCategoryDto,
  SeasonalRateCardDto,
  UpdateHotelInput,
  UpdateRoomCategoryInput,
  UpdateSeasonalRateCardInput,
  UserRole,
} from '@chirag/types';
import { auditLogRepository } from '../repositories/auditLog.repository';
import { destinationRepository } from '../repositories/destination.repository';
import { hotelRepository } from '../repositories/hotel.repository';
import { roomCategoryRepository } from '../repositories/roomCategory.repository';
import { seasonalRateCardRepository } from '../repositories/seasonalRateCard.repository';
import { seasonRepository } from '../repositories/season.repository';
import { AppError } from '../utils/appError';
import { ActorContext } from './destination.service';

export class HotelService {
  // ===================== HOTELS =====================
  async createHotel(input: CreateHotelInput, actor: ActorContext): Promise<HotelDto> {
    const destination = await destinationRepository.findById(input.destinationId);
    if (!destination) {
      throw AppError.badRequest(`Destination with ID "${input.destinationId}" does not exist`);
    }

    const created = await hotelRepository.create({
      name: input.name,
      destinationId: destination._id,
      starRating: input.starRating,
      propertyType: input.propertyType,
      address: input.address,
      city: input.city,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      vendorName: input.vendorName,
      amenities: input.amenities || [],
      images: input.images || [],
      checkInTime: input.checkInTime || '14:00',
      checkOutTime: input.checkOutTime || '11:00',
      isActive: input.isActive !== undefined ? input.isActive : true,
    });

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_CREATED',
      entityType: 'HOTEL',
      entityId: created._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: created.toDto({ includeVendorInfo: true }) as unknown as Record<string, unknown>,
      notes: `Created hotel ${created.name}`,
    });

    return created.toDto({ includeVendorInfo: actor.role === 'ADMIN' });
  }

  async updateHotel(
    id: string,
    input: UpdateHotelInput,
    actor: ActorContext
  ): Promise<HotelDto> {
    const hotel = await hotelRepository.findById(id);
    if (!hotel) {
      throw AppError.notFound('Hotel not found');
    }

    if (input.destinationId && input.destinationId !== hotel.destinationId.toString()) {
      const destination = await destinationRepository.findById(input.destinationId);
      if (!destination) {
        throw AppError.badRequest(`Destination with ID "${input.destinationId}" does not exist`);
      }
    }

    const previousState = hotel.toDto({ includeVendorInfo: true });
    const updated = await hotelRepository.update(id, input as any);
    if (!updated) {
      throw AppError.notFound('Hotel could not be updated');
    }

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_UPDATED',
      entityType: 'HOTEL',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updated.toDto({ includeVendorInfo: true }) as unknown as Record<string, unknown>,
      notes: `Updated hotel ${updated.name}`,
    });

    return updated.toDto({ includeVendorInfo: actor.role === 'ADMIN' });
  }

  async getHotelById(id: string, role?: UserRole): Promise<HotelDto> {
    const hotel = await hotelRepository.findById(id);
    if (!hotel) {
      throw AppError.notFound('Hotel not found');
    }

    const rooms = await roomCategoryRepository.findByHotelId(id);
    const dto = hotel.toDto({ includeVendorInfo: role === 'ADMIN' });
    dto.roomCategories = rooms.map((r) => r.toDto());
    return dto;
  }

  async listHotels(options: {
    page?: number;
    limit?: number;
    destinationId?: string;
    starRating?: number;
    propertyType?: HotelPropertyType;
    isActive?: boolean;
    search?: string;
    role?: UserRole;
  }): Promise<{ items: HotelDto[]; total: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const skip = (page - 1) * limit;

    const { hotels, total } = await hotelRepository.findMany({
      destinationId: options.destinationId,
      starRating: options.starRating,
      propertyType: options.propertyType,
      isActive: options.isActive,
      search: options.search,
      skip,
      limit,
    });

    const hotelIds = hotels.map((h) => h._id);
    const [allRooms, allRateCards] = await Promise.all([
      roomCategoryRepository.findByHotelIds(hotelIds, options.isActive),
      seasonalRateCardRepository.findMany({ isActive: true, limit: 500 }).catch(() => ({ rateCards: [] })),
    ]);

    // Group rooms and rate cards by hotelId
    const roomsByHotel = new Map<string, RoomCategoryDto[]>();
    for (const r of allRooms) {
      const hId = r.hotelId.toString();
      if (!roomsByHotel.has(hId)) roomsByHotel.set(hId, []);

      const dto = r.toDto();
      // Check if an active seasonal rate card exists for this room
      const matchedRc = (allRateCards as any)?.rateCards?.find(
        (rc: any) => rc.roomCategoryId.toString() === dto.id
      );
      if (matchedRc && matchedRc.standardSellingPrice) {
        dto.pricePerNight = matchedRc.standardSellingPrice;
      }
      roomsByHotel.get(hId)!.push(dto);
    }

    const items = hotels.map((h) => {
      const dto = h.toDto({ includeVendorInfo: options.role === 'ADMIN' });
      const hotelRooms = roomsByHotel.get(h._id.toString()) || [];
      // Ensure each room has a realistic price per night based on star rating if not explicitly set
      const defaultStarPrice =
        h.starRating >= 5 ? 8500 : h.starRating === 4 ? 5500 : h.starRating === 3 ? 3500 : 2500;

      dto.roomCategories = hotelRooms.map((room) => ({
        ...room,
        pricePerNight:
          room.pricePerNight && room.pricePerNight > 0 ? room.pricePerNight : defaultStarPrice,
      }));
      return dto;
    });

    return {
      items,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // ===================== ROOM CATEGORIES =====================
  async createRoomCategory(
    input: CreateRoomCategoryInput,
    actor: ActorContext
  ): Promise<RoomCategoryDto> {
    const hotel = await hotelRepository.findById(input.hotelId);
    if (!hotel) {
      throw AppError.badRequest(`Hotel with ID "${input.hotelId}" does not exist`);
    }

    const existingName = await roomCategoryRepository.findByNameAndHotel(input.hotelId, input.name);
    if (existingName) {
      throw AppError.conflict(
        `Room category with name "${input.name}" already exists for hotel "${hotel.name}"`
      );
    }

    const created = await roomCategoryRepository.create({
      hotelId: hotel._id,
      name: input.name,
      baseOccupancy: input.baseOccupancy ?? 2,
      maxAdults: input.maxAdults ?? 3,
      maxChildren: input.maxChildren ?? 2,
      extraBedSupported: input.extraBedSupported ?? true,
      maxExtraBeds: input.maxExtraBeds ?? 1,
      allowedMealPlans: input.allowedMealPlans || ['RO', 'CP', 'MAP', 'AP'],
      pricePerNight: input.pricePerNight ?? 0,
      totalRooms: input.totalRooms,
      isActive: input.isActive !== undefined ? input.isActive : true,
    });

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_CREATED',
      entityType: 'ROOM_CATEGORY',
      entityId: created._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: created.toDto() as unknown as Record<string, unknown>,
      notes: `Created room category ${created.name} in hotel ${hotel.name}`,
    });

    return created.toDto();
  }

  async updateRoomCategory(
    id: string,
    input: UpdateRoomCategoryInput,
    actor: ActorContext
  ): Promise<RoomCategoryDto> {
    const room = await roomCategoryRepository.findById(id);
    if (!room) {
      throw AppError.notFound('Room category not found');
    }

    if (input.name && input.name.toLowerCase() !== room.name.toLowerCase()) {
      const existing = await roomCategoryRepository.findByNameAndHotel(
        room.hotelId.toString(),
        input.name
      );
      if (existing && existing._id.toString() !== id) {
        throw AppError.conflict(`Room category "${input.name}" already exists for this hotel`);
      }
    }

    const previousState = room.toDto();
    const updated = await roomCategoryRepository.update(id, input as any);
    if (!updated) {
      throw AppError.notFound('Room category could not be updated');
    }

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_UPDATED',
      entityType: 'ROOM_CATEGORY',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updated.toDto() as unknown as Record<string, unknown>,
      notes: `Updated room category ${updated.name}`,
    });

    return updated.toDto();
  }

  async listRoomCategoriesByHotel(hotelId: string, isActive?: boolean): Promise<RoomCategoryDto[]> {
    const rooms = await roomCategoryRepository.findByHotelId(hotelId, isActive);
    return rooms.map((r) => r.toDto());
  }

  // ===================== SEASONAL RATE CARDS =====================
  async createSeasonalRateCard(
    input: CreateSeasonalRateCardInput,
    actor: ActorContext
  ): Promise<SeasonalRateCardDto> {
    const [hotel, room, season] = await Promise.all([
      hotelRepository.findById(input.hotelId),
      roomCategoryRepository.findById(input.roomCategoryId),
      seasonRepository.findById(input.seasonId),
    ]);

    if (!hotel) {
      throw AppError.badRequest(`Hotel with ID "${input.hotelId}" does not exist`);
    }
    if (!room || room.hotelId.toString() !== hotel._id.toString()) {
      throw AppError.badRequest(
        `Room category "${input.roomCategoryId}" does not belong to hotel "${hotel.name}"`
      );
    }
    if (!season) {
      throw AppError.badRequest(`Season with ID "${input.seasonId}" does not exist`);
    }
    if (season.destinationId.toString() !== hotel.destinationId.toString()) {
      throw AppError.badRequest(
        `Season destination does not match the hotel's destination`
      );
    }

    const existingExact = await seasonalRateCardRepository.findExact(
      input.hotelId,
      input.roomCategoryId,
      input.seasonId,
      input.mealPlan
    );
    if (existingExact) {
      throw AppError.conflict(
        `A rate card for this hotel, room category, season, and meal plan already exists`
      );
    }

    const validFrom = new Date(input.validFrom);
    const validTo = new Date(input.validTo);
    if (validTo.getTime() < validFrom.getTime()) {
      throw AppError.badRequest('validTo date must be on or after validFrom date');
    }

    const created = await seasonalRateCardRepository.create({
      hotelId: hotel._id,
      roomCategoryId: room._id,
      seasonId: season._id,
      mealPlan: input.mealPlan,
      baseCostPerNight: input.baseCostPerNight,
      extraAdultBedCost: input.extraAdultBedCost ?? 0,
      childWithBedCost: input.childWithBedCost ?? 0,
      childWithoutBedCost: input.childWithoutBedCost ?? 0,
      standardSellingPrice: input.standardSellingPrice,
      validFrom,
      validTo,
      isActive: input.isActive !== undefined ? input.isActive : true,
    });

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_CREATED',
      entityType: 'RATE_CARD',
      entityId: created._id.toString(),
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: created.toDto({ includeSupplierCost: true }) as unknown as Record<string, unknown>,
      notes: `Created rate card for hotel ${hotel.name}, room ${room.name}`,
    });

    return created.toDto({ includeSupplierCost: actor.role === 'ADMIN' });
  }

  async updateSeasonalRateCard(
    id: string,
    input: UpdateSeasonalRateCardInput,
    actor: ActorContext
  ): Promise<SeasonalRateCardDto> {
    const rateCard = await seasonalRateCardRepository.findById(id);
    if (!rateCard) {
      throw AppError.notFound('Seasonal rate card not found');
    }

    if (input.validFrom || input.validTo) {
      const from = input.validFrom ? new Date(input.validFrom) : rateCard.validFrom;
      const to = input.validTo ? new Date(input.validTo) : rateCard.validTo;
      if (to.getTime() < from.getTime()) {
        throw AppError.badRequest('validTo date must be on or after validFrom date');
      }
    }

    const previousState = rateCard.toDto({ includeSupplierCost: true });
    const updated = await seasonalRateCardRepository.update(id, input as any);
    if (!updated) {
      throw AppError.notFound('Seasonal rate card could not be updated');
    }

    await auditLogRepository.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'MASTER_DATA_UPDATED',
      entityType: 'RATE_CARD',
      entityId: id,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updated.toDto({ includeSupplierCost: true }) as unknown as Record<string, unknown>,
      notes: `Updated rate card ${id}`,
    });

    return updated.toDto({ includeSupplierCost: actor.role === 'ADMIN' });
  }

  async listRateCards(options: {
    page?: number;
    limit?: number;
    hotelId?: string;
    roomCategoryId?: string;
    seasonId?: string;
    mealPlan?: MealPlan;
    isActive?: boolean;
    role?: UserRole;
  }): Promise<{ items: SeasonalRateCardDto[]; total: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const skip = (page - 1) * limit;

    const { rateCards, total } = await seasonalRateCardRepository.findMany({
      hotelId: options.hotelId,
      roomCategoryId: options.roomCategoryId,
      seasonId: options.seasonId,
      mealPlan: options.mealPlan,
      isActive: options.isActive,
      skip,
      limit,
    });

    return {
      items: rateCards.map((rc) => rc.toDto({ includeSupplierCost: options.role === 'ADMIN' })),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const hotelService = new HotelService();
