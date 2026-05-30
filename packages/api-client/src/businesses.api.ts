import { http } from './http';

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  areaId: string;
  deliveryType: string;
  imageUrl: string | null;
  logoUrl: string | null;
  phone: string | null;
  addressDetail: string | null;
  openTime: string | null;
  closeTime: string | null;
  rating: number;
  isOpen: boolean;
  commissionRate?: number;
  area?: { city: string; name: string; deliveryFee: number };
  owner?: { id: string; name: string; phone: string; status: string };
  products?: Product[];
}

export interface AdminCreateBusinessDto {
  name: string;
  category: string;
  ownerName: string;
  phone: string;
  areaId: string;
  password: string;
  addressDetail?: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  category: string | null;
}

export interface BusinessListParams {
  category?: string;
  areaId?: string;
  search?: string;
}

export const businessesApi = {
  list: (params?: BusinessListParams) =>
    http.get<Business[]>('/businesses', { params }).then((r) => r.data),

  getById: (id: string) =>
    http.get<Business>(`/businesses/${id}`).then((r) => r.data),

  mine: () =>
    http.get<Business>('/businesses/mine').then((r) => r.data),

  create: (dto: Partial<Business>) =>
    http.post<Business>('/businesses', dto).then((r) => r.data),

  update: (id: string, dto: Partial<Business>) =>
    http.patch<Business>(`/businesses/${id}`, dto).then((r) => r.data),

  adminUpdate: (id: string, dto: Partial<Business>) =>
    http.patch<Business>(`/businesses/${id}/admin`, dto).then((r) => r.data),

  adminUpdateStatus: (id: string, isOpen: boolean) =>
    http.patch<Business>(`/businesses/${id}/status`, { isOpen }).then((r) => r.data),

  adminUpdateCommission: (id: string, commissionRate: number) =>
    http.patch<Business>(`/businesses/${id}/commission`, { commissionRate }).then((r) => r.data),

  adminCreate: (dto: AdminCreateBusinessDto) =>
    http.post<Business>('/businesses/admin', dto).then((r) => r.data),

  adminApprove: (id: string, password: string) =>
    http.patch<Business>(`/businesses/${id}/approve`, { password }).then((r) => r.data),

  adminReject: (id: string) =>
    http.delete<{ rejected: boolean }>(`/businesses/${id}/reject`).then((r) => r.data),

  adminResetPassword: (id: string, password: string) =>
    http.patch<{ reset: boolean }>(`/businesses/${id}/password`, { password }).then((r) => r.data),
};
