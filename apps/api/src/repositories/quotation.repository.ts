import { QuotationStatus } from '@chirag/types';
import { IQuotationDocument, QuotationModel } from '../models/quotation.model';

export interface FindQuotationsFilter {
  assignedAgentId?: string;
  customerId?: string;
  leadId?: string;
  status?: QuotationStatus;
  search?: string;
  skip?: number;
  limit?: number;
}

export class QuotationRepository {
  async findById(id: string): Promise<IQuotationDocument | null> {
    return QuotationModel.findById(id)
      .populate('customerId')
      .populate('destinationId')
      .populate('assignedAgentId', 'fullName email')
      .populate('hotels.hotelId', 'name')
      .populate('hotels.roomCategoryId', 'name')
      .populate('transports.vehicleId', 'model')
      .exec();
  }

  async findByQuoteNumber(quoteNumber: string): Promise<IQuotationDocument | null> {
    return QuotationModel.findOne({ quoteNumber })
      .populate('customerId')
      .populate('destinationId')
      .populate('assignedAgentId', 'fullName email')
      .populate('hotels.hotelId', 'name')
      .populate('hotels.roomCategoryId', 'name')
      .populate('transports.vehicleId', 'model')
      .exec();
  }

  async findByShareableTokenHash(shareableTokenHash: string): Promise<IQuotationDocument | null> {
    return QuotationModel.findOne({ shareableTokenHash })
      .populate('customerId')
      .populate('destinationId')
      .populate('hotels.hotelId', 'name')
      .populate('hotels.roomCategoryId', 'name')
      .populate('transports.vehicleId', 'model')
      .exec();
  }

  async findBySupersededTokenHash(tokenHash: string): Promise<IQuotationDocument | null> {
    return QuotationModel.findOne({ supersededTokenHashes: tokenHash })
      .populate('customerId')
      .populate('destinationId')
      .exec();
  }

  async findMany(filter: FindQuotationsFilter = {}): Promise<{
    quotations: IQuotationDocument[];
    total: number;
  }> {
    const query: Record<string, unknown> = {};

    if (filter.assignedAgentId) {
      query.assignedAgentId = filter.assignedAgentId;
    }

    if (filter.customerId) {
      query.customerId = filter.customerId;
    }

    if (filter.leadId) {
      query.leadId = filter.leadId;
    }

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ quoteNumber: regex }, { notes: regex }];
    }

    const skip = filter.skip || 0;
    const limit = filter.limit || 50;

    const [quotations, total] = await Promise.all([
      QuotationModel.find(query)
        .populate('customerId')
        .populate('destinationId')
        .populate('assignedAgentId', 'fullName email')
        .populate('hotels.hotelId', 'name')
        .populate('hotels.roomCategoryId', 'name')
        .populate('transports.vehicleId', 'model')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      QuotationModel.countDocuments(query).exec(),
    ]);

    return { quotations, total };
  }

  async create(data: Partial<IQuotationDocument>): Promise<IQuotationDocument> {
    const quotation = new QuotationModel(data);
    await quotation.save();
    return this.findById(quotation._id.toString()) as Promise<IQuotationDocument>;
  }

  async update(id: string, data: Partial<IQuotationDocument>): Promise<IQuotationDocument | null> {
    await QuotationModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).exec();
    return this.findById(id);
  }

  async atomicAcceptQuotation(params: {
    quotationId: string;
    version: number;
    tokenHash: string;
    notes?: string;
  }): Promise<IQuotationDocument | null> {
    const updateOps: Record<string, unknown> = {
      $set: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        ...(params.notes ? { customerAcceptanceNotes: params.notes.trim() } : {}),
      },
    };

    const doc = await QuotationModel.findOneAndUpdate(
      {
        _id: params.quotationId,
        currentVersion: params.version,
        shareableTokenHash: params.tokenHash,
        status: { $in: ['ISSUED', 'SENT'] },
        validUntil: { $gte: new Date() },
      },
      updateOps,
      { new: true, runValidators: true }
    ).exec();

    if (!doc) return null;
    return this.findById(doc._id.toString());
  }

  async revertQuotationAcceptance(id: string, previousStatus: string): Promise<IQuotationDocument | null> {
    await QuotationModel.findByIdAndUpdate(
      id,
      {
        $set: { status: previousStatus },
        $unset: { acceptedAt: 1, customerAcceptanceNotes: 1, bookingId: 1, bookingNumber: 1 },
      },
      { new: true, runValidators: true }
    ).exec();
    return this.findById(id);
  }

  async atomicReviseQuotation(params: {
    quotationId: string;
    expectedVersion: number;
    newVersion: number;
    data: Partial<IQuotationDocument>;
    tokenToRevoke?: string;
  }): Promise<IQuotationDocument | null> {
    const updateOps: Record<string, unknown> = {
      $set: {
        ...params.data,
        currentVersion: params.newVersion,
      },
    };

    if (params.tokenToRevoke) {
      updateOps.$unset = { shareableTokenHash: 1 };
      updateOps.$push = { supersededTokenHashes: params.tokenToRevoke };
    } else {
      updateOps.$unset = { shareableTokenHash: 1 };
    }

    const doc = await QuotationModel.findOneAndUpdate(
      {
        _id: params.quotationId,
        currentVersion: params.expectedVersion,
        status: { $ne: 'ACCEPTED' },
      },
      updateOps,
      { new: true, runValidators: true }
    ).exec();

    if (!doc) return null;
    return this.findById(doc._id.toString());
  }

  async countQuotationMetrics(assignedAgentId?: string): Promise<{
    created: number;
    issued: number;
    accepted: number;
  }> {
    const match: Record<string, unknown> = {};
    if (assignedAgentId) {
      match.assignedAgentId = assignedAgentId;
    }

    const [created, issued, accepted] = await Promise.all([
      QuotationModel.countDocuments(match).exec(),
      QuotationModel.countDocuments({
        ...match,
        status: { $in: ['ISSUED', 'SENT', 'ACCEPTED'] },
      }).exec(),
      QuotationModel.countDocuments({
        ...match,
        status: 'ACCEPTED',
      }).exec(),
    ]);

    return { created, issued, accepted };
  }

  async delete(id: string): Promise<boolean> {
    const result = await QuotationModel.findByIdAndDelete(id).exec();
    return !!result;
  }
}

export const quotationRepository = new QuotationRepository();
