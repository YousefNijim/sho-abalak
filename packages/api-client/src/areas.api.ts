import { http } from './http';

export interface Area {
  id: string;
  city: string;
  name: string;
  deliveryFee: number;
  driverDeliveryFee?: number;
}

export const areasApi = {
  list: () => http.get<Area[]>('/areas').then((r) => r.data),
  create: (dto: { city: string; name: string; deliveryFee: number; driverDeliveryFee?: number }) =>
    http.post<Area>('/areas', dto).then((r) => r.data),
  update: (id: string, dto: { city?: string; name?: string; deliveryFee?: number; driverDeliveryFee?: number }) =>
    http.patch<Area>(`/areas/${id}`, dto).then((r) => r.data),
  delete: (id: string) =>
    http.delete<{ message: string }>(`/areas/${id}`).then((r) => r.data),
};
