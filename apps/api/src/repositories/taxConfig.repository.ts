import { ITaxConfigDocument, TaxConfigModel } from '../models/taxConfig.model';

export class TaxConfigRepository {
  async findById(id: string): Promise<ITaxConfigDocument | null> {
    return TaxConfigModel.findById(id).exec();
  }

  async findByName(name: string): Promise<ITaxConfigDocument | null> {
    return TaxConfigModel.findOne({ name }).exec();
  }

  async findDefault(): Promise<ITaxConfigDocument | null> {
    return TaxConfigModel.findOne({ isDefault: true, isApplicable: true }).exec();
  }

  async findMany(filter: { isApplicable?: boolean; jurisdiction?: string } = {}): Promise<ITaxConfigDocument[]> {
    const query: Record<string, unknown> = {};
    if (filter.isApplicable !== undefined) query.isApplicable = filter.isApplicable;
    if (filter.jurisdiction) query.jurisdiction = filter.jurisdiction;

    return TaxConfigModel.find(query).sort({ isDefault: -1, ratePercent: 1 }).exec();
  }

  async create(data: Partial<ITaxConfigDocument>): Promise<ITaxConfigDocument> {
    if (data.isDefault) {
      // Clear default flag on existing records if setting this one as default
      await TaxConfigModel.updateMany({ isDefault: true }, { isDefault: false }).exec();
    }
    const tax = new TaxConfigModel(data);
    return tax.save();
  }

  async update(id: string, updateData: Partial<ITaxConfigDocument>): Promise<ITaxConfigDocument | null> {
    if (updateData.isDefault) {
      await TaxConfigModel.updateMany({ _id: { $ne: id }, isDefault: true }, { isDefault: false }).exec();
    }
    return TaxConfigModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }
}

export const taxConfigRepository = new TaxConfigRepository();
