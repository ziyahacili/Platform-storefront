import { apiGet } from './client';
import { Product, ProductDetail } from '@/types/product';

export const productsAPI = {
  async getProducts(params?: {
    page?: number;
    limit?: number;
  }): Promise<Product[]> {
    const query = new URLSearchParams();

    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const data = await apiGet<Product[]>(
      `/product/products${qs ? `?${qs}` : ''}`
    );

    return Array.isArray(data) ? data : [];
  },

  async getProductsByCategories(
    categoryIds: string[],
    page = 1,
    limit = 10
  ): Promise<Product[]> {
    const query = new URLSearchParams();

    categoryIds.forEach((id) => {
      if (id) query.append('categoryIds', id);
    });

    query.set('page', String(page));
    query.set('limit', String(limit));

    const data = await apiGet<Product[]>(
      `/product/products/by-categories?${query.toString()}`
    );

    return Array.isArray(data) ? data : [];
  },

  async getProductById(id: string): Promise<Product> {
    return apiGet<Product>(`/product/products/${id}`);
  },

  async getProductDetail(id: string): Promise<ProductDetail> {
    return apiGet<ProductDetail>(`/product/products/${id}/detail`);
  },

  async searchProducts(
    query: string,
    page = 1,
    limit = 10
  ): Promise<Product[]> {
    const data = await apiGet<Product[]>(
      `/product/products/search?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    );

    return Array.isArray(data) ? data : [];
  },

  async getShopProducts(
    shopId: string,
    page = 1,
    limit = 10
  ): Promise<Product[]> {
    const data = await apiGet<Product[]>(
      `/product/products/shop?shopId=${shopId}&page=${page}&limit=${limit}`
    );

    return Array.isArray(data) ? data : [];
  },
};