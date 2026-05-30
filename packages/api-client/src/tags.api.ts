import { http } from './http';
import type { Tag, BusinessType } from './businesses.api';

export const tagsApi = {
  list: (type?: BusinessType) =>
    http.get<Tag[]>('/tags', { params: type ? { type } : undefined }).then((r) => r.data),
};
