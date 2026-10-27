import { DestinationRegion } from '@chirag/types';
import { DestinationModel, IDestinationDocument } from '../models/destination.model';

export interface FindDestinationsFilter {
  search?: string;
  region?: DestinationRegion;
  isActive?: boolean;
  skip?: number;
  limit?: number;
}

export class DestinationRepository {
  async findById(id: string): Promise<IDestinationDocument | null> {
    return DestinationModel.findById(id).exec();
  }

  async findBySlug(slug: string): Promise<IDestinationDocument | null> {
    return DestinationModel.findOne({ slug: slug.toLowerCase() }).exec();
  }

  async findByName(name: string): Promise<IDestinationDocument | null> {
    return DestinationModel.findOne({ name }).exec();
  }

  async findMany(filter: FindDestinationsFilter = {}): Promise<{
    destinations: IDestinationDocument[];
    total: number;
  }> {
    const query: Record<string, unknown> = {};

    if (filter.isActive !== undefined) {
      query.isActive = filter.isActive;
    }

    if (filter.region) {
      query.region = filter.region;
    }

    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ name: regex }, { state: regex }, { country: regex }];
    }

    const skip = filter.skip || 0;
    const limit = filter.limit || 50;

    const [destinations, total] = await Promise.all([
      DestinationModel.find(query).sort({ name: 1 }).skip(skip).limit(limit).exec(),
      DestinationModel.countDocuments(query).exec(),
    ]);

    return { destinations, total };
  }

  async create(data: Partial<IDestinationDocument>): Promise<IDestinationDocument> {
    const dest = new DestinationModel(data);
    return dest.save();
  }

  async update(
    id: string,
    updateData: Partial<IDestinationDocument>
  ): Promise<IDestinationDocument | null> {
    return DestinationModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }
}

export const destinationRepository = new DestinationRepository();
