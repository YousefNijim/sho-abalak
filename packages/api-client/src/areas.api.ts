import { http } from './http';

export interface Area {
  id: string;
  city: string;
  name: string;
  deliveryFee: number;
}

export const areasApi = {
  list: () => http.get<Area[]>('/areas').then((r) => r.data),
};
