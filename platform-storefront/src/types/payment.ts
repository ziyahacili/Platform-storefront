export type PaymentStatus = 'Pending' | 'Succeeded' | 'Failed' | string;

export interface PaymentTransaction {
  orderId: string;
  amount: number;
  transactionDate: string;
  status: PaymentStatus;
}

export interface PaymentResponse {
  transactionId: string;
  status: PaymentStatus;
}