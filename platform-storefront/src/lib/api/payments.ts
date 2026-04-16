import { apiGet } from './client';
import { ordersAPI } from './orders';
import type { PaymentTransaction } from '@/types/payment';

function mapPaymentTransaction(raw: any): PaymentTransaction {
  return {
    orderId: String(raw.orderId ?? raw.OrderId ?? ''),
    amount: Number(raw.amount ?? raw.Amount ?? 0),
    transactionDate: String(raw.transactionDate ?? raw.TransactionDate ?? ''),
    status: raw.status ?? raw.Status ?? 'Pending',
  };
}

export const paymentsAPI = {
  async getAllPaymentTransactions(): Promise<PaymentTransaction[]> {
    const data = await apiGet<unknown>(`/order/Payment`);

    if (Array.isArray(data)) {
      return data.map(mapPaymentTransaction);
    }

    if (data && typeof data === 'object') {
      const d = data as Record<string, any>;
      if (Array.isArray(d.items)) return d.items.map(mapPaymentTransaction);
      if (Array.isArray(d.data)) return d.data.map(mapPaymentTransaction);
      if (Array.isArray(d.result)) return d.result.map(mapPaymentTransaction);
    }

    return [];
  },

  async getPaymentTransactionByOrderId(
    orderId: string
  ): Promise<PaymentTransaction | null> {
    const transactions = await this.getAllPaymentTransactions();
    return transactions.find((t) => t.orderId === orderId) ?? null;
  },

  async getPaymentTransactionByTrackingId(
    trackingId: string
  ): Promise<PaymentTransaction | null> {
    const order = await ordersAPI.getOrderByTracking(trackingId);
    if (!order?.id) return null;

    const transactions = await this.getAllPaymentTransactions();
    return transactions.find((t) => t.orderId === order.id) ?? null;
  },
};