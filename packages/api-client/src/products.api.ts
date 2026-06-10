import { http } from './http';
import type { Product } from './businesses.api';

export { type Product };

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

export interface CreateProductDto {
  businessId: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  categoryId?: string;
  isAvailable?: boolean;
  imageUrl?: string;
  barcode?: string;
  stock?: number;
  lowStockAlert?: number;
  hasVariants?: boolean;
  unit?: string;
}

export interface CreateCategoryDto {
  businessId: string;
  name: string;
  parentId?: string;
  imageUrl?: string;
  sortOrder?: number;
}

export interface CreateVariantDto {
  name: string;
  price: number;
  stock?: number;
  barcode?: string;
  sortOrder?: number;
  isAvailable?: boolean;
}

export interface SearchProduct extends Product {
  business?: { id: string; name: string; imageUrl: string | null; isOpen: boolean; area?: { city: string; name: string; deliveryFee: number } };
}

export const productsApi = {
  listByBusiness: (businessId: string) =>
    http
      .get<Product[]>('/products', { params: { businessId } })
      .then((r) => r.data),

  search: (q: string, areaId?: string) =>
    http
      .get<SearchProduct[]>('/products/search', { params: { q, areaId } })
      .then((r) => r.data),

  findByBarcode: (code: string, businessId: string) =>
    http
      .get<Product>(`/products/barcode/${code}`, { params: { businessId } })
      .then((r) => r.data),

  getLowStock: (businessId: string) =>
    http
      .get<Product[]>('/products/low-stock', { params: { businessId } })
      .then((r) => r.data),

  create: (dto: CreateProductDto) =>
    http.post<Product>('/products', dto).then((r) => r.data),

  update: (id: string, dto: Partial<CreateProductDto>) =>
    http.patch<Product>(`/products/${id}`, dto).then((r) => r.data),

  remove: (id: string) =>
    http.delete(`/products/${id}`).then((r) => r.data),

  // Variants
  listVariants: (productId: string) =>
    http.get<ProductVariant[]>(`/products/${productId}/variants`).then((r) => r.data),

  createVariant: (productId: string, dto: CreateVariantDto) =>
    http.post<ProductVariant>(`/products/${productId}/variants`, dto).then((r) => r.data),

  updateVariant: (productId: string, variantId: string, dto: Partial<CreateVariantDto>) =>
    http.patch<ProductVariant>(`/products/${productId}/variants/${variantId}`, dto).then((r) => r.data),

  deleteVariant: (productId: string, variantId: string) =>
    http.delete(`/products/${productId}/variants/${variantId}`).then((r) => r.data),
};

export const categoriesApi = {
  listByBusiness: (businessId: string) =>
    http
      .get<ProductCategory[]>('/product-categories', { params: { businessId } })
      .then((r) => r.data),

  create: (dto: CreateCategoryDto) =>
    http.post<ProductCategory>('/product-categories', dto).then((r) => r.data),

  update: (id: string, dto: Partial<CreateCategoryDto>) =>
    http.patch<ProductCategory>(`/product-categories/${id}`, dto).then((r) => r.data),

  reorder: (ids: string[]) =>
    http.patch('/product-categories/reorder', { ids }).then((r) => r.data),

  remove: (id: string) =>
    http.delete(`/product-categories/${id}`).then((r) => r.data),
};
