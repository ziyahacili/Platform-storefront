import { apiGet, apiPost } from './client';
import { Order, CreateOrderRequest } from '@/types/order';
import type { PaymentResponse } from '@/types/payment';

function mapOrderItem(raw: any) {
  const product = raw?.product && typeof raw.product === 'object' ? raw.product : null;

  return {
    id: raw.id ?? '',
    orderId: raw.orderId ?? '',
    shopId: raw.shopId ?? product?.shopId ?? '',
    productId: raw.productId ?? product?.id ?? '',
    productName:
      raw.productName ??
      raw.name ??
      raw.title ??
      product?.name ??
      product?.title ??
      '',
    quantity: raw.quantity ?? 0,
    unitPrice: raw.unitPrice ?? raw.price ?? 0,
    totalPrice: raw.totalPrice ?? 0,
    imageUrls:
      raw.imageUrls ??
      product?.imageUrls ??
      product?.images ??
      product?.photos ??
      [],
    imageUrl:
      raw.imageUrl ??
      product?.imageUrl ??
      product?.image ??
      product?.thumbnail ??
      '',
    shopName:
      raw.shopName ??
      raw.sellerName ??
      product?.shopName ??
      product?.shop?.name ??
      '',
    product,
  };
}

function mapOrder(raw: any): Order {
  return {
    id: raw.id ?? '',
    userId: raw.userId ?? '',
    trackingId: raw.trackingId ?? '',
    address: raw.address ?? '',
    city: raw.city ?? '',
    zip: raw.zip ?? '',
    orderDate: raw.orderDate ?? raw.createdAt ?? '',
    totalAmount: raw.totalAmount ?? raw.amount ?? 0,
    status: raw.status ?? 'Pending',
    shopName:
      raw.shopName ??
      raw.sellerName ??
      raw.companyName ??
      raw.merchantName ??
      raw.vendorName ??
      raw.storeName ??
      '',
    sellerName:
      raw.sellerName ??
      raw.shopName ??
      raw.companyName ??
      raw.merchantName ??
      raw.vendorName ??
      raw.storeName ??
      '',
    paymentMethod: raw.paymentMethod ?? raw.paymentType ?? raw.payType ?? '',
    paymentStatus: raw.paymentStatus ?? '',
    orderItems: Array.isArray(raw.orderItems)
      ? raw.orderItems.map(mapOrderItem)
      : Array.isArray(raw.items)
        ? raw.items.map(mapOrderItem)
        : [],
  } as Order;
}

export const ordersAPI = {
  async getUserOrders(page = 1, limit = 10): Promise<Order[]> {
    const data = await apiGet<unknown>(
      `/order/orders/user?page=${page}&limit=${limit}`
    );

    if (Array.isArray(data)) return data.map(mapOrder);

    if (data && typeof data === 'object') {
      const d = data as Record<string, any>;
      if (Array.isArray(d.items)) return d.items.map(mapOrder);
      if (Array.isArray(d.data)) return d.data.map(mapOrder);
      if (Array.isArray(d.result)) return d.result.map(mapOrder);
    }

    return [];
  },

  async createOrder(
    request: CreateOrderRequest
  ): Promise<{ trackingId: string; id: string; amount: number }> {
    const data = await apiPost<any>('/order/orders', request);
    return {
      trackingId: data.trackingId ?? '',
      id: data.id ?? '',
      amount: data.amount ?? 0,
    };
  },

  async captureOrder(
    trackingId: string,
    paymentRequest: {
      cardNumber: string;
      expirationDate: string;
      cvv: string;
      cardHolderName: string;
      amount: number;
    }
  ): Promise<PaymentResponse> {
    const data = await apiPost<any>(
      `/order/orders/${encodeURIComponent(trackingId)}/capture`,
      paymentRequest
    );

    return {
      transactionId: data.transactionId ?? data.TransactionId ?? data.id ?? '',
      status: data.status ?? data.Status ?? 'Pending',
    };
  },

  async getOrderByTracking(trackingId: string): Promise<Order> {
    const data = await apiGet<unknown>(
      `/order/orders/tracking/${encodeURIComponent(trackingId)}`
    );
    return mapOrder(data);
  },
};