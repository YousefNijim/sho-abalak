import { http } from './http';

export interface FinanceSummary {
  summary: {
    totalSales: number;
    commission: number;
    deliveryFees: number;
    netRevenue: number;
    ordersCount: number;
    deliveredCount: number;
    cancelledCount: number;
  };
  orders: {
    id: string;
    businessName: string;
    customerName: string;
    total: number;
    commission: number;
    deliveryFee: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
  }[];
}

export const reportsApi = {
  getFinanceSummary: (params: { period: string; startDate?: string; endDate?: string }) =>
    http.get<FinanceSummary>('/reports/finance', { params }).then((r) => r.data),
};
