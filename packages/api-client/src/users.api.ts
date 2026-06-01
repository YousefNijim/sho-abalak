import { http } from './http';

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  status: string;
  areaId: string | null;
  createdAt: string;
  area?: { city: string; name: string };
  business?: { id: string; name: string } | null;
}

export interface UserListParams {
  role?: string;
  status?: string;
  search?: string;
}

export const usersApi = {
  list: (params?: UserListParams) =>
    http.get<AdminUser[]>('/users', { params }).then((r) => r.data),

  getById: (id: string) =>
    http.get<AdminUser>(`/users/${id}`).then((r) => r.data),

  updateStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED' | 'BANNED') =>
    http.patch<AdminUser>(`/users/${id}/status`, { status }).then((r) => r.data),
};
