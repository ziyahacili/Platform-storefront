export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  imageUrls: string[];
  shopId: string;
  shopName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  totalAmount: number;
}
