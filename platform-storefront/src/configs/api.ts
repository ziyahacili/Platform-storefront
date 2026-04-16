/**
 * API configuration for Marketplace microservices
 * Base URL: http://api.local (Minikube tunnel)
 * Ocelot Gateway routes: /identity, /product, /category, /shop, /cart, /order
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://api.local';

export const API_ROUTES = {
  identity: `${API_BASE_URL}/identity`,
  product: `${API_BASE_URL}/product`,
  category: `${API_BASE_URL}/category`,
  shop: `${API_BASE_URL}/shop`,
  cart: `${API_BASE_URL}/cart`,
  order: `${API_BASE_URL}/order`,
} as const;

// API version prefix (backend uses /api/v1/)
export const API_VERSION = 'v1';
