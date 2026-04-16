'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { productsAPI } from '@/lib/api/products';
import { categoriesAPI } from '@/lib/api/categories';
import { shopsAPI } from '@/lib/api/shops';
import { ProductCard } from '@/components/product/product-card';
import type { Product } from '@/types/product';
import type { Category } from '@/types/category';
import type { Shop } from '@/types/shop';

const PAGE_SIZE = 24;

type ExtendedProduct = Product & {
  Id?: string;
  image?: string;
  oldPrice?: number;
  discountPercent?: number;
  rating?: number;
  ratingCount?: number;
  installmentMonths?: number;
  brand?: string;
  shopName?: string;
  sellerName?: string;
  shop?: { name?: string };
};

function normalizeProduct(p: ExtendedProduct): Product & Partial<{
  oldPrice: number; discountPercent: number; rating: number;
  ratingCount: number; installmentMonths: number; brand: string; shopName: string;
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
    brand: p.brand ?? p.shopName ?? p.shop?.name,
    shopName: p.shopName ?? p.sellerName ?? p.shop?.name,
  };
}

function parseCategoryIds(searchParams: ReturnType<typeof useSearchParams>) {
  const ids = new Set<string>();
  searchParams.getAll('categoryIds').forEach((value) => {
    value.split(',').map((x) => x.trim()).filter(Boolean).forEach((id) => ids.add(id));
  });
  const legacyCategoryId = searchParams.get('categoryId');
  if (legacyCategoryId) {
    legacyCategoryId.split(',').map((x) => x.trim()).filter(Boolean).forEach((id) => ids.add(id));
  }
  return Array.from(ids);
}

function buildTree(flat: Category[]): Category[] {
  const map = new Map<string, Category & { children: Category[] }>();
  flat.forEach((c) => { map.set(c.id, { ...c, children: [] }); });
  const roots: Category[] = [];
  map.forEach((node) => {
    if (node.parentCategoryId && map.has(node.parentCategoryId)) {
      map.get(node.parentCategoryId)!.children.push(node);
    } else if (!node.parentCategoryId) {
      roots.push(node);
    }
  });
  return roots;
}

function findCategoryPath(
  nodes: (Category & { children?: Category[] })[],
  targetId: string
): Category[] {
  const path: Category[] = [];
  function dfs(list: (Category & { children?: Category[] })[], stack: Category[]): boolean {
    for (const node of list) {
      const nextStack = [...stack, node];
      if (node.id === targetId) { path.push(...nextStack); return true; }
      if (node.children && node.children.length > 0) {
        if (dfs(node.children, nextStack)) return true;
      }
    }
    return false;
  }
  dfs(nodes, []);
  return path;
}

function getDiscountPercent(product: ExtendedProduct) {
  if (typeof product.discountPercent === 'number') return product.discountPercent;
  const oldPrice = product.oldPrice;
  if (typeof oldPrice === 'number' && oldPrice > product.price && oldPrice > 0) {
    return Math.round(((oldPrice - product.price) / oldPrice) * 100);
  }
  return null;
}

function getProductBrand(product: ExtendedProduct) {
  return product.brand ?? product.shopName ?? product.sellerName ?? product.shop?.name ?? 'Без бренда';
}

function getProductShopName(product: ExtendedProduct) {
  return product.shopName ?? product.sellerName ?? product.shop?.name ?? 'Продавец';
}

function hasDiscount(product: ExtendedProduct) {
  return getDiscountPercent(product) !== null;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getShopNameById(shops: Shop[], id: string) {
  return shops.find((s) => s.id === id)?.name ?? '';
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Build page numbers with ellipsis
  const getPages = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPages();

  return (
    <div className="mt-8 flex items-center justify-center gap-1">
      {/* Prev */}
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex h-9 w-9 items-center justify-center border border-[#E8EAF0] bg-white text-[#1D1D1F] transition-colors hover:border-[#1D1D1F] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Pages */}
      {pages.map((p, idx) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className="flex h-9 w-9 items-center justify-center text-[13px] text-[#9CA3AF]">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className="flex h-9 w-9 items-center justify-center border text-[13px] font-semibold transition-colors"
            style={{
              background: p === page ? '#1D1D1F' : 'white',
              color: p === page ? 'white' : '#1D1D1F',
              borderColor: p === page ? '#1D1D1F' : '#E8EAF0',
            }}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="flex h-9 w-9 items-center justify-center border border-[#E8EAF0] bg-white text-[#1D1D1F] transition-colors hover:border-[#1D1D1F] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Page info */}
      <span className="ml-3 text-[12px] text-[#9CA3AF]">
        Стр. {page} из {totalPages}
      </span>
    </div>
  );
}

// ─── Filter Sidebar ───────────────────────────────────────────────────────────

function FilterSidebar({
  products,
  shops,
  selectedBrand,
  selectedShopId,
  discountOnly,
  minPrice,
  maxPrice,
  onToggleBrand,
  onToggleShop,
  onToggleDiscount,
  onApplyPrice,
  onResetAll,
}: {
  products: ExtendedProduct[];
  shops: Shop[];
  selectedBrand: string;
  selectedShopId: string;
  discountOnly: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  onToggleBrand: (brand: string) => void;
  onToggleShop: (shopId: string) => void;
  onToggleDiscount: (value: boolean) => void;
  onApplyPrice: (min: number | null, max: number | null) => void;
  onResetAll: () => void;
}) {
  const [minInput, setMinInput] = useState<string>('');
  const [maxInput, setMaxInput] = useState<string>('');
  const [brandsExpanded, setBrandsExpanded] = useState(false);
  const [shopsExpanded, setShopsExpanded] = useState(false);

  const priceValues = products.map((p) => Number(p.price)).filter((n) => Number.isFinite(n));
  const computedMin = priceValues.length > 0 ? Math.floor(Math.min(...priceValues)) : 0;
  const computedMax = priceValues.length > 0 ? Math.ceil(Math.max(...priceValues)) : 1000;

  useEffect(() => {
    if (minPrice === null && maxPrice === null) {
      setMinInput(String(computedMin));
      setMaxInput(String(computedMax));
    } else {
      setMinInput(minPrice !== null ? String(minPrice) : String(computedMin));
      setMaxInput(maxPrice !== null ? String(maxPrice) : String(computedMax));
    }
  }, [computedMin, computedMax, minPrice, maxPrice]);

  const brandCounts = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const brand = getProductBrand(p);
      map.set(brand, (map.get(brand) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([brand, count]) => ({ brand, count })).sort((a, b) => b.count - a.count);
  }, [products]);

  const visibleBrands = brandsExpanded ? brandCounts : brandCounts.slice(0, 6);
  const visibleShops = shopsExpanded ? shops : shops.slice(0, 5);

  return (
    <aside className="w-full bg-white" style={{ border: '1px solid #E8EAF0' }}>
      <div className="flex items-center justify-between border-b border-[#E8EAF0] px-5 py-4">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1D1D1F]">Фильтры</span>
        <button
          type="button"
          onClick={onResetAll}
          className="text-[11px] font-semibold text-[#9CA3AF] transition-colors hover:text-[#F64FA0]"
        >
          Сбросить
        </button>
      </div>

      <div className="divide-y divide-[#E8EAF0]">
        {/* Discount */}
        <div className="px-5 py-4">
          <label className="flex cursor-pointer items-center gap-3">
            <div
              className="relative flex h-4 w-4 shrink-0 items-center justify-center"
              style={{
                background: discountOnly ? '#1D1D1F' : 'transparent',
                border: `1px solid ${discountOnly ? '#1D1D1F' : '#D1D5DB'}`,
              }}
            >
              {discountOnly && (
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M2 6l3 3 5-5" />
                </svg>
              )}
              <input
                type="checkbox"
                checked={discountOnly}
                onChange={(e) => onToggleDiscount(e.target.checked)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
            <span className="text-[13px] font-medium text-[#1D1D1F]">Со скидкой</span>
            {discountOnly && (
              <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white" style={{ background: '#F64FA0' }}>
                SALE
              </span>
            )}
          </label>
        </div>

        {/* Price */}
        <div className="px-5 py-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Цена, ₼</div>
          <div className="flex items-center gap-2">
            <input
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              placeholder="от"
              className="h-9 w-full border border-[#E8EAF0] bg-[#FAFAFA] px-3 text-[13px] text-[#1D1D1F] outline-none transition-colors focus:border-[#1D1D1F] placeholder:text-[#9CA3AF]"
            />
            <span className="text-[#D1D5DB]">—</span>
            <input
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              placeholder="до"
              className="h-9 w-full border border-[#E8EAF0] bg-[#FAFAFA] px-3 text-[13px] text-[#1D1D1F] outline-none transition-colors focus:border-[#1D1D1F] placeholder:text-[#9CA3AF]"
            />
            <button
              type="button"
              onClick={() => {
                const parsedMin = Number(minInput);
                const parsedMax = Number(maxInput);
                onApplyPrice(
                  Number.isFinite(parsedMin) ? parsedMin : null,
                  Number.isFinite(parsedMax) ? parsedMax : null
                );
              }}
              className="h-9 shrink-0 px-4 text-[12px] font-bold text-white transition-opacity hover:opacity-80"
              style={{ background: '#1D1D1F' }}
            >
              OK
            </button>
          </div>
          <div className="mt-3">
            <input
              type="range"
              min={computedMin}
              max={computedMax}
              value={Math.min(Number(maxInput) || computedMax, computedMax)}
              onChange={(e) => setMaxInput(e.target.value)}
              className="w-full cursor-pointer accent-[#1D1D1F]"
            />
            <div className="flex justify-between text-[10px] text-[#9CA3AF]">
              <span>{computedMin} ₼</span>
              <span>{computedMax} ₼</span>
            </div>
          </div>
        </div>

        {/* Brand */}
        <div className="px-5 py-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Бренд</div>
          <div className="space-y-1.5">
            {visibleBrands.map(({ brand, count }) => {
              const checked = selectedBrand === brand;
              return (
                <label key={brand} className="flex cursor-pointer items-center gap-3 py-0.5">
                  <div
                    className="relative flex h-4 w-4 shrink-0 items-center justify-center"
                    style={{
                      background: checked ? '#1D1D1F' : 'transparent',
                      border: `1px solid ${checked ? '#1D1D1F' : '#D1D5DB'}`,
                    }}
                  >
                    {checked && (
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onToggleBrand(e.target.checked ? brand : '')}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </div>
                  <span className="min-w-0 truncate text-[13px] text-[#1D1D1F]">{brand}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-[#9CA3AF]">{count}</span>
                </label>
              );
            })}
          </div>
          {brandCounts.length > 6 && (
            <button
              type="button"
              onClick={() => setBrandsExpanded((prev) => !prev)}
              className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-[#6B7280] transition-colors hover:text-[#1D1D1F]"
            >
              {brandsExpanded ? 'Скрыть' : `Ещё ${brandCounts.length - 6}`}
              <span className={`transition-transform ${brandsExpanded ? 'rotate-180' : ''}`}>
                <IconChevronDown />
              </span>
            </button>
          )}
        </div>

        {/* Sellers */}
        <div className="px-5 py-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Продавец</div>
          <div className="space-y-1.5">
            {visibleShops.map((shop) => {
              const checked = selectedShopId === shop.id;
              return (
                <label key={shop.id} className="flex cursor-pointer items-center gap-3 py-0.5">
                  <div
                    className="relative flex h-4 w-4 shrink-0 items-center justify-center"
                    style={{
                      background: checked ? '#1D1D1F' : 'transparent',
                      border: `1px solid ${checked ? '#1D1D1F' : '#D1D5DB'}`,
                    }}
                  >
                    {checked && (
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onToggleShop(e.target.checked ? shop.id : '')}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </div>
                  <span className="min-w-0 truncate text-[13px] text-[#1D1D1F]">{shop.name ?? 'Продавец'}</span>
                </label>
              );
            })}
          </div>
          {shops.length > 5 && (
            <button
              type="button"
              onClick={() => setShopsExpanded((prev) => !prev)}
              className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-[#6B7280] transition-colors hover:text-[#1D1D1F]"
            >
              {shopsExpanded ? 'Скрыть' : `Ещё ${shops.length - 5}`}
              <span className={`transition-transform ${shopsExpanded ? 'rotate-180' : ''}`}>
                <IconChevronDown />
              </span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProductCardSkeleton() {
  return (
    <div className="bg-white" style={{ border: '1px solid #E8EAF0' }}>
      <div className="relative aspect-[4/3] bg-[#F9FAFB]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-[100px] w-[100px] animate-pulse bg-[#E8EAF0]" />
        </div>
      </div>
      <div className="space-y-2 p-4">
        <div className="h-3.5 w-3/4 animate-pulse bg-[#E8EAF0]" />
        <div className="h-3 w-1/2 animate-pulse bg-[#F3F4F6]" />
        <div className="h-6 w-1/3 animate-pulse bg-[#E8EAF0]" />
        <div className="mt-3 h-9 w-full animate-pulse bg-[#F3F4F6]" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const shopIdFromUrl = searchParams.get('shopId') ?? '';
  const urlQuery = searchParams.get('query') ?? '';
  const sort = searchParams.get('sort') ?? 'popular';
  const selectedBrandFromUrl = searchParams.get('brand') ?? '';
  const discountOnlyFromUrl = searchParams.get('discountOnly') === '1';

  const categoryIds = useMemo(() => parseCategoryIds(searchParams), [searchParams]);
  const selectedCategoryId = categoryIds[0] ?? searchParams.get('categoryId') ?? '';

  const pageFromUrl = Number(searchParams.get('page') ?? '1');
  const page = Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1;

  const minPriceFromUrl = searchParams.get('minPrice');
  const maxPriceFromUrl = searchParams.get('maxPrice');

  const [rawCategories, setRawCategories] = useState<Category[]>([]);
  const [rawShops, setRawShops] = useState<Shop[]>([]);
  const [selectedBrand, setSelectedBrand] = useState(selectedBrandFromUrl);
  const [discountOnly, setDiscountOnly] = useState(discountOnlyFromUrl);
  const [minPrice, setMinPrice] = useState<number | null>(minPriceFromUrl ? Number(minPriceFromUrl) : null);
  const [maxPrice, setMaxPrice] = useState<number | null>(maxPriceFromUrl ? Number(maxPriceFromUrl) : null);

  useEffect(() => { setSelectedBrand(selectedBrandFromUrl); }, [selectedBrandFromUrl]);
  useEffect(() => { setDiscountOnly(discountOnlyFromUrl); }, [discountOnlyFromUrl]);
  useEffect(() => { setMinPrice(minPriceFromUrl ? Number(minPriceFromUrl) : null); }, [minPriceFromUrl]);
  useEffect(() => { setMaxPrice(maxPriceFromUrl ? Number(maxPriceFromUrl) : null); }, [maxPriceFromUrl]);

  useEffect(() => {
    let alive = true;
    categoriesAPI.getCategories().then((data) => { if (alive) setRawCategories(data); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    shopsAPI.getShops(1, 100).then((data) => { if (alive) setRawShops(data); });
    return () => { alive = false; };
  }, []);

  const categories = useMemo(() => buildTree(rawCategories), [rawCategories]);
  const selectedCategoryPath = useMemo(
    () => (selectedCategoryId ? findCategoryPath(categories, selectedCategoryId) : []),
    [categories, selectedCategoryId]
  );

  const selectedCategoryTitle =
    selectedCategoryPath[selectedCategoryPath.length - 1]?.name ??
    (categoryIds.length > 0 ? 'Категория' : 'Все товары');

  const breadcrumbItems = useMemo(() => {
    const items: { label: string; href?: string }[] = [
      { label: 'Главная', href: '/' },
      { label: 'Каталог', href: '/shop/products' },
    ];
    selectedCategoryPath.forEach((node) => {
      items.push({
        label: node.name,
        href: `/shop/products?categoryId=${encodeURIComponent(node.id)}`,
      });
    });
    return items;
  }, [selectedCategoryPath]);

  const hasCategoryFilter = categoryIds.length > 0;

  // ─── Fetch current page from API ──────────────────────────────────────────
  const { data: pageData, isLoading, error, isFetching } = useQuery({
    queryKey: ['products', { categoryIds, shopIdFromUrl, urlQuery, page, limit: PAGE_SIZE }],
    queryFn: () => {
      if (hasCategoryFilter) return productsAPI.getProductsByCategories(categoryIds, page, PAGE_SIZE);
      if (shopIdFromUrl) return productsAPI.getShopProducts(shopIdFromUrl, page, PAGE_SIZE);
      if (urlQuery) return productsAPI.searchProducts(urlQuery, page, PAGE_SIZE);
      return productsAPI.getProducts({ page, limit: PAGE_SIZE });
    },
    keepPreviousData: true,
    staleTime: 30_000,
  });

  // ─── Prefetch next page ───────────────────────────────────────────────────
  const { refetch: prefetchNext } = useQuery({
    queryKey: ['products', { categoryIds, shopIdFromUrl, urlQuery, page: page + 1, limit: PAGE_SIZE }],
    queryFn: () => {
      if (hasCategoryFilter) return productsAPI.getProductsByCategories(categoryIds, page + 1, PAGE_SIZE);
      if (shopIdFromUrl) return productsAPI.getShopProducts(shopIdFromUrl, page + 1, PAGE_SIZE);
      if (urlQuery) return productsAPI.searchProducts(urlQuery, page + 1, PAGE_SIZE);
      return productsAPI.getProducts({ page: page + 1, limit: PAGE_SIZE });
    },
    enabled: false, // prefetch only on demand
    staleTime: 60_000,
  });

  const normalizedProducts = useMemo(
    () => ((pageData ?? []) as ExtendedProduct[]).map(normalizeProduct),
    [pageData]
  );

  const prices = useMemo(
    () => normalizedProducts.map((p) => Number(p.price)).filter((n) => Number.isFinite(n)),
    [normalizedProducts]
  );

  const minBound = prices.length > 0 ? Math.floor(Math.min(...prices)) : 0;
  const maxBound = prices.length > 0 ? Math.ceil(Math.max(...prices)) : 1000;

  // ─── Client-side filters on current page ─────────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = [...normalizedProducts];

    if (selectedBrand) {
      list = list.filter((p) => getProductBrand(p as ExtendedProduct) === selectedBrand);
    }
    if (shopIdFromUrl) {
      const shopName = getShopNameById(rawShops, shopIdFromUrl);
      if (shopName) list = list.filter((p) => getProductShopName(p as ExtendedProduct) === shopName);
    }
    if (discountOnly) {
      list = list.filter((p) => hasDiscount(p as ExtendedProduct));
    }
    if (minPrice !== null) list = list.filter((p) => Number(p.price) >= minPrice);
    if (maxPrice !== null) list = list.filter((p) => Number(p.price) <= maxPrice);

    switch (sort) {
      case 'cheap': list.sort((a, b) => a.price - b.price); break;
      case 'expensive': list.sort((a, b) => b.price - a.price); break;
      case 'new':
        list.sort((a, b) => String((b as any).createdAt ?? '').localeCompare(String((a as any).createdAt ?? '')));
        break;
      default: break;
    }

    return list;
  }, [normalizedProducts, selectedBrand, shopIdFromUrl, discountOnly, minPrice, maxPrice, sort, rawShops]);

  // Estimate total pages: if full page returned, assume there are more pages
  const hasMorePages = normalizedProducts.length === PAGE_SIZE;
  const totalPages = hasMorePages ? page + 1 : page; // simple heuristic

  function updateUrl(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === '') params.delete(key);
      else params.set(key, String(value));
    });
    router.push(`/shop/products?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handlePageChange(p: number) {
    if (p < 1) return;
    updateUrl({ page: p });
    // Prefetch the page after next
    prefetchNext();
  }

  function setSort(nextSort: string) { updateUrl({ sort: nextSort, page: 1 }); }
  function toggleBrand(brand: string) { setSelectedBrand(brand); updateUrl({ brand, page: 1 }); }
  function toggleShop(shopId: string) { updateUrl({ shopId, page: 1 }); }
  function toggleDiscount(value: boolean) {
    setDiscountOnly(value);
    updateUrl({ discountOnly: value ? '1' : undefined, page: 1 });
  }
  function applyPrice(nextMin: number | null, nextMax: number | null) {
    const safeMin = nextMin !== null && Number.isFinite(nextMin) ? clampNumber(nextMin, minBound, maxBound) : null;
    const safeMax = nextMax !== null && Number.isFinite(nextMax) ? clampNumber(nextMax, minBound, maxBound) : null;
    setMinPrice(safeMin);
    setMaxPrice(safeMax);
    updateUrl({ minPrice: safeMin ?? undefined, maxPrice: safeMax ?? undefined, page: 1 });
  }
  function resetAll() {
    setSelectedBrand(''); setDiscountOnly(false); setMinPrice(null); setMaxPrice(null);
    const params = new URLSearchParams(searchParams.toString());
    ['brand', 'discountOnly', 'minPrice', 'maxPrice', 'shopId', 'sort'].forEach((k) => params.delete(k));
    params.set('page', '1');
    router.push(`/shop/products?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const topBrands = useMemo(() => {
    const map = new Map<string, number>();
    normalizedProducts.forEach((p) => {
      const brand = getProductBrand(p as ExtendedProduct);
      map.set(brand, (map.get(brand) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([brand, count]) => ({ brand, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [normalizedProducts]);

  const topShops = useMemo(() => rawShops.slice(0, 10), [rawShops]);
  const visibleCount = filteredProducts.length;

  return (
    <div className="min-h-screen text-[#1D1D1F]" style={{ background: '#EFEFEF', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <main className="mx-auto max-w-[1500px] px-6 pb-12 pt-5">

        {/* Breadcrumb */}
        <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-[11px] tracking-wide text-[#9CA3AF]">
          {breadcrumbItems.map((item, index) => (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && <IconChevronRight />}
              {item.href ? (
                <a href={item.href} className="transition-colors hover:text-[#1D1D1F]">{item.label}</a>
              ) : (
                <span className="font-semibold text-[#1D1D1F]">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Title bar */}
        <div className="mb-5 bg-white px-5 py-4" style={{ border: '1px solid #E8EAF0' }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[22px] font-bold text-[#1D1D1F]" style={{ letterSpacing: '-0.02em' }}>
                {selectedCategoryTitle}
              </h1>
              <div className="mt-0.5 text-[12px] text-[#9CA3AF]">
                {isFetching && !isLoading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 animate-spin rounded-full border border-[#9CA3AF] border-t-transparent" />
                    Загрузка...
                  </span>
                ) : (
                  `${visibleCount} товаров на странице ${page}`
                )}
              </div>
            </div>

            {/* Brand pills */}
            {topBrands.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {topBrands.map(({ brand }) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => toggleBrand(selectedBrand === brand ? '' : brand)}
                    className="px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-all"
                    style={{
                      background: selectedBrand === brand ? '#1D1D1F' : 'transparent',
                      color: selectedBrand === brand ? '#FFFFFF' : '#6B7280',
                      border: `1px solid ${selectedBrand === brand ? '#1D1D1F' : '#E8EAF0'}`,
                    }}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
          {/* Sidebar */}
          <FilterSidebar
            products={normalizedProducts}
            shops={topShops}
            selectedBrand={selectedBrand}
            selectedShopId={shopIdFromUrl}
            discountOnly={discountOnly}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onToggleBrand={toggleBrand}
            onToggleShop={toggleShop}
            onToggleDiscount={toggleDiscount}
            onApplyPrice={applyPrice}
            onResetAll={resetAll}
          />

          {/* Products section */}
          <section className="min-w-0">
            {/* Sort bar */}
            <div className="mb-4 flex items-center justify-between bg-white px-4 py-3" style={{ border: '1px solid #E8EAF0' }}>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9CA3AF]">Сортировка</span>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="h-8 appearance-none border border-[#E8EAF0] bg-[#FAFAFA] pl-3 pr-8 text-[12px] font-semibold text-[#1D1D1F] outline-none transition-colors focus:border-[#1D1D1F]"
                  >
                    <option value="popular">Популярные</option>
                    <option value="cheap">Сначала дешёвые</option>
                    <option value="expensive">Сначала дорогие</option>
                    <option value="new">Новинки</option>
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                    <IconChevronDown />
                  </span>
                </div>
              </div>

              {/* Page size info */}
              <div className="flex items-center gap-3 text-[12px] text-[#9CA3AF]">
                <span>Стр. {page}</span>
                <span>·</span>
                <span>{visibleCount} товаров</span>
              </div>
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-[1px] bg-[#E8EAF0] sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="bg-white px-6 py-12 text-center" style={{ border: '1px solid #E8EAF0' }}>
                <p className="text-[14px] font-semibold text-[#1D1D1F]">Ошибка загрузки товаров</p>
                <p className="mt-1 text-[13px] text-[#9CA3AF]">Проверьте доступность API</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white px-6 py-16 text-center" style={{ border: '1px solid #E8EAF0' }}>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center" style={{ background: '#F3F4F6' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <p className="text-[15px] font-semibold text-[#1D1D1F]">Товары не найдены</p>
                <p className="mt-1 text-[13px] text-[#9CA3AF]">Попробуйте изменить фильтры или перейти на другую страницу</p>
                <button
                  type="button"
                  onClick={resetAll}
                  className="mt-4 h-9 px-5 text-[12px] font-semibold text-white"
                  style={{ background: '#1D1D1F' }}
                >
                  Сбросить фильтры
                </button>
              </div>
            ) : (
              <>
                <div
                  className={`grid grid-cols-2 gap-[1px] bg-[#E8EAF0] sm:grid-cols-3 xl:grid-cols-4 transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
                >
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product as any} />
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-6 bg-white px-5 py-5" style={{ border: '1px solid #E8EAF0' }}>
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Prev / Next quick buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1 || isFetching}
                        className="flex h-9 items-center gap-2 border border-[#E8EAF0] bg-white px-4 text-[12px] font-semibold text-[#1D1D1F] transition-all hover:border-[#1D1D1F] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                        Назад
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={!hasMorePages || isFetching}
                        className="flex h-9 items-center gap-2 px-4 text-[12px] font-semibold text-white transition-all hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ background: '#1D1D1F' }}
                        onMouseEnter={() => prefetchNext()}
                      >
                        Следующая
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </button>
                    </div>

                    {/* Numbered pages */}
                    <div className="flex items-center gap-1">
                      {page > 2 && (
                        <>
                          <button type="button" onClick={() => handlePageChange(1)} className="flex h-9 w-9 items-center justify-center border border-[#E8EAF0] bg-white text-[13px] font-semibold text-[#1D1D1F] transition-colors hover:border-[#1D1D1F]">1</button>
                          {page > 3 && <span className="flex h-9 w-9 items-center justify-center text-[13px] text-[#9CA3AF]">…</span>}
                        </>
                      )}

                      {page > 1 && (
                        <button type="button" onClick={() => handlePageChange(page - 1)} className="flex h-9 w-9 items-center justify-center border border-[#E8EAF0] bg-white text-[13px] font-semibold text-[#1D1D1F] transition-colors hover:border-[#1D1D1F]">
                          {page - 1}
                        </button>
                      )}

                      {/* Current page */}
                      <button type="button" className="flex h-9 w-9 items-center justify-center text-[13px] font-bold text-white" style={{ background: '#1D1D1F' }}>
                        {page}
                      </button>

                      {hasMorePages && (
                        <button type="button" onClick={() => handlePageChange(page + 1)} className="flex h-9 w-9 items-center justify-center border border-[#E8EAF0] bg-white text-[13px] font-semibold text-[#1D1D1F] transition-colors hover:border-[#1D1D1F]">
                          {page + 1}
                        </button>
                      )}
                    </div>

                    {/* Page info */}
                    <span className="text-[12px] text-[#9CA3AF]">
                      {PAGE_SIZE} товаров на странице · стр. {page}
                    </span>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}