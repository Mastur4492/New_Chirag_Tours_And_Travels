import { IRoomCategoryDocument, RoomCategoryModel } from '../models/roomCategory.model';

export class RoomCategoryRepository {
  async findById(id: string): Promise<IRoomCategoryDocument | null> {
    return RoomCategoryModel.findById(id).exec();
  }

  async findByHotelId(hotelId: string, isActive?: boolean): Promise<IRoomCategoryDocument[]> {
    const query: Record<string, unknown> = { hotelId };
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    return RoomCategoryModel.find(query).sort({ baseOccupancy: 1, name: 1 }).exec();
  }

  async findByHotelIds(hotelIds: (string | any)[], isActive?: boolean): Promise<IRoomCategoryDocument[]> {
    const query: Record<string, unknown> = { hotelId: { $in: hotelIds } };
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    return RoomCategoryModel.find(query).sort({ baseOccupancy: 1, name: 1 }).exec();
  }

  async findByNameAndHotel(hotelId: string, name: string): Promise<IRoomCategoryDocument | null> {
    return RoomCategoryModel.findOne({ hotelId, name: { $regex: new RegExp(`^${name}$`, 'i') } }).exec();
  }

  async create(data: Partial<IRoomCategoryDocument>): Promise<IRoomCategoryDocument> {
    const room = new RoomCategoryModel(data);
    return room.save();
  }

  async update(
    id: string,
    updateData: Partial<IRoomCategoryDocument>
  ): Promise<IRoomCategoryDocument | null> {
    return RoomCategoryModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }
}

export const roomCategoryRepository = new RoomCategoryRepository();
