import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type { AxiosRequestConfig } from 'axios';

export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 60000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log('📤 REQUEST', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ REQUEST ERROR', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('📥 RESPONSE', response.status, response.config.url);
    return response;
  },
  (error: AxiosError) => {
    console.log('📥 RESPONSE ERROR', error.response?.status, error.config?.url);
    return Promise.reject(error);
  }
);

export const apiGet = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const res = await apiClient.get<T>(url, config);
  return res.data;
};

export const apiPost = async <T, U = any>(url: string, data?: U, config?: AxiosRequestConfig): Promise<T> => {
  const res = await apiClient.post<T>(url, data, config);
  return res.data;
};

export const apiPut = async <T, U = any>(url: string, data?: U, config?: AxiosRequestConfig): Promise<T> => {
  const res = await apiClient.put<T>(url, data, config);
  return res.data;
};

export const apiDelete = async <T = void>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const res = await apiClient.delete<T>(url, config);
  return res.data;
};