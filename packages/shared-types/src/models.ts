import {
  BusinessType,
  DeliveryType,
  DriverStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
  UserStatus,
} from './enums';

export interface Area {
  id: string;
  city: string;
  name: string;
  deliveryFee: number;
}

export interface User {
  id: string;
  role: UserRole;
  status: UserStatus;
  name: string;
  phone: string;
  email: string | null;
  areaId: string | null;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  type: BusinessType;
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  type: BusinessType;
  tags?: Tag[];
  areaId: string;
  deliveryType: DeliveryType;
  imageUrl: string | null;
  rating: number;
  isOpen: boolean;
}

export interface ProductCategory {
  id: string;
  businessId: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  imageUrl: string | null;
  children?: ProductCategory[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  price: number;
  stock: number | null;
  barcode: string | null;
  sortOrder: number;
  isAvailable: boolean;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  category: string | null;
  // Store-only additions (nullable — restaurants unaffected)
  categoryId?: string | null;
  barcode?: string | null;
  stock?: number | null;
  lowStockAlert?: number | null;
  hasVariants?: boolean;
  unit?: string | null;
  variants?: ProductVariant[];
  productCategory?: ProductCategory;
}

export interface Driver {
  id: string;
  userId: string;
  status: DriverStatus;
  areaId: string;
  rating: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  variantId?: string | null;
  variantName?: string | null;
}

export interface Order {
  id: string;
  customerId: string;
  businessId: string;
  driverId: string | null;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  total: number;
  note: string | null;
  createdAt: string;
  items?: OrderItem[];
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  changedBy: string;
  createdAt: string;
}

export interface Review {
  id: string;
  orderId: string;
  businessRating: number;
  driverRating: number | null;
  comment: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
}
