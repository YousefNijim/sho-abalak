import { http } from './http';
import type { Business } from './businesses.api';

export interface PromotedBusiness {
  id: string;
  businessId: string;
  areaId: string | null;
  isPopup: boolean;
  isActive: boolean;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  business: Business;
  area: { id: string; city: string; name: string } | null;
}

export interface CreatePromotedBusinessDto {
  businessId: string;
  areaId?: string;
  isPopup?: boolean;
  isActive?: boolean;
  priority?: number;
  startsAt?: string;
  endsAt?: string;
}

export const promotedBusinessesApi = {
  /** Public — active promoted businesses, optionally filtered by areaId */
  list: (areaId?: string) =>
    http
      .get<PromotedBusiness[]>('/promoted-businesses', {
        params: areaId ? { areaId } : undefined,
      })
      .then((r) => r.data),

  /** Admin — all promoted businesses */
  listAdmin: () =>
    http
      .get<PromotedBusiness[]>('/promoted-businesses', { params: { admin: true } })
      .then((r) => r.data),

  create: (data: CreatePromotedBusinessDto) =>
    http.post<PromotedBusiness>('/promoted-businesses', data).then((r) => r.data),

  update: (id: string, data: Partial<CreatePromotedBusinessDto>) =>
    http.patch<PromotedBusiness>(`/promoted-businesses/${id}`, data).then((r) => r.data),

  remove: (id: string) => http.delete(`/promoted-businesses/${id}`).then((r) => r.data),
};
