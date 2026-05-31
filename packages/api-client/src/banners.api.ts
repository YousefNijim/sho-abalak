import { http } from './http';

export interface Banner {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export const bannersApi = {
  list: (activeOnly?: boolean) =>
    http.get<Banner[]>('/banners', { params: activeOnly ? { activeOnly: true } : undefined }).then((r) => r.data),
  create: (data: { imageUrl: string; linkUrl?: string; isActive?: boolean }) =>
    http.post<Banner>('/banners', data).then((r) => r.data),
  update: (id: string, data: { imageUrl?: string; linkUrl?: string; isActive?: boolean }) =>
    http.patch<Banner>(`/banners/${id}`, data).then((r) => r.data),
  remove: (id: string) => http.delete(`/banners/${id}`).then((r) => r.data),
};
