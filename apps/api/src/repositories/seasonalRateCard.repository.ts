import { MealPlan } from '@chirag/types';
import { ISeasonalRateCardDocument, SeasonalRateCardModel } from '../models/seasonalRateCard.model';

export interface FindRateCardsFilter {
  hotelId?: string;
  roomCategoryId?: string;
  seasonId?: string;
  mealPlan?: MealPlan;
  isActive?: boolean;
  skip?: number;
  limit?: number;
}

export class SeasonalRateCardRepository {
  async findById(id: string): Promise<ISeasonalRateCardDocument | null> {
    return SeasonalRateCardModel.findById(id).exec();
  }

  async findByHotel(hotelId: string, isActive?: boolean): Promise<ISeasonalRateCardDocument[]> {
    const query: Record<string, unknown> = { hotelId };
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    return SeasonalRateCardModel.find(query).sort({ validFrom: 1 }).exec();
  }

  async findExact(
    hotelId: string,
    roomCategoryId: string,
    seasonId: string,
    mealPlan: MealPlan
  ): Promise<ISeasonalRateCardDocument | null> {
    return SeasonalRateCardModel.findOne({
      hotelId,
      roomCategoryId,
      seasonId,
      mealPlan,
    }).exec();
  }

  async findMany(filter: FindRateCardsFilter = {}): Promise<{
    rateCards: ISeasonalRateCardDocument[];
    total: number;
  }> {
    const query: Record<string, unknown> = {};

    if (filter.hotelId) query.hotelId = filter.hotelId;
    if (filter.roomCategoryId) query.roomCategoryId = filter.roomCategoryId;
    if (filter.seasonId) query.seasonId = filter.seasonId;
    if (filter.mealPlan) query.mealPlan = filter.mealPlan;
    if (filter.isActive !== undefined) query.isActive = filter.isActive;

    const skip = filter.skip || 0;
    const limit = filter.limit || 100;

    const [rateCards, total] = await Promise.all([
      SeasonalRateCardModel.find(query).sort({ validFrom: 1 }).skip(skip).limit(limit).exec(),
      SeasonalRateCardModel.countDocuments(query).exec(),
    ]);

    return { rateCards, total };
  }

  async create(data: Partial<ISeasonalRateCardDocument>): Promise<ISeasonalRateCardDocument> {
    const rateCard = new SeasonalRateCardModel(data);
    return rateCard.save();
  }

  async update(
    id: string,
    updateData: Partial<ISeasonalRateCardDocument>
  ): Promise<ISeasonalRateCardDocument | null> {
    return SeasonalRateCardModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await SeasonalRateCardModel.findByIdAndDelete(id).exec();
    return !!result;
  }
}

export const seasonalRateCardRepository = new SeasonalRateCardRepository();
