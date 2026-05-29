"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryType = exports.BusinessCategory = exports.DriverStatus = exports.PaymentStatus = exports.PaymentMethod = exports.OrderStatus = exports.UserRole = void 0;
/** الأدوار في المنصة */
var UserRole;
(function (UserRole) {
    UserRole["CUSTOMER"] = "CUSTOMER";
    UserRole["BUSINESS"] = "BUSINESS";
    UserRole["DRIVER"] = "DRIVER";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
/**
 * حالات الطلب
 * PENDING → CONFIRMED → PREPARING → READY → PICKED_UP → DELIVERED
 *                                            ↘ CANCELLED
 */
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["CONFIRMED"] = "CONFIRMED";
    OrderStatus["PREPARING"] = "PREPARING";
    OrderStatus["READY"] = "READY";
    OrderStatus["PICKED_UP"] = "PICKED_UP";
    OrderStatus["DELIVERED"] = "DELIVERED";
    OrderStatus["CANCELLED"] = "CANCELLED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["ELECTRONIC"] = "ELECTRONIC";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PAID"] = "PAID";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var DriverStatus;
(function (DriverStatus) {
    DriverStatus["AVAILABLE"] = "AVAILABLE";
    DriverStatus["BUSY"] = "BUSY";
    DriverStatus["OFFLINE"] = "OFFLINE";
})(DriverStatus || (exports.DriverStatus = DriverStatus = {}));
var BusinessCategory;
(function (BusinessCategory) {
    BusinessCategory["RESTAURANT"] = "RESTAURANT";
    BusinessCategory["STORE"] = "STORE";
    BusinessCategory["CAFE"] = "CAFE";
})(BusinessCategory || (exports.BusinessCategory = BusinessCategory = {}));
var DeliveryType;
(function (DeliveryType) {
    DeliveryType["PLATFORM"] = "PLATFORM";
    DeliveryType["SELF"] = "SELF";
})(DeliveryType || (exports.DeliveryType = DeliveryType = {}));
