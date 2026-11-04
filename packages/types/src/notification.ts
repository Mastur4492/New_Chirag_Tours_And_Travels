export type NotificationType =
  | 'NEW_CUSTOMER_ENQUIRY'
  | 'LEAD_ASSIGNED'
  | 'LEAD_STATUS_CHANGED'
  | 'BOOKING_CONFIRMED'
  | 'QUOTATION_ACCEPTED'
  | 'GENERAL';

export interface NotificationDto {
  id: string;
  recipientUserId?: string;
  recipientRole?: 'ADMIN' | 'AGENT';
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  entityType?: 'LEAD' | 'BOOKING' | 'QUOTATION';
  entityId?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface ListNotificationsResponse {
  notifications: NotificationDto[];
  unreadCount: number;
  total: number;
}
