export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stockQuantity?: number;
  imageUrls?: string[];
  image?: string; // derived from imageUrls[0]
}

export interface ProductDetail extends Product {
  shop: {
    id: string;
    name: string;
    subdomain?: string;
  };
  category: {
    id: string;
    name: string;
  };
}

export interface ProductsResponse {
  products: Product[];
  total?: number;
  page?: number;
  limit?: number;
}
