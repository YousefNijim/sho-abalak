import { http } from './http';

export interface PopupAd {
  id: string;
  imageUrl: string;
  title: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  targetPage: string;
  isActive: boolean;
  intervalHours: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePopupAdDto {
  imageUrl: string;
  title?: string;
  buttonText?: string;
  buttonUrl?: string;
  targetPage?: string;
  isActive?: boolean;
  intervalHours?: number;
  startsAt?: string;
  endsAt?: string;
}

export const popupAdsApi = {
  /** Public — active ads for a page */
  list: (page?: string) =>
    http.get<PopupAd[]>('/popup-ads', { params: page ? { page } : undefined }).then((r) => r.data),

  /** Admin — all ads */
  listAdmin: () =>
    http.get<PopupAd[]>('/popup-ads', { params: { admin: true } }).then((r) => r.data),

  create: (data: CreatePopupAdDto) =>
    http.post<PopupAd>('/popup-ads', data).then((r) => r.data),

  update: (id: string, data: Partial<CreatePopupAdDto>) =>
    http.patch<PopupAd>(`/popup-ads/${id}`, data).then((r) => r.data),

  remove: (id: string) => http.delete(`/popup-ads/${id}`).then((r) => r.data),
};
