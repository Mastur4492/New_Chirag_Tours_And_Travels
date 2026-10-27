import { IQuotationVersionDocument, QuotationVersionModel } from '../models/quotationVersion.model';

export class QuotationVersionRepository {
  async findByQuotationId(quotationId: string): Promise<IQuotationVersionDocument[]> {
    return QuotationVersionModel.find({ quotationId })
      .sort({ versionNumber: -1 })
      .exec();
  }

  async findByQuotationAndVersion(
    quotationId: string,
    versionNumber: number
  ): Promise<IQuotationVersionDocument | null> {
    return QuotationVersionModel.findOne({ quotationId, versionNumber }).exec();
  }

  async create(data: Partial<IQuotationVersionDocument>): Promise<IQuotationVersionDocument> {
    const version = new QuotationVersionModel(data);
    return version.save();
  }
}

export const quotationVersionRepository = new QuotationVersionRepository();
