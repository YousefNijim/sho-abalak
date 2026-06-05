import { http } from './http';

export interface Coupon {
  id: string;
  code: string;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountAmount: number;
  discountPct: number | null;
  maxDiscount: number | null;
  minimumOrder: number;
  issuedBy: 'PLATFORM' | 'BUSINESS';
  isActive: boolean;
  maxUses: number | null;
  currentUses: number;
  maxTotalDiscount: number | null;
  currentTotalDiscount: number;
  createdAt: string;
}

export interface CouponApplyResult {
  code: string;
  discountAmount: number;
  discountType: 'FIXED' | 'PERCENTAGE';
  discountPct: number | null;
  maxDiscount: number | null;
  minimumOrder: number;
  issuedBy: 'PLATFORM' | 'BUSINESS';
}

export const couponsApi = {
  active: () =>
    http.get<Coupon[]>('/coupons/active').then((r) => r.data),

  apply: (code: string, cartSubtotal: number) =>
    http.post<CouponApplyResult>('/coupons/apply', { code, cartSubtotal }).then((r) => r.data),

  list: () =>
    http.get<Coupon[]>('/coupons').then((r) => r.data),

  create: (dto: { code: string; discountType: 'FIXED' | 'PERCENTAGE'; discountAmount?: number; discountPct?: number; maxDiscount?: number; minimumOrder: number; issuedBy: 'PLATFORM' | 'BUSINESS'; maxUses?: number; maxTotalDiscount?: number }) =>
    http.post<Coupon>('/coupons', dto).then((r) => r.data),

  update: (id: string, dto: { discountAmount?: number; discountPct?: number; maxDiscount?: number; minimumOrder?: number; isActive?: boolean; maxUses?: number; maxTotalDiscount?: number }) =>
    http.patch<Coupon>(`/coupons/${id}`, dto).then((r) => r.data),

  delete: (id: string) =>
    http.delete<{ message: string }>(`/coupons/${id}`).then((r) => r.data),
};
