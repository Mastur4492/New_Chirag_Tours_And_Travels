import { ISeasonDocument, SeasonModel } from '../models/season.model';

export interface FindSeasonsFilter {
  destinationId?: string;
  seasonType?: string;
  skip?: number;
  limit?: number;
}

export class SeasonRepository {
  async findById(id: string): Promise<ISeasonDocument | null> {
    return SeasonModel.findById(id).exec();
  }

  async findByDestination(destinationId: string): Promise<ISeasonDocument[]> {
    return SeasonModel.find({ destinationId }).sort({ priority: -1, startDate: 1 }).exec();
  }

  async findMany(filter: FindSeasonsFilter = {}): Promise<{
    seasons: ISeasonDocument[];
    total: number;
  }> {
    const query: Record<string, unknown> = {};

    if (filter.destinationId) {
      query.destinationId = filter.destinationId;
    }

    if (filter.seasonType) {
      query.seasonType = filter.seasonType;
    }

    const skip = filter.skip || 0;
    const limit = filter.limit || 50;

    const [seasons, total] = await Promise.all([
      SeasonModel.find(query).sort({ priority: -1, startDate: 1 }).skip(skip).limit(limit).exec(),
      SeasonModel.countDocuments(query).exec(),
    ]);

    return { seasons, total };
  }

  async create(data: Partial<ISeasonDocument>): Promise<ISeasonDocument> {
    const season = new SeasonModel(data);
    return season.save();
  }

  async update(id: string, updateData: Partial<ISeasonDocument>): Promise<ISeasonDocument | null> {
    return SeasonModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await SeasonModel.findByIdAndDelete(id).exec();
    return !!result;
  }
}

export const seasonRepository = new SeasonRepository();
