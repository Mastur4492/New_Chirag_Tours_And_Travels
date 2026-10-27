import { HotelPropertyType } from '@chirag/types';
import { HotelModel, IHotelDocument } from '../models/hotel.model';

export interface FindHotelsFilter {
  destinationId?: string;
  starRating?: number;
  propertyType?: HotelPropertyType;
  isActive?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}

export class HotelRepository {
  async findById(id: string): Promise<IHotelDocument | null> {
    return HotelModel.findById(id).exec();
  }

  async findMany(filter: FindHotelsFilter = {}): Promise<{
    hotels: IHotelDocument[];
    total: number;
  }> {
    const query: Record<string, unknown> = {};

    if (filter.destinationId) {
      query.destinationId = filter.destinationId;
    }

    if (filter.starRating) {
      query.starRating = filter.starRating;
    }

    if (filter.propertyType) {
      query.propertyType = filter.propertyType;
    }

    if (filter.isActive !== undefined) {
      query.isActive = filter.isActive;
    }

    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ name: regex }, { city: regex }, { address: regex }];
    }

    const skip = filter.skip || 0;
    const limit = filter.limit || 50;

    const [hotels, total] = await Promise.all([
      HotelModel.find(query).sort({ starRating: -1, name: 1 }).skip(skip).limit(limit).exec(),
      HotelModel.countDocuments(query).exec(),
    ]);

    return { hotels, total };
  }

  async create(data: Partial<IHotelDocument>): Promise<IHotelDocument> {
    const hotel = new HotelModel(data);
    return hotel.save();
  }

  async update(id: string, updateData: Partial<IHotelDocument>): Promise<IHotelDocument | null> {
    return HotelModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }
}

export const hotelRepository = new HotelRepository();
