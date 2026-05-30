import { http } from './http';

export interface Driver {
  id: string;
  userId: string;
  status: string;
  areaId: string;
  rating: number;
  user?: { name: string; phone: string };
  area?: { city: string; name: string };
}

export interface UpdateDriverStatusDto {
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  areaId?: string;
}

export const driversApi = {
  register: (areaId: string) =>
    http.post<Driver>('/drivers/register', { areaId }).then((r) => r.data),

  me: () =>
    http.get<Driver>('/drivers/me').then((r) => r.data),

  updateMyStatus: (dto: UpdateDriverStatusDto) =>
    http.patch<Driver>('/drivers/me/status', dto).then((r) => r.data),

  available: (areaId?: string) =>
    http
      .get<Driver[]>('/drivers/available', { params: { areaId } })
      .then((r) => r.data),

  list: () =>
    http.get<Driver[]>('/drivers').then((r) => r.data),

  adminUpdateStatus: (id: string, dto: UpdateDriverStatusDto) =>
    http.patch<Driver>(`/drivers/${id}/status`, dto).then((r) => r.data),
};
