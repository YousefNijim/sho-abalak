import { http } from './http';

export interface OfferProduct {
  id: string;
  productId: string | null;
  categoryName: string | null;
  discountPct: number;
  product?: { id: string; name: string; price: number; imageUrl: string | null; category: string | null } | null;
}

export interface OfferBusiness {
  id: string;
  businessId: string;
  business: { id: string; name: string; imageUrl: string | null; rating: number; area?: { city: string; name: string } };
}

export interface Offer {
  id: string;
  title: string;
  description: string | null;
  rules: string | null;
  imageUrl: string | null;
  isActive: boolean;
  type: 'INDIVIDUAL' | 'SHARED';
  createdAt: string;
  offerBusinesses: OfferBusiness[];
  offerProducts: OfferProduct[];
}

export interface CreateOfferDto {
  title: string;
  description?: string;
  rules?: string;
  imageUrl?: string;
  type: 'INDIVIDUAL' | 'SHARED';
  businessIds: string[];
  offerProducts?: { productId?: string; categoryName?: string; discountPct: number }[];
}

export const offersApi = {
  list: (activeOnly = true) =>
    http.get<Offer[]>('/offers', { params: { activeOnly } }).then((r) => r.data),

  getById: (id: string) =>
    http.get<Offer>(`/offers/${id}`).then((r) => r.data),

  forBusiness: (businessId: string) =>
    http.get<Offer[]>(`/offers/business/${businessId}`).then((r) => r.data),

  create: (dto: CreateOfferDto) =>
    http.post<Offer>('/offers', dto).then((r) => r.data),

  update: (id: string, dto: Partial<CreateOfferDto> & { isActive?: boolean }) =>
    http.patch<Offer>(`/offers/${id}`, dto).then((r) => r.data),

  delete: (id: string) =>
    http.delete<{ message: string }>(`/offers/${id}`).then((r) => r.data),
};
