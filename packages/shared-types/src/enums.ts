/** الأدوار في المنصة */
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  BUSINESS = 'BUSINESS',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
}

/** حالة حساب المستخدم (يديرها الأدمن) */
export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

/**
 * حالات الطلب
 * PENDING → CONFIRMED → PREPARING → READY → PICKED_UP → DELIVERED
 *         ↘ ESCALATED → PREPARING (موافقة الأدمن)
 *                     → CANCELLED (رفض الأدمن)
 *                                  ↘ CANCELLED
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  ESCALATED = 'ESCALATED',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  PICKED_UP = 'PICKED_UP',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  ELECTRONIC = 'ELECTRONIC',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum DriverStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
}

// القسم الأعلى للمنشأة: مأكولات (FOOD) أو متاجر (STORE)
export enum BusinessType {
  FOOD = 'FOOD',
  STORE = 'STORE',
}

export enum DeliveryType {
  PLATFORM = 'PLATFORM',
  SELF = 'SELF',
}
