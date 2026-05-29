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
}

export const productsApi = {
  listByBusiness: (businessId: string) =>
    http
      .get<Product[]>('/products', { params: { businessId } })
      .then((r) => r.data),

  create: (dto: CreateProductDto) =>
    http.post<Product>('/products', dto).then((r) => r.data),

  update: (id: string, dto: Partial<CreateProductDto>) =>
    http.patch<Product>(`/products/${id}`, dto).then((r) => r.data),

  remove: (id: string) =>
    http.delete(`/products/${id}`).then((r) => r.data),
};
