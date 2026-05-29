import { http } from './http';

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface CreateOrderDto {
  businessId: string;
  areaId: string;
  paymentMethod: 'CASH' | 'ELECTRONIC';
  items: OrderItem[];
  note?: string;
}

export interface UpdateOrderStatusDto {
  status: string;
  driverId?: string;
}

export interface Order {
  id: string;
  customerId: string;
  businessId: string;
  driverId: string | null;
  status: string;
  paymentMethod: string;
  total: number;
  note: string | null;
  createdAt: string;
  items?: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    product?: { name: string; description: string | null };
  }[];
  business?: { name: string; area?: { city: string; name: string }; owner?: { phone: string; name: string } };
  customer?: { name: string; phone: string; area?: { city: string; name: string } };
  driver?: {
    id: string;
    user?: { name: string; phone: string };
    area?: { name: string };
  };
  payment?: { status: string; method: string; amount: number };
  statusHistory?: { status: string; createdAt: string }[];
}

export const ordersApi = {
  create: (dto: CreateOrderDto) =>
    http.post<Order>('/orders', dto).then((r) => r.data),

  list: (params?: { status?: string; limit?: number }) =>
    http.get<Order[]>('/orders', { params }).then((r) => r.data),

  getById: (id: string) =>
    http.get<Order>(`/orders/${id}`).then((r) => r.data),

  updateStatus: (id: string, dto: UpdateOrderStatusDto) =>
    http.patch<Order>(`/orders/${id}/status`, dto).then((r) => r.data),

  rejectDriver: (id: string) =>
    http.patch<Order>(`/orders/${id}/reject-driver`).then((r) => r.data),
};
