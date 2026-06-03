import { http } from './http';

export interface Coupon {
  id: string;
  code: string;
  discountAmount: number;
  minimumOrder: number;
  isActive: boolean;
  usedAt: string | null;
  usedByOrderId: string | null;
  createdAt: string;
}

export interface CouponApplyResult {
  code: string;
  discountAmount: number;
  minimumOrder: number;
}

export const couponsApi = {
  apply: (code: string, cartSubtotal: number) =>
    http.post<CouponApplyResult>('/coupons/apply', { code, cartSubtotal }).then((r) => r.data),

  list: () =>
    http.get<Coupon[]>('/coupons').then((r) => r.data),

  create: (dto: { code: string; discountAmount: number; minimumOrder: number }) =>
    http.post<Coupon>('/coupons', dto).then((r) => r.data),

  update: (id: string, dto: { discountAmount?: number; minimumOrder?: number; isActive?: boolean }) =>
    http.patch<Coupon>(`/coupons/${id}`, dto).then((r) => r.data),

  delete: (id: string) =>
    http.delete<{ message: string }>(`/coupons/${id}`).then((r) => r.data),
};
