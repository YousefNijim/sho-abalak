import { http } from './http';
import type { Tag, BusinessType } from './businesses.api';

export const tagsApi = {
  list: (type?: BusinessType) =>
    http.get<Tag[]>('/tags', { params: type ? { type } : undefined }).then((r) => r.data),
  create: (data: { name: string; type: BusinessType; imageUrl?: string }) =>
    http.post<Tag>('/tags', data).then((r) => r.data),
  update: (id: string, data: { name?: string; type?: BusinessType; imageUrl?: string }) =>
    http.patch<Tag>(`/tags/${id}`, data).then((r) => r.data),
  remove: (id: string) => http.delete(`/tags/${id}`).then((r) => r.data),
};
