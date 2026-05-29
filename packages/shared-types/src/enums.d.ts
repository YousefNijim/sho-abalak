/** الأدوار في المنصة */
export declare enum UserRole {
    CUSTOMER = "CUSTOMER",
    BUSINESS = "BUSINESS",
    DRIVER = "DRIVER",
    ADMIN = "ADMIN"
}
/**
 * حالات الطلب
 * PENDING → CONFIRMED → PREPARING → READY → PICKED_UP → DELIVERED
 *                                            ↘ CANCELLED
 */
export declare enum OrderStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    PREPARING = "PREPARING",
    READY = "READY",
    PICKED_UP = "PICKED_UP",
    DELIVERED = "DELIVERED",
    CANCELLED = "CANCELLED"
}
export declare enum PaymentMethod {
    CASH = "CASH",
    ELECTRONIC = "ELECTRONIC"
}
export declare enum PaymentStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED"
}
export declare enum DriverStatus {
    AVAILABLE = "AVAILABLE",
    BUSY = "BUSY",
    OFFLINE = "OFFLINE"
}
export declare enum BusinessCategory {
    RESTAURANT = "RESTAURANT",
    STORE = "STORE",
    CAFE = "CAFE"
}
export declare enum DeliveryType {
    PLATFORM = "PLATFORM",
    SELF = "SELF"
}
