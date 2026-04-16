import { apiGet } from './client';
import { Shop } from '@/types/shop';

export const shopsAPI = {
  async getShops(page = 1, pageSize = 10): Promise<Shop[]> {
    const data = await apiGet<Shop[]>(
      `/shop/shops?pageNumber=${page}&pageSize=${pageSize}`
    );
    return Array.isArray(data) ? data : [];
  },

  async getShopById(id: string): Promise<Shop> {
    return apiGet<Shop>(`/shop/shops/${id}`);
  },

  async getShopBySubdomain(subdomain: string): Promise<Shop> {
    return apiGet<Shop>(
      `/shop/shops/subdomain/${encodeURIComponent(subdomain)}`
    );
  },
};
