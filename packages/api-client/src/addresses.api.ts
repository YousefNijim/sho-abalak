import { http } from './http';

export interface SavedAddress {
  id: string;
  label: string;
  detail: string;
  areaId: string | null;
  area?: { id: string; city: string; name: string } | null;
  createdAt: string;
}

export interface CreateAddressDto {
  label: string;
  detail: string;
  areaId?: string;
}

export interface UpdateAddressDto {
  label?: string;
  detail?: string;
  areaId?: string;
}

export const addressesApi = {
  list: () =>
    http.get<SavedAddress[]>('/addresses/me').then((r) => r.data),

  create: (dto: CreateAddressDto) =>
    http.post<SavedAddress>('/addresses', dto).then((r) => r.data),

  update: (id: string, dto: UpdateAddressDto) =>
    http.patch<SavedAddress>(`/addresses/${id}`, dto).then((r) => r.data),

  remove: (id: string) =>
    http.delete<{ message: string }>(`/addresses/${id}`).then((r) => r.data),
};
