'use client';

import { useQuery } from '@tanstack/react-query';
import { categoriesAPI } from '@/lib/api/categories';
import { Category } from '@/types/category';
import Link from 'next/link';
import React, { useMemo, useState } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function getCategoryIcon(name: string) {
  const v = name.toLowerCase();
  if (v.includes('дом') || v.includes('home') || v.includes('ev')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>;
  if (v.includes('телефон') || v.includes('mob') || v.includes('telefon')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10 18h4"/></svg>;
  if (v.includes('ноут') || v.includes('комп') || v.includes('kompüt')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="10" rx="1"/><path d="M2 19h20"/></svg>;
  if (v.includes('быт') || v.includes('техника') || v.includes('texnika')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 12h8"/></svg>;
  if (v.includes('тв') || v.includes('tv') || v.includes('video') || v.includes('foto')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/></svg>;
  if (v.includes('авто') || v.includes('avtomobil')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13l2-5h14l2 5"/><path d="M5 13v4h14v-4"/><circle cx="7" cy="17" r="1.5"/><circle cx="17" cy="17" r="1.5"/></svg>;
  if (v.includes('красот') || v.includes('beauty') || v.includes('gözəl')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-6-3-6-9a4 4 0 0 1 6-3.46A4 4 0 0 1 18 13c0 6-6 9-6 9z"/></svg>;
  if (v.includes('здоров') || v.includes('idman') || v.includes('sağlıq')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg>;
  if (v.includes('дет') || v.includes('uşaq') || v.includes('körpə')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="7"/><path d="M9 16l-2 5M15 16l2 5"/></svg>;
  if (v.includes('geyim') || v.includes('ayaqqabı') || v.includes('одежд')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg>;
  if (v.includes('gaming') || v.includes('oyun')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M8 10v4"/><circle cx="16" cy="12" r="1"/><circle cx="18" cy="10" r="1"/></svg>;
  if (v.includes('скид') || v.includes('акци') || v.includes('mega')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>;
  if (v.includes('напит') || v.includes('продукт') || v.includes('dükan') || v.includes('meyv')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4h10l-1 9H8L7 4z"/><path d="M10 13v7M14 13v7"/></svg>;
  if (v.includes('kitab') || v.includes('hobbi') || v.includes('книг')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
  if (v.includes('bağ') || v.includes('сад') || v.includes('garden')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12"/><path d="M5 12C5 7 8 4 12 4s7 3 7 8"/></svg>;
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>;
}

// ─── Subcategory Row ──────────────────────────────────────────────────────────

function SubcategoryRow({ child }: { child: Category & { children?: Category[] } }) {
  const [expanded, setExpanded] = useState(false);
  const hasL3 = child.children && child.children.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link
          href={`/shop/products?categoryId=${child.id}`}
          className="text-[12px] font-medium text-[#6B7280] transition-colors hover:text-[#F64FA0]"
        >
          {child.name}
        </Link>
        {hasL3 && (
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="ml-2 flex items-center text-[#D1D5DB] transition-colors hover:text-[#9CA3AF]"
            style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
          >
            <IconChevronRight />
          </button>
        )}
      </div>

      {expanded && hasL3 && (
        <div className="ml-3 mt-1 space-y-1 border-l border-[#E8EAF0] pl-3">
          {child.children!.map((l3) => (
            <Link
              key={l3.id}
              href={`/shop/products?categoryId=${l3.id}`}
              className="block text-[11px] text-[#9CA3AF] transition-colors hover:text-[#F64FA0]"
            >
              {l3.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Category Card ────────────────────────────────────────────────────────────

function CategoryCard({ category }: { category: Category & { children?: Category[] } }) {
  const hasChildren = category.children && category.children.length > 0;
  const icon = getCategoryIcon(category.name ?? '');
  const previewChildren = category.children?.slice(0, 6) ?? [];
  const extraCount = (category.children?.length ?? 0) - previewChildren.length;

  return (
    <div className="bg-white" style={{ border: '1px solid #E8EAF0' }}>
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 p-5 border-b border-[#E8EAF0]">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center text-[#9CA3AF]"
            style={{ background: '#F3F4F6' }}
          >
            {icon}
          </div>
          <div>
            <Link
              href={`/shop/products?categoryId=${category.id}`}
              className="text-[14px] font-bold text-[#1D1D1F] leading-[1.3] transition-colors hover:text-[#F64FA0]"
            >
              {category.name}
            </Link>
            {hasChildren && (
              <div className="mt-0.5 text-[11px] text-[#9CA3AF]">
                {category.children!.length} подкатегорий
              </div>
            )}
          </div>
        </div>
        <Link
          href={`/shop/products?categoryId=${category.id}`}
          className="mt-0.5 shrink-0 text-[#D1D5DB] transition-colors hover:text-[#F64FA0]"
        >
          <IconArrowRight />
        </Link>
      </div>

      {/* Subcategories */}
      {hasChildren && (
        <div className="p-4 space-y-2">
          {previewChildren.map((child) => (
            <SubcategoryRow
              key={child.id}
              child={child as Category & { children?: Category[] }}
            />
          ))}
          {extraCount > 0 && (
            <Link
              href={`/shop/products?categoryId=${category.id}`}
              className="block text-[11px] font-semibold tracking-wide transition-colors"
              style={{ color: '#F64FA0' }}
            >
              +{extraCount} ещё →
            </Link>
          )}
        </div>
      )}

      {!hasChildren && (
        <div className="px-5 py-4">
          <Link
            href={`/shop/products?categoryId=${category.id}`}
            className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide transition-colors"
            style={{ color: '#F64FA0' }}
          >
            Смотреть товары
            <IconArrowRight />
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CategoriesSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#EFEFEF', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="bg-white p-6" style={{ border: '1px solid #E8EAF0' }}>
          <div className="h-7 w-40 animate-pulse bg-[#E8EAF0]" />
        </div>
        <div className="mt-4 grid gap-[1px] bg-[#E8EAF0] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse bg-[#E8EAF0]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse bg-[#E8EAF0]" />
                  <div className="h-3 w-1/2 animate-pulse bg-[#F3F4F6]" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-3 w-full animate-pulse bg-[#F3F4F6]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getCategories(),
  });

  const treeCategories = useMemo(() => {
    const flat = data ?? [];
    return buildTree(flat);
  }, [data]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return treeCategories;
    const q = search.toLowerCase();
    return treeCategories.filter((cat) => {
      if (cat.name?.toLowerCase().includes(q)) return true;
      if (cat.children?.some((ch) => ch.name?.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [treeCategories, search]);

  if (isLoading) return <CategoriesSkeleton />;

  const pageStyle = { background: '#EFEFEF', fontFamily: "'Inter', system-ui, sans-serif" } as const;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={pageStyle}>
        <div className="bg-white p-10 text-center w-full max-w-sm" style={{ border: '1px solid #E8EAF0' }}>
          <div className="text-[15px] font-semibold text-[#1D1D1F]">Ошибка загрузки</div>
          <p className="mt-2 text-[13px] text-[#9CA3AF]">Не удалось загрузить категории</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={pageStyle}>
      <div className="mx-auto max-w-[1400px] px-6 py-6">

        {/* Header */}
        <div className="bg-white px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" style={{ border: '1px solid #E8EAF0' }}>
          <div>
            <h1 className="text-[22px] font-bold text-[#1D1D1F]" style={{ letterSpacing: '-0.02em' }}>
              Все категории
            </h1>
            <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
              {treeCategories.length} категорий
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-[280px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
              <IconSearch />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск категории..."
              className="h-10 w-full border border-[#E8EAF0] bg-[#FAFAFA] pl-9 pr-4 text-[13px] text-[#1D1D1F] outline-none transition-colors focus:border-[#1D1D1F] placeholder:text-[#9CA3AF]"
              style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
            />
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="mt-3 flex items-center gap-1.5 text-[11px] tracking-wide text-[#9CA3AF]">
          <Link href="/" className="transition-colors hover:text-[#1D1D1F]">Главная</Link>
          <IconChevronRight />
          <span className="font-semibold text-[#1D1D1F]">Категории</span>
        </div>

        {/* Grid */}
        {filteredCategories.length === 0 ? (
          <div className="mt-4 bg-white px-6 py-16 text-center" style={{ border: '1px solid #E8EAF0' }}>
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center"
              style={{ background: '#F3F4F6' }}
            >
              <IconSearch />
            </div>
            <p className="text-[15px] font-semibold text-[#1D1D1F]">
              {search ? 'Категория не найдена' : 'Категории не найдены'}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-3 text-[12px] font-semibold transition-colors"
                style={{ color: '#F64FA0' }}
              >
                Сбросить поиск
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-[1px] bg-[#E8EAF0] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category as Category & { children?: Category[] }}
              />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-6 bg-white px-6 py-5 flex items-center justify-between" style={{ border: '1px solid #E8EAF0' }}>
          <div>
            <div className="text-[14px] font-bold text-[#1D1D1F]">Не нашли нужный товар?</div>
            <div className="mt-0.5 text-[12px] text-[#9CA3AF]">Воспользуйтесь поиском по всему каталогу</div>
          </div>
          <Link
            href="/shop/products"
            className="flex h-10 items-center gap-2 px-5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#1D1D1F' }}
          >
            Весь каталог
            <IconArrowRight />
          </Link>
        </div>

      </div>
    </div>
  );
}