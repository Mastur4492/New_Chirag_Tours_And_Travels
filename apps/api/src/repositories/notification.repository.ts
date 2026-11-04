import { Types } from 'mongoose';
import { INotificationDocument, NotificationModel } from '../models/notification.model';

export interface FindNotificationsOptions {
  limit?: number;
  skip?: number;
  unreadOnly?: boolean;
}

export class NotificationRepository {
  async create(data: Partial<INotificationDocument>): Promise<INotificationDocument> {
    const doc = new NotificationModel(data);
    return doc.save();
  }

  async findById(id: string): Promise<INotificationDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return NotificationModel.findById(id).exec();
  }

  async findForUser(
    userId: string,
    role: 'ADMIN' | 'AGENT',
    options: FindNotificationsOptions = {}
  ): Promise<{ notifications: INotificationDocument[]; total: number; unreadCount: number }> {
    const userObjId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;
    const limit = Math.min(options.limit || 30, 100);
    const skip = options.skip || 0;

    // A notification belongs to the user if:
    // 1. It directly targets recipientUserId: userId
    // 2. OR it targets their recipientRole (e.g. 'ADMIN' or 'AGENT') and recipientUserId is null/undefined
    const baseQuery: any = {
      $or: [
        { recipientUserId: userObjId },
        { recipientRole: role, recipientUserId: { $exists: false } },
        { recipientRole: role, recipientUserId: null },
      ],
    };

    if (options.unreadOnly) {
      baseQuery.$and = [
        { isRead: false },
        { 'readBy.userId': { $ne: userObjId } },
      ];
    }

    const [notifications, total, unreadCount] = await Promise.all([
      NotificationModel.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      NotificationModel.countDocuments(baseQuery).exec(),
      NotificationModel.countDocuments({
        $or: [
          { recipientUserId: userObjId, isRead: false },
          {
            recipientRole: role,
            recipientUserId: { $in: [null, undefined] },
            isRead: false,
            'readBy.userId': { $ne: userObjId },
          },
        ],
      }).exec(),
    ]);

    return { notifications, total, unreadCount };
  }

  async getUnreadCount(userId: string, role: 'ADMIN' | 'AGENT'): Promise<number> {
    const userObjId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;

    return NotificationModel.countDocuments({
      $or: [
        { recipientUserId: userObjId, isRead: false },
        {
          recipientRole: role,
          recipientUserId: { $in: [null, undefined] },
          isRead: false,
          'readBy.userId': { $ne: userObjId },
        },
      ],
    }).exec();
  }

  async markAsRead(id: string, userId: string): Promise<INotificationDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const userObjId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;

    const notif = await NotificationModel.findById(id).exec();
    if (!notif) return null;

    // If targeted directly to this user, mark isRead = true
    if (notif.recipientUserId && notif.recipientUserId.toString() === userId) {
      notif.isRead = true;
      notif.readAt = new Date();
      return notif.save();
    }

    // If role broadcast, register in readBy array
    if (!notif.readBy) {
      notif.readBy = [];
    }
    const already = notif.readBy.some((r) => r.userId?.toString() === userId);
    if (!already && userObjId) {
      notif.readBy.push({ userId: userObjId, readAt: new Date() });
    }
    return notif.save();
  }

  async markAllAsRead(userId: string, role: 'ADMIN' | 'AGENT'): Promise<void> {
    const userObjId = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;
    const now = new Date();

    // 1. Mark all targeted notifications as read
    await NotificationModel.updateMany(
      { recipientUserId: userObjId, isRead: false },
      { $set: { isRead: true, readAt: now } }
    ).exec();

    // 2. For role broadcast notifications, add user to readBy
    if (userObjId) {
      await NotificationModel.updateMany(
        {
          recipientRole: role,
          recipientUserId: { $in: [null, undefined] },
          'readBy.userId': { $ne: userObjId },
        },
        {
          $push: {
            readBy: { userId: userObjId, readAt: now },
          },
        }
      ).exec();
    }
  }
}

export const notificationRepository = new NotificationRepository();
