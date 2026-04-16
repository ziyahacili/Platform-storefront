export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Rejected'
  | 'OnHold'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned'
  | 'PaymentFailed'
  | number;

export interface OrderItem {
  id: string;
  orderId?: string;
  shopId?: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  imageUrls?: string[];
  imageUrl?: string;
  shopName?: string;
  product?: Record<string, any>;
}

export interface Order {
  id: string;
  userId: string;
  trackingId: string;
  address: string;
  city: string;
  zip: number;
  orderDate: string;
  totalAmount: number;
  status: OrderStatus;
  shopName?: string;
  sellerName?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  orderItems: OrderItem[];
}

export interface CreateOrderItem {
  productId: string;
  quantity: number;
}

export interface PaymentRequest {
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  cardHolderName: string;
  amount: number;
}

export interface CreateOrderRequest {
  order: {
    address: string;
    city: string;
    zip: number;
    products: CreateOrderItem[];
  };
}