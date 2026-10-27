import { CustomerModel, ICustomerDocument } from '../models/customer.model';

export interface FindCustomersFilter {
  search?: string;
  assignedAgentId?: string;
  skip?: number;
  limit?: number;
}

export class CustomerRepository {
  async findById(id: string): Promise<ICustomerDocument | null> {
    return CustomerModel.findById(id).exec();
  }

  async findByMobile(mobile: string): Promise<ICustomerDocument | null> {
    return CustomerModel.findOne({ mobile }).exec();
  }

  async findByEmail(email: string): Promise<ICustomerDocument | null> {
    return CustomerModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findMany(filter: FindCustomersFilter = {}): Promise<{
    customers: ICustomerDocument[];
    total: number;
  }> {
    const query: Record<string, unknown> = {};

    if (filter.assignedAgentId) {
      query.assignedAgentId = filter.assignedAgentId;
    }

    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [{ fullName: regex }, { mobile: regex }, { email: regex }, { city: regex }];
    }

    const skip = filter.skip || 0;
    const limit = filter.limit || 50;

    const [customers, total] = await Promise.all([
      CustomerModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      CustomerModel.countDocuments(query).exec(),
    ]);

    return { customers, total };
  }

  async create(data: Partial<ICustomerDocument>): Promise<ICustomerDocument> {
    const customer = new CustomerModel(data);
    return customer.save();
  }

  async update(id: string, data: Partial<ICustomerDocument>): Promise<ICustomerDocument | null> {
    return CustomerModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await CustomerModel.findByIdAndDelete(id).exec();
    return !!result;
  }
}

export const customerRepository = new CustomerRepository();
