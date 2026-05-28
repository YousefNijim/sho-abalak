import { OrderStatus } from '@shu/shared-types';

/** الانتقالات المسموح بها بين حالات الطلب */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
  [OrderStatus.PICKED_UP]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** التسمية العربية لحالة الطلب */
export const ORDER_STATUS_LABEL_AR: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'معلق',
  [OrderStatus.CONFIRMED]: 'مؤكد',
  [OrderStatus.PREPARING]: 'جاري التحضير',
  [OrderStatus.READY]: 'جاهز',
  [OrderStatus.PICKED_UP]: 'في الطريق',
  [OrderStatus.DELIVERED]: 'تم التسليم',
  [OrderStatus.CANCELLED]: 'ملغى',
};
