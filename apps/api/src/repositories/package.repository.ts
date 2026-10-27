import { ITourPackageDocument, TourPackageModel } from '../models/tourPackage.model';

export interface FindPackagesFilter {
  destinationId?: string;
  isPublished?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}

export class TourPackageRepository {
  async findById(id: string): Promise<ITourPackageDocument | null> {
    return TourPackageModel.findById(id).exec();
  }

  async findBySlug(slug: string): Promise<ITourPackageDocument | null> {
    return TourPackageModel.findOne({ slug: slug.toLowerCase() }).exec();
  }

  async findMany(filter: FindPackagesFilter = {}): Promise<{
    packages: ITourPackageDocument[];
    total: number;
  }> {
    const query: Record<string, unknown> = {};

    if (filter.destinationId) {
      query.destinationId = filter.destinationId;
    }

    if (filter.isPublished !== undefined) {
      query.isPublished = filter.isPublished;
    }

    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ title: regex }, { overview: regex }];
    }

    const skip = filter.skip || 0;
    const limit = filter.limit || 50;

    const [packages, total] = await Promise.all([
      TourPackageModel.find(query).sort({ startingPrice: 1, title: 1 }).skip(skip).limit(limit).exec(),
      TourPackageModel.countDocuments(query).exec(),
    ]);

    return { packages, total };
  }

  async create(data: Partial<ITourPackageDocument>): Promise<ITourPackageDocument> {
    const pkg = new TourPackageModel(data);
    return pkg.save();
  }

  async update(
    id: string,
    updateData: Partial<ITourPackageDocument>
  ): Promise<ITourPackageDocument | null> {
    return TourPackageModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }
}

export const tourPackageRepository = new TourPackageRepository();
