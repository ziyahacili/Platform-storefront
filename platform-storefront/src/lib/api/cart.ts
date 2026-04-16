import { apiGet, apiPost, apiPut, apiDelete } from './client';
import { Cart } from '@/types/cart';

export const cartAPI = {
  async getCart(): Promise<Cart> {
    return apiGet<Cart>('/cart/cart');
  },

  async addItem(productId: string, quantity: number): Promise<void> {
    await apiPost(`/cart/cart/${productId}?quantity=${quantity}`);
  },

  async removeItem(cartItemId: string): Promise<void> {
    await apiDelete(`/cart/cart/${cartItemId}`);
  },

  async updateQuantity(cartItemId: string, quantity: number): Promise<void> {
    await apiPut(`/cart/cart/${cartItemId}?quantity=${quantity}`);
  },

  async clearCart(): Promise<void> {
    await apiDelete('/cart/cart/clear');
  },

  async getTotal(): Promise<{ total: number }> {
    return apiGet<{ total: number }>('/cart/cart/price-total');
  },
};
