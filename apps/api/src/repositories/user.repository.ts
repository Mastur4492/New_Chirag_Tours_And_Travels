import { UserStatus } from '@chirag/types';
import { IUserDocument, UserModel } from '../models/user.model';

export class UserRepository {
  async findByMobile(mobile: string, includeSecrets = false): Promise<IUserDocument | null> {
    const query = UserModel.findOne({ mobile });
    if (includeSecrets) {
      query.select('+passwordHash +refreshTokenHash');
    }
    return query.exec();
  }

  async findById(id: string, includeSecrets = false): Promise<IUserDocument | null> {
    const query = UserModel.findById(id);
    if (includeSecrets) {
      query.select('+passwordHash +refreshTokenHash');
    }
    return query.exec();
  }

  async findByEmail(email: string): Promise<IUserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async create(data: Partial<IUserDocument>): Promise<IUserDocument> {
    const user = new UserModel(data);
    return user.save();
  }

  async updateRefreshTokenHash(id: string, refreshTokenHash: string | null): Promise<void> {
    await UserModel.findByIdAndUpdate(id, { refreshTokenHash }).exec();
  }

  async countAdmins(): Promise<number> {
    return UserModel.countDocuments({ role: 'ADMIN' }).exec();
  }

  async findAgents(options: {
    search?: string;
    status?: UserStatus;
    skip: number;
    limit: number;
  }): Promise<{ users: IUserDocument[]; total: number }> {
    const filter: Record<string, unknown> = { role: 'AGENT' };

    if (options.status) {
      filter.status = options.status;
    }

    if (options.search) {
      const regex = new RegExp(options.search, 'i');
      filter.$or = [{ fullName: regex }, { mobile: regex }, { 'agentProfile.agencyName': regex }];
    }

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(options.skip)
        .limit(options.limit)
        .exec(),
      UserModel.countDocuments(filter).exec(),
    ]);

    return { users, total };
  }

  async update(id: string, updateData: Partial<IUserDocument>): Promise<IUserDocument | null> {
    return UserModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }
}

export const userRepository = new UserRepository();
