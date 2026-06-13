import { http } from './http';

export interface OrderItem {
  productId: string;
  quantity: number;
  variantId?: string;
}

export interface CreateOrderDto {
  businessId: string;
  areaId?: string;
  paymentMethod: 'CASH' | 'ELECTRONIC';
  items: OrderItem[];
  note?: string;
  deliveryAreaName?: string;
  deliveryAddressDetail?: string;
  couponCode?: string;
}

export interface UpdateOrderStatusDto {
  status: string;
  driverId?: string;
}

export interface AdminInterventionDto {
  status?: string;
  driverId?: string | null;
  paymentStatus?: string;
  needsCustomerContact?: boolean;
  deliveryFee?: number;
}

export interface Order {
  id: string;
  customerId: string;
  businessId: string;
  driverId: string | null;
  batchId: string | null;
  status: string;
  paymentMethod: string;
  subtotal: number;
  couponDiscount: number;
  deliveryFee: number;
  driverDeliveryFee: number;
  platformDeliveryFee: number;
  total: number;
  couponCode: string | null;
  note: string | null;
  deliveryAreaName: string | null;
  deliveryAddressDetail: string | null;
  needsCustomerContact: boolean;
  requiredVehicleType: string | null;
  createdAt: string;
  items?: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    product?: { name: string; description: string | null };
  }[];
  business?: { name: string; area?: { id: string; city: string; name: string; deliveryFee: number }; owner?: { phone: string; name: string } };
  customer?: { name: string; phone: string; area?: { id: string; city: string; name: string; deliveryFee: number } };
  driver?: {
    id: string;
    rating: number;
    user?: { name: string; phone: string };
    area?: { name: string };
  };
  payment?: { status: string; method: string; amount: number };
  statusHistory?: { status: string; changedBy?: string; createdAt: string }[];
  review?: { id: string; businessRating: number; deliveryRating: number | null; comment: string | null } | null;
  driverReview?: { id: string; rating: number } | null;
}

export const ordersApi = {
  create: (dto: CreateOrderDto) =>
    http.post<Order>('/orders', dto).then((r) => r.data),

  list: (params?: { status?: string; limit?: number; businessType?: 'FOOD' | 'STORE' }) =>
    http.get<Order[]>('/orders', { params }).then((r) => r.data),

  getById: (id: string) =>
    http.get<Order>(`/orders/${id}`).then((r) => r.data),

  updateStatus: (id: string, dto: UpdateOrderStatusDto) =>
    http.patch<Order>(`/orders/${id}/status`, dto).then((r) => r.data),

  /** Send a batch of READY orders to a driver. Pass one or more orderIds. */
  sendDriverRequest: (orderIds: string[], driverId: string, vehicleType?: string) =>
    http.post<{ message: string; batchId: string }>('/orders/send-driver-request', { orderIds, driverId, vehicleType }).then((r) => r.data),

  requestCustomerContact: (orderIds: string[], vehicleType?: string) =>
    http.post<{ message: string }>('/orders/request-contact', { orderIds, vehicleType }).then((r) => r.data),

  acceptDriver: (id: string) =>
    http.post<Order[]>(`/orders/${id}/accept-driver`).then((r) => r.data),

  rejectDriver: (id: string) =>
    http.patch<Order>(`/orders/${id}/reject-driver`).then((r) => r.data),

  adminIntervention: (id: string, dto: AdminInterventionDto) =>
    http.patch<Order>(`/orders/${id}/admin-intervention`, dto).then((r) => r.data),

  /** STORE business: escalate a PENDING order that needs a larger vehicle */
  escalateOrder: (id: string, dto?: { reason?: string }) =>
    http.patch<Order>(`/orders/${id}/escalate`, dto ?? {}).then((r) => r.data),

  /** Admin: resolve an ESCALATED order (approve with new fee or reject) */
  resolveEscalation: (
    id: string,
    dto: {
      action: 'APPROVE' | 'REJECT';
      newDeliveryFee?: number;
      deliveryOwner?: 'PLATFORM' | 'STORE';
      newDriverFee?: number;
      newPlatformFee?: number;
    },
  ) => http.patch<Order>(`/orders/${id}/resolve-escalation`, dto).then((r) => r.data),

  /** STORE business: self-deliver a READY order (READY → PICKED_UP, deliveryMode=SELF) */
  selfDeliver: (id: string) =>
    http.patch<Order>(`/orders/${id}/self-deliver`).then((r) => r.data),
};

