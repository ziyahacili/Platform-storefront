'use client';

import { useQuery } from '@tanstack/react-query';
import { productsAPI } from '@/lib/api/products';
import { ProductCard } from './product-card';
import { Product } from '@/types/product';

function normalizeProduct(
  p: Product & {
    Id?: string;
    oldPrice?: number;
    discountPercent?: number;
    rating?: number;
    ratingCount?: number;
    installmentMonths?: number;
  }
): Product &
  Partial<{
    oldPrice: number;
    discountPercent: number;
    rating: number;
    ratingCount: number;
    installmentMonths: number;
  }> {
  return {
    id: p.id ?? p.Id ?? '',
    name: p.name ?? '',
    description: p.description,
    price: p.price ?? 0,
    stockQuantity: p.stockQuantity,
    imageUrls: p.imageUrls ?? [],
    image: p.image,
    oldPrice: p.oldPrice,
    discountPercent: p.discountPercent,
    rating: p.rating,
    ratingCount: p.ratingCount,
    installmentMonths: p.installmentMonths,
  };
}

function ProductCardSkeleton() {
  return (
    <div className="h-full border border-[#E6E8F0] bg-white">
      <div className="relative min-h-[200px] bg-white px-5 pt-12">
        <div className="absolute right-3 top-3 h-8 w-8 rounded-full border border-transparent bg-transparent" />
        <div className="mx-auto h-[118px] w-full max-w-[220px] animate-pulse rounded-md bg-slate-100" />
        <div className="absolute left-3 bottom-3 h-5 w-12 animate-pulse rounded-sm bg-slate-200" />
      </div>

      <div className="px-4 pb-4">
        <div className="mb-3 h-5 w-24 animate-pulse rounded bg-slate-200" />
        <div className="mb-3 h-5 w-28 animate-pulse rounded bg-[#FFE2EF]" />
        <div className="mb-3 h-10 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-10 w-full animate-pulse rounded bg-[#FCEAF3]" />
      </div>
    </div>
  );
}

export function ProductGrid() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsAPI.getProducts({ limit: 12 }),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-100 bg-red-50 px-4 py-8 text-center">
        <p className="text-base text-red-600">
          Ошибка загрузки продуктов. Убедитесь, что Minikube tunnel запущен и API доступен по адресу api.local
        </p>
      </div>
    );
  }

  const products = (data ?? []).map(normalizeProduct);

  if (products.length === 0) {
    return (
      <div className="border border-slate-100 bg-white px-4 py-8 text-center">
        <p className="text-base text-slate-500">Продукты не найдены</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}