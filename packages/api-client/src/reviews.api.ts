import { http } from './http';

export interface CreateReviewDto {
  orderId: string;
  businessRating: number;
  deliveryRating?: number;
  comment?: string;
}

export interface CreateDriverReviewDto {
  orderId: string;
  rating: number;
}

export interface Review {
  id: string;
  orderId: string;
  businessRating: number;
  deliveryRating: number | null;
  comment: string | null;
  createdAt: string;
  order?: {
    id: string;
    customer?: { id: string; name: string; phone: string };
    business?: { id: string; name: string };
    driver?: { id: string; user?: { id: string; name: string } } | null;
  };
}

export interface DriverReview {
  id: string;
  orderId: string;
  driverId: string;
  businessId: string;
  rating: number;
  createdAt: string;
  order?: { id: string; business?: { id: string; name: string } };
  driver?: { id: string; user?: { id: string; name: string } };
}

export const reviewsApi = {
  create: (dto: CreateReviewDto) =>
    http.post<Review>('/reviews', dto).then((r) => r.data),

  createDriverReview: (dto: CreateDriverReviewDto) =>
    http.post<DriverReview>('/reviews/driver', dto).then((r) => r.data),

  list: () =>
    http.get<Review[]>('/reviews').then((r) => r.data),

  listDriverReviews: () =>
    http.get<DriverReview[]>('/reviews/driver-reviews').then((r) => r.data),

  byBusiness: (businessId: string) =>
    http.get<Review[]>('/reviews/business', { params: { businessId } }).then((r) => r.data),

  byDriver: (driverId: string) =>
    http.get<DriverReview[]>('/reviews/driver', { params: { driverId } }).then((r) => r.data),

  delete: (id: string) =>
    http.delete<{ message: string }>(`/reviews/${id}`).then((r) => r.data),

  deleteDriverReview: (id: string) =>
    http.delete<{ message: string }>(`/reviews/driver-reviews/${id}`).then((r) => r.data),
};
