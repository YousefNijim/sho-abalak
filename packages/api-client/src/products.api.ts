import { http } from './http';
import type { Product } from './businesses.api';

export { type Product };

export interface CreateProductDto {
  businessId: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  isAvailable?: boolean;
  imageUrl?: string;
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

  create: (dto: CreateProductDto) =>
    http.post<Product>('/products', dto).then((r) => r.data),

  update: (id: string, dto: Partial<CreateProductDto>) =>
    http.patch<Product>(`/products/${id}`, dto).then((r) => r.data),

  remove: (id: string) =>
    http.delete(`/products/${id}`).then((r) => r.data),
};
