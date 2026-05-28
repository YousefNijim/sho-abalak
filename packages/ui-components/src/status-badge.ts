import { OrderStatus } from '@shu/shared-types';

/** ألوان وتسميات Status Badge — راجع FRONTEND_DESIGN.md §6 */
export interface StatusBadgeStyle {
  bg: string;
  text: string;
  label: string;
}

export const STATUS_BADGE: Record<OrderStatus, StatusBadgeStyle> = {
  [OrderStatus.PENDING]: { bg: '#FEF9C3', text: '#854D0E', label: 'معلق' },
  [OrderStatus.CONFIRMED]: { bg: '#DBEAFE', text: '#1E40AF', label: 'مؤكد' },
  [OrderStatus.PREPARING]: { bg: '#FFEDD5', text: '#C2410C', label: 'جاري التحضير' },
  [OrderStatus.READY]: { bg: '#EDE9FE', text: '#6D28D9', label: 'جاهز' },
  [OrderStatus.PICKED_UP]: { bg: '#CFFAFE', text: '#0E7490', label: 'في الطريق' },
  [OrderStatus.DELIVERED]: { bg: '#DCFCE7', text: '#166534', label: 'تم التسليم' },
  [OrderStatus.CANCELLED]: { bg: '#FEE2E2', text: '#991B1B', label: 'ملغى' },
};
