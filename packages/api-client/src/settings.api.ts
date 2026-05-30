import { http } from './http';

export interface SystemSettings {
  id: string;
  defaultCommission: number;
  baseDeliveryFee: number;
  customerAppActive: boolean;
  businessAppActive: boolean;
  driverAppActive: boolean;
  updatedAt: string;
}

export const settingsApi = {
  get: () =>
    http.get<SystemSettings>('/settings').then((r) => r.data),

  update: (dto: Partial<SystemSettings>) =>
    http.patch<SystemSettings>('/settings', dto).then((r) => r.data),
};
