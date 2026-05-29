/** الأدوار في المنصة */
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  BUSINESS = 'BUSINESS',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
}

/** حالة حساب المستخدم (يديرها الأدمن) */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

/**
 * حالات الطلب
 * PENDING → CONFIRMED → PREPARING → READY → PICKED_UP → DELIVERED
 *                                            ↘ CANCELLED
 */
export enum OrderStatus {
  PENDING = 'PENDING',
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

export enum BusinessCategory {
  RESTAURANT = 'RESTAURANT',
  STORE = 'STORE',
  CAFE = 'CAFE',
}

export enum DeliveryType {
  PLATFORM = 'PLATFORM',
  SELF = 'SELF',
}
