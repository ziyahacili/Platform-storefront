import { apiGet } from './client';
import { Category } from '@/types/category';

export const categoriesAPI = {
  async getCategories(): Promise<Category[]> {
    const data = await apiGet<Category[]>(`/category/categories`);
    return Array.isArray(data) ? data : [];
  },

  async getCategoryById(id: string): Promise<Category> {
    return apiGet<Category>(`/category/categories/${id}`);
  },

  async getCategoryByName(name: string): Promise<Category> {
    return apiGet<Category>(
      `/category/categories/name/${encodeURIComponent(name)}`
    );
  },
};
