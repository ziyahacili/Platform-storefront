import { apiClient } from './client';
import type { LoginDto, LoginResponse, RegisterDto } from '@/types/auth';

export const authAPI = {
  async login(data: LoginDto): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      '/identity/auth/Login',
      data
    );
    return response.data;
  },

  async register(data: RegisterDto): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      '/identity/auth/Register',
      data
    );
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/identity/auth/Logout');
  },
};