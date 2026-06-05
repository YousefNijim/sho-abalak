import { http } from './http';

export interface Driver {
  id: string;
  userId: string;
  status: string;
  areaId: string;
  rating: number;
  vehicleType?: string;
  platformBalance?: number;
  user?: { id: string; name: string; phone: string; imageUrl?: string };
  area?: { id: string; city: string; name: string; deliveryFee: number; driverDeliveryFee: number };
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

  updateProfile: (dto: { areaId?: string; vehicleType?: string }) =>
    http.patch<Driver>('/drivers/me/profile', dto).then((r) => r.data),

  settleAccount: (id: string) =>
    http.post<Driver>(`/drivers/${id}/settle`).then((r) => r.data),
};
