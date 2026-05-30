import { http } from './http';

export interface CreateReviewDto {
  orderId: string;
  businessRating: number;
  driverRating?: number;
  comment?: string;
}

export interface Review {
  id: string;
  orderId: string;
  businessRating: number;
  driverRating: number | null;
  comment: string | null;
  createdAt: string;
  order?: {
    id: string;
    customer: {
      id: string;
      name: string;
      phone: string;
    };
    business: {
      id: string;
      name: string;
    };
    driver?: {
      id: string;
      user: {
        id: string;
        name: string;
      };
    } | null;
  };
}

export const reviewsApi = {
  create: (dto: CreateReviewDto) =>
    http.post<Review>('/reviews', dto).then((r) => r.data),

  list: () =>
    http.get<Review[]>('/reviews').then((r) => r.data),

  byBusiness: (businessId: string) =>
    http
      .get<Review[]>('/reviews/business', { params: { businessId } })
      .then((r) => r.data),

  byDriver: (driverId: string) =>
    http
      .get<Review[]>('/reviews/driver', { params: { driverId } })
      .then((r) => r.data),

  delete: (id: string) =>
    http.delete<{ message: string }>(`/reviews/${id}`).then((r) => r.data),
};
