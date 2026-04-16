'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shopsAPI } from '@/lib/api/shops';
import Link from 'next/link';

export default function ShopsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['shops', page],
    queryFn: () => shopsAPI.getShops(page, 12),
  });

  const shops = data ?? [];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Магазины</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12 bg-red-50 rounded-xl">
          <p className="text-red-600 text-lg">Ошибка загрузки магазинов</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Магазины</h1>
      {shops.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <p className="text-slate-500">Магазины не найдены</p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map((shop) => (
              <Link
                key={shop.id}
                href={`/shop/products?shopId=${shop.id}`}
                className="block p-6 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-lg text-slate-900">
                  {shop.name}
                </h3>
                {shop.description && (
                  <p className="text-slate-500 text-sm mt-1 line-clamp-2">
                    {shop.description}
                  </p>
                )}
                {shop.subdomain && (
                  <p className="text-amber-600 text-sm mt-2">{shop.subdomain}</p>
                )}
              </Link>
            ))}
          </div>
          <div className="mt-8 flex justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg bg-slate-200 disabled:opacity-50"
            >
              Назад
            </button>
            <span className="px-4 py-2">Стр. {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={shops.length < 12}
              className="px-4 py-2 rounded-lg bg-slate-200 disabled:opacity-50"
            >
              Далее
            </button>
          </div>
        </>
      )}
    </div>
  );
}
