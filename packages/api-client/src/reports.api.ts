import { http } from './http';

export interface FinanceSummary {
  summary: {
    totalSubtotal: number;
    totalCouponDiscount: number;
    totalDeliveryFees: number;
    totalFinal: number;
    totalCommission: number;
    platformEarnings: number;
    ordersCount: number;
    deliveredCount: number;
    cancelledCount: number;
  };
  orders: {
    id: string;
    businessName: string;
    businessType: string;
    businessCity: string;
    businessArea: string;
    businessTags: string;
    customerName: string;
    customerPhone: string;
    driverName: string;
    subtotal: number;
    couponDiscount: number;
    couponCode: string | null;
    couponIssuedBy: string | null;
    deliveryFee: number;
    total: number;
    commission: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
  }[];
}

export const reportsApi = {
  getFinanceSummary: (
    period?: string,
    startDate?: string,
    endDate?: string,
    extra?: Record<string, string>,
  ) =>
    http.get<FinanceSummary>('/reports/finance', { params: { period, startDate, endDate, ...extra } }).then((r) => r.data),
};
