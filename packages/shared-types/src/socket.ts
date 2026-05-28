import { DriverStatus, OrderStatus } from './enums';
import { Order } from './models';

/** أحداث Socket.io — راجع PROJECT_HANDOFF.md */
export const SocketEvents = {
  ORDER_NEW: 'order:new',
  ORDER_STATUS_UPDATE: 'order:status_update',
  DRIVER_REQUEST: 'driver:request',
  DRIVER_STATUS_CHANGE: 'driver:status_change',
  NOTIFICATION_PUSH: 'notification:push',
} as const;

export interface OrderNewPayload {
  order: Order;
}

export interface OrderStatusUpdatePayload {
  orderId: string;
  status: OrderStatus;
}

export interface DriverRequestPayload {
  orderId: string;
  businessName: string;
  areaName: string;
  total: number;
}

export interface DriverStatusChangePayload {
  driverId: string;
  status: DriverStatus;
}

export interface NotificationPushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}
