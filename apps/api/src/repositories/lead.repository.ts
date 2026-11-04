import { Types } from 'mongoose';
import { LeadStatus } from '@chirag/types';
import { ILeadDocument, LeadModel } from '../models/lead.model';

export interface FindLeadsFilter {
  search?: string;
  status?: LeadStatus;
  destinationId?: string;
  assignedAgentId?: string;
  customerId?: string;
  skip?: number;
  limit?: number;
}

export class LeadRepository {
  async findById(id: string): Promise<ILeadDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return this.findByLeadNumber(id);
    }
    const doc = await LeadModel.findById(id)
      .populate('customerId')
      .populate('destinationId')
      .populate('assignedAgentId', 'fullName email')
      .populate('assignedBy', 'fullName email')
      .exec();
    return doc || this.findByLeadNumber(id);
  }

  async findByLeadNumber(leadNumber: string): Promise<ILeadDocument | null> {
    return LeadModel.findOne({ leadNumber })
      .populate('customerId')
      .populate('destinationId')
      .populate('assignedAgentId', 'fullName email')
      .populate('assignedBy', 'fullName email')
      .exec();
  }

  async findMany(filter: FindLeadsFilter = {}): Promise<{
    leads: ILeadDocument[];
    total: number;
  }> {
    const query: Record<string, unknown> = {};

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.destinationId) {
      query.destinationId = filter.destinationId;
    }

    if (filter.assignedAgentId) {
      query.assignedAgentId = filter.assignedAgentId;
    }

    if (filter.customerId) {
      query.customerId = filter.customerId;
    }

    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ leadNumber: regex }, { specialRequirements: regex }];
    }

    const skip = filter.skip || 0;
    const limit = filter.limit || 50;

    const [leads, total] = await Promise.all([
      LeadModel.find(query)
        .populate('customerId')
        .populate('destinationId')
        .populate('assignedAgentId', 'fullName email')
        .populate('assignedBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      LeadModel.countDocuments(query).exec(),
    ]);

    return { leads, total };
  }

  async create(data: Partial<ILeadDocument>): Promise<ILeadDocument> {
    const lead = new LeadModel(data);
    await lead.save();
    return this.findById(lead._id.toString()) as Promise<ILeadDocument>;
  }

  async update(id: string, data: Partial<ILeadDocument>): Promise<ILeadDocument | null> {
    const filter = Types.ObjectId.isValid(id) ? { _id: id } : { leadNumber: id };
    const updated = await LeadModel.findOneAndUpdate(filter, { $set: data }, { new: true, runValidators: true }).exec();
    return updated ? this.findById(updated._id.toString()) : null;
  }

  async addTimelineEvent(
    id: string,
    event: {
      type: string;
      title: string;
      content?: string;
      actorId?: string;
      actorName?: string;
      createdAt?: Date;
    }
  ): Promise<ILeadDocument | null> {
    const filter = Types.ObjectId.isValid(id) ? { _id: id } : { leadNumber: id };
    const updated = await LeadModel.findOneAndUpdate(
      filter,
      {
        $push: {
          timeline: {
            ...event,
            createdAt: event.createdAt || new Date(),
          },
        },
      },
      { new: true }
    ).exec();
    return updated ? this.findById(updated._id.toString()) : null;
  }

  async countByStatus(assignedAgentId?: string): Promise<Record<LeadStatus, number>> {
    const match: Record<string, unknown> = {};
    if (assignedAgentId) {
      match.assignedAgentId = Types.ObjectId.isValid(assignedAgentId)
        ? new Types.ObjectId(assignedAgentId)
        : assignedAgentId;
    }

    const counts = await LeadModel.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).exec();

    const result: Record<LeadStatus, number> = {
      NEW: 0,
      ASSIGNED: 0,
      CONTACTED: 0,
      QUOTED: 0,
      NEGOTIATING: 0,
      CONVERTED: 0,
      LOST: 0,
      JUNK: 0,
    };

    counts.forEach((c: { _id: LeadStatus; count: number }) => {
      if (result[c._id] !== undefined) {
        result[c._id] = c.count;
      }
    });

    return result;
  }

  async countFollowUps(assignedAgentId?: string): Promise<{
    due: number;
    overdue: number;
  }> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const baseMatch: Record<string, unknown> = {
      status: { $nin: ['CONVERTED', 'LOST', 'JUNK'] },
      nextFollowUpDate: { $ne: null },
    };
    if (assignedAgentId) {
      baseMatch.assignedAgentId = assignedAgentId;
    }

    const [due, overdue] = await Promise.all([
      LeadModel.countDocuments({
        ...baseMatch,
        nextFollowUpDate: { $gte: startOfToday, $lte: endOfToday },
      }).exec(),
      LeadModel.countDocuments({
        ...baseMatch,
        nextFollowUpDate: { $lt: startOfToday },
      }).exec(),
    ]);

    return { due, overdue };
  }

  async delete(id: string): Promise<boolean> {
    const result = await LeadModel.findByIdAndDelete(id).exec();
    return !!result;
  }
}

export const leadRepository = new LeadRepository();
