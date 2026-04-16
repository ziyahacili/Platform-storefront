'use client';

import Link from 'next/link';
import Image from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ProductGrid } from '@/components/product/product-grid';
import { categoriesAPI } from '@/lib/api/categories';
import { cartAPI } from '@/lib/api/cart';
import { useAuth } from '@/contexts/auth-context';
import type { Category } from '@/types/category';
import type { Cart } from '@/types/cart';

// ─── Tree builder ─────────────────────────────────────────────────────────────

function buildTree(flat: Category[]): Category[] {
  const map = new Map<string, Category & { children: Category[] }>();

  flat.forEach((c) => {
    map.set(c.id, { ...c, children: [] });
  });

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAzn(value: number) {
  if (!Number.isFinite(value)) return '0.00 ₼';
  return `${value.toFixed(2)} ₼`;
}

function getCartItems(cart: Cart | null) {
  const raw = (cart as any)?.items ?? (cart as any)?.cartItems ?? (cart as any)?.products ?? [];
  return Array.isArray(raw) ? raw : [];
}

function getCartCount(cart: Cart | null) {
  return getCartItems(cart).length;
}

function getCartTotalFromCart(cart: Cart | null) {
  const total = (cart as any)?.total ?? (cart as any)?.priceTotal ?? (cart as any)?.sum;
  const numeric = Number(total);
  return Number.isFinite(numeric) ? numeric : null;
}

function getCartItemImage(item: any) {
  return (
    item?.imageUrls?.[0] ||
    item?.imageUrl ||
    item?.image ||
    item?.thumbnail ||
    item?.product?.imageUrls?.[0] ||
    item?.product?.images?.[0] ||
    item?.product?.imageUrl ||
    item?.product?.image ||
    item?.product?.thumbnail ||
    item?.product?.photos?.[0] ||
    ''
  );
}

function getCartItemTitle(item: any) {
  return (
    item?.productName ||
    item?.product?.name ||
    item?.product?.title ||
    item?.name ||
    item?.title ||
    'Product'
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function IconCart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconTruck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3h15v13H1z" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function IconPercent() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

function IconCard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z" />
    </svg>
  );
}

// ─── Category Icons ───────────────────────────────────────────────────────────

function getCategoryIcon(name: string) {
  const v = name.toLowerCase();

  if (v.includes('дом') || v.includes('home') || v.includes('ev')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    );
  }

  if (v.includes('телефон') || v.includes('mob') || v.includes('telefon')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2.5" width="10" height="19" rx="2" />
        <path d="M10 18h4" />
      </svg>
    );
  }

  if (v.includes('ноут') || v.includes('комп') || v.includes('kompüt')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="5" width="16" height="10" rx="1" />
        <path d="M2 19h20" />
      </svg>
    );
  }

  if (v.includes('быт') || v.includes('техника') || v.includes('texnika')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 7h8M8 12h8" />
      </svg>
    );
  }

  if (v.includes('тв') || v.includes('tv') || v.includes('video') || v.includes('foto')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M8 21h8" />
      </svg>
    );
  }

  if (v.includes('авто') || v.includes('avtomobil')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13l2-5h14l2 5" />
        <path d="M5 13v4h14v-4" />
        <circle cx="7" cy="17" r="1.5" />
        <circle cx="17" cy="17" r="1.5" />
      </svg>
    );
  }

  if (v.includes('красот') || v.includes('beauty') || v.includes('gözəl')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s-6-3-6-9a4 4 0 0 1 6-3.46A4 4 0 0 1 18 13c0 6-6 9-6 9z" />
      </svg>
    );
  }

  if (v.includes('здоров') || v.includes('idman') || v.includes('sağlıq')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" />
      </svg>
    );
  }

  if (v.includes('дет') || v.includes('uşaq') || v.includes('körpə')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="7" />
        <path d="M9 16l-2 5M15 16l2 5" />
      </svg>
    );
  }

  if (v.includes('geyim') || v.includes('ayaqqabı') || v.includes('одежд')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z" />
      </svg>
    );
  }

  if (v.includes('gaming') || v.includes('oyun')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 12h4M8 10v4" />
        <circle cx="16" cy="12" r="1" />
        <circle cx="18" cy="10" r="1" />
      </svg>
    );
  }

  if (v.includes('скид') || v.includes('акци') || v.includes('mega')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="5" x2="5" y2="19" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </svg>
    );
  }

  if (v.includes('напит') || v.includes('продукт') || v.includes('dükan') || v.includes('meyv')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4h10l-1 9H8L7 4z" />
        <path d="M10 13v7M14 13v7" />
      </svg>
    );
  }

  if (v.includes('bağ') || v.includes('сад') || v.includes('garden')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12" />
        <path d="M5 12C5 7 8 4 12 4s7 3 7 8" />
      </svg>
    );
  }

  if (v.includes('kitab') || v.includes('hobbi') || v.includes('книг')) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    );
  }

  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

// ─── Hero Slides ──────────────────────────────────────────────────────────────

interface HeroSlide {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  videoUrl: string;
  videoAlt: string;
  accent?: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    eyebrow: 'Today customization',
    title: 'Design a bag that feels made for you',
    subtitle:
      'Upload your image, choose your finish, preview it in real time, and turn one idea into a product people want to buy.',
    ctaLabel: 'Start customizing',
    ctaHref: '/custom-designer',
    videoUrl: '/bag-video.mp4',
    videoAlt: 'Custom bag design hero',
    accent: '#F64FA0',
  },
  {
    eyebrow: 'Marketplace bestsellers',
    title: 'Products that move fast and convert better',
    subtitle:
      'Curated offers, strong visuals, and clear value — built for shoppers who want the right product without the friction.',
    ctaLabel: 'Shop trending products',
    ctaHref: '/shop/products',
    videoUrl: '/bag-video.mp4',
    videoAlt: 'Marketplace products hero',
    accent: '#1D1D1F',
  },
  {
    eyebrow: 'Smart shopping',
    title: 'Deals, delivery, and installment in one place',
    subtitle:
      'Make the purchase decision easier with a simple promise: trusted sellers, flexible payment, and fast delivery.',
    ctaLabel: 'Explore today’s offers',
    ctaHref: '/shop/products?discountOnly=1',
    videoUrl: '/bag-video.mp4',
    videoAlt: 'Marketplace deals hero',
    accent: '#7C3AED',
  },
];

// ─── Mega Menu ────────────────────────────────────────────────────────────────

function MegaMenu({ category, onClose }: { category: Category; onClose: () => void }) {
  const [activeL1, setActiveL1] = useState<Category | null>(category.children?.[0] ?? null);
  const [activeL2, setActiveL2] = useState<Category | null>(null);

  const l1Items = category.children ?? [];
  const l2Items = activeL1?.children ?? [];
  const l3Items = activeL2?.children ?? [];

  return (
    <div
      className="absolute top-0 left-full z-50 flex bg-white"
      style={{ minWidth: 600, border: '1px solid #E8EAF0', boxShadow: '4px 4px 0 0 rgba(0,0,0,0.04)' }}
      onMouseLeave={onClose}
    >
      <div className="w-[200px] border-r border-[#E8EAF0] py-2">
        <div className="px-4 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
          {category.name}
        </div>

        {l1Items.map((l1) => (
          <div
            key={l1.id}
            className="flex cursor-pointer items-center justify-between px-4 py-2 transition-colors"
            style={{ background: activeL1?.id === l1.id ? '#F9FAFB' : 'transparent' }}
            onMouseEnter={() => {
              setActiveL1(l1);
              setActiveL2(null);
            }}
          >
            <Link
              href={`/shop/products?categoryId=${l1.id}`}
              className="flex-1 truncate text-[13px] font-medium transition-colors hover:text-[#F64FA0]"
              style={{ color: activeL1?.id === l1.id ? '#F64FA0' : '#1D1D1F' }}
              onClick={onClose}
            >
              {l1.name}
            </Link>
            {l1.children && l1.children.length > 0 && (
              <span className="ml-1 shrink-0 text-[#9CA3AF]">
                <IconChevronRight />
              </span>
            )}
          </div>
        ))}
      </div>

      {l2Items.length > 0 && (
        <div className="w-[200px] border-r border-[#E8EAF0] py-2">
          <div className="px-4 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
            {activeL1?.name}
          </div>

          {l2Items.map((l2) => (
            <div
              key={l2.id}
              className="flex cursor-pointer items-center justify-between px-4 py-2 transition-colors"
              style={{ background: activeL2?.id === l2.id ? '#F9FAFB' : 'transparent' }}
              onMouseEnter={() => setActiveL2(l2)}
            >
              <Link
                href={`/shop/products?categoryId=${l2.id}`}
                className="flex-1 truncate text-[13px] font-medium transition-colors"
                style={{ color: activeL2?.id === l2.id ? '#F64FA0' : '#1D1D1F' }}
                onClick={onClose}
              >
                {l2.name}
              </Link>
              {l2.children && l2.children.length > 0 && (
                <span className="ml-1 shrink-0 text-[#9CA3AF]">
                  <IconChevronRight />
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {l3Items.length > 0 && (
        <div className="w-[200px] py-2">
          <div className="px-4 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
            {activeL2?.name}
          </div>

          {l3Items.map((l3) => (
            <Link
              key={l3.id}
              href={`/shop/products?categoryId=${l3.id}`}
              className="block px-4 py-2 text-[13px] text-[#1D1D1F] transition-colors hover:bg-[#F9FAFB] hover:text-[#F64FA0]"
              onClick={onClose}
            >
              {l3.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Category Item ────────────────────────────────────────────────────────────

function CategoryItem({ category }: { category: Category }) {
  const name = category.name ?? 'Category';
  const icon = getCategoryIcon(name);
  const hasChildren = category.children && category.children.length > 0;
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" onMouseEnter={() => hasChildren && setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Link
        href={`/shop/products?categoryId=${encodeURIComponent(category.id)}`}
        className="group flex items-center gap-2.5 px-4 py-2.5 transition-colors"
        style={{ background: open ? '#F9FAFB' : 'transparent' }}
      >
        <span
          className="flex h-[18px] w-[18px] shrink-0 items-center justify-center transition-colors"
          style={{ color: open ? '#F64FA0' : '#9CA3AF' }}
        >
          {icon}
        </span>
        <span
          className="flex-1 truncate text-[13px] font-medium leading-[18px] transition-colors"
          style={{ color: open ? '#F64FA0' : '#1D1D1F' }}
        >
          {name}
        </span>
        {hasChildren && (
          <span className="shrink-0 transition-colors" style={{ color: open ? '#F64FA0' : '#D1D5DB' }}>
            <IconChevronRight />
          </span>
        )}
      </Link>

      {hasChildren && open && (
        <div className="absolute left-full z-50" style={{ top: 0 }}>
          <MegaMenu category={category} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

// ─── Categories Sidebar ───────────────────────────────────────────────────────

function CategoriesSidebar({ categories }: { categories: Category[] }) {
  const visibleCategories = useMemo(
    () => categories.filter((c) => c.isVisible !== false).slice(0, 13),
    [categories]
  );

  return (
    <aside
      className="relative h-full bg-white py-2"
      style={{ border: '1px solid #E8EAF0' }}
    >
      <div className="px-4 pb-2 pt-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">Категории</span>
      </div>

      <div>
        {visibleCategories.map((category) => (
          <CategoryItem key={category.id} category={category} />
        ))}
      </div>

      <div className="mx-4 mt-1 border-t border-[#E8EAF0] pt-2">
        <Link
          href="/shop/categories"
          className="flex items-center gap-2 py-2 text-[12px] font-semibold tracking-wide transition-colors"
          style={{ color: '#F64FA0' }}
        >
          <span>Все категории</span>
          <IconArrowRight />
        </Link>
      </div>
    </aside>
  );
}

// ─── Hero Carousel ────────────────────────────────────────────────────────────

function Carousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  if (!slides.length) return null;

  const slide = slides[index];

  return (
    <div className="relative h-full overflow-hidden" style={{ border: '1px solid #E8EAF0' }}>
      <div className="relative h-[340px] w-full overflow-hidden sm:h-[400px] lg:h-full lg:min-h-[520px]">
        <video
          src={slide.videoUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
          aria-label={slide.videoAlt}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(18,18,18,0.78) 0%, rgba(18,18,18,0.52) 42%, rgba(18,18,18,0.08) 72%, transparent 100%)',
          }}
        />

        <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-10">
          <div className="max-w-[440px]">
            <div className="mb-4 flex items-center gap-2">
              <span
                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white"
                style={{ background: slide.accent || '#F64FA0' }}
              >
                <IconSparkle />
                {slide.eyebrow}
              </span>
            </div>

            <h2
              className="text-[30px] font-bold leading-[1.15] text-white sm:text-[36px]"
              style={{ letterSpacing: '-0.025em' }}
            >
              {slide.title}
            </h2>

            <p className="mt-3 text-[13px] leading-[1.7] text-white/75" style={{ maxWidth: 340 }}>
              {slide.subtitle}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={slide.ctaHref}
                className="inline-flex h-11 items-center gap-2 px-6 text-[13px] font-bold tracking-wide text-white transition-opacity hover:opacity-90"
                style={{ background: slide.accent || '#F64FA0' }}
              >
                {slide.ctaLabel}
                <IconArrowRight />
              </Link>

              <Link
                href="/shop/products"
                className="inline-flex h-11 items-center px-5 text-[12px] font-semibold tracking-wide text-white/80 transition-colors hover:text-white"
                style={{ border: '1px solid rgba(255,255,255,0.2)' }}
              >
                Browse marketplace
              </Link>
            </div>
          </div>
        </div>

        {slides.length > 1 && (
          <>
            <div className="absolute right-5 top-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIndex((prev) => (prev - 1 + slides.length) % slides.length)}
                className="flex h-8 w-8 items-center justify-center bg-white/20 text-white backdrop-blur transition hover:bg-white/35"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setIndex((prev) => (prev + 1) % slides.length)}
                className="flex h-8 w-8 items-center justify-center bg-white/20 text-white backdrop-blur transition hover:bg-white/35"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>

            <div className="absolute bottom-5 right-5 flex items-center gap-1.5">
              {slides.map((_, dotIndex) => (
                <button
                  key={dotIndex}
                  type="button"
                  onClick={() => setIndex(dotIndex)}
                  className="transition-all"
                  style={{
                    height: 6,
                    width: dotIndex === index ? 24 : 6,
                    background: dotIndex === index ? '#F64FA0' : 'rgba(255,255,255,0.5)',
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Side Banners ─────────────────────────────────────────────────────────────

function SideBannerCard({
  banner,
}: {
  banner: {
    id: string;
    title: string;
    subtitle?: string;
    link?: string;
    imageUrl: string;
  };
}) {
  return (
    <a
      href={banner.link || '/shop/products'}
      className="group block overflow-hidden transition-opacity hover:opacity-90"
      style={{ border: '1px solid #E8EAF0' }}
    >
      <div className="relative h-[116px]">
        <img src={banner.imageUrl} alt={banner.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/5 to-transparent" />
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2">
          <div className="text-[13px] font-bold leading-[1.3] text-white">{banner.title}</div>
          {banner.subtitle && (
            <div className="mt-0.5 text-[11px] leading-[1.4] text-white/80">{banner.subtitle}</div>
          )}
        </div>
      </div>
    </a>
  );
}

/**
 * Compact side-column Custom Designer promo card.
 * Mirrors the main hero banner in tone but fits the 200px column.
 */
function CustomDesignerSideCard() {
  return (
    <Link
      href="/custom-designer"
      className="group relative block overflow-hidden transition-opacity hover:opacity-95"
      style={{ border: '1px solid #1D1D1F', background: '#1D1D1F', minHeight: 116 }}
    >
      <div className="flex h-full flex-col justify-between p-4" style={{ minHeight: 116 }}>
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: '#F64FA0' }}>
            <IconSparkle />
            3D Studio
          </div>
          <div className="mt-1.5 text-[14px] font-bold leading-[1.25] text-white" style={{ letterSpacing: '-0.01em' }}>
            Design Your<br />Own Bag
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-white/60 transition-colors group-hover:text-white/90">
          Start for free <IconArrowRight />
        </div>
      </div>
    </Link>
  );
}

function FallbackSideCard({ title, sub, accent }: { title: string; sub: string; accent: boolean }) {
  return (
    <Link
      href="/shop/products"
      className="flex flex-col justify-between p-4 transition-opacity hover:opacity-90"
      style={{
        background: accent ? '#F64FA0' : 'white',
        border: accent ? '1px solid #F64FA0' : '1px solid #E8EAF0',
        minHeight: 116,
      }}
    >
      <span className="text-[13px] font-bold leading-[1.3]" style={{ color: accent ? 'white' : '#1D1D1F' }}>
        {title}
      </span>
      <span className="text-[11px] font-semibold tracking-wide" style={{ color: accent ? 'rgba(255,255,255,0.7)' : '#9CA3AF' }}>
        {sub}
      </span>
    </Link>
  );
}

// ─── Cart Summary Banner ──────────────────────────────────────────────────────

function CartSummaryBanner({
  cart,
  totalFromApi,
  loading,
}: {
  cart: Cart | null;
  totalFromApi: number | null;
  loading: boolean;
}) {
  const [closed, setClosed] = useState(false);

  const items = getCartItems(cart);
  const count = getCartCount(cart);
  const totalFromCart = getCartTotalFromCart(cart);
  const total = totalFromApi ?? totalFromCart ?? 0;
  const previewItems = items.slice(0, 3);

  if (loading) return null;
  if (count === 0) return null;
  if (closed) return null;

  return (
    <div className="mb-4 bg-white" style={{ border: '1px solid #E8EAF0' }}>
      <div className="flex flex-col gap-0 lg:flex-row lg:items-stretch">
        <div className="flex items-center gap-4 px-5 py-4 lg:w-[300px] lg:border-r lg:border-[#E8EAF0]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center text-white" style={{ background: '#1D1D1F' }}>
            <IconCart />
          </div>
          <div>
            <div className="text-[13px] font-bold text-[#1D1D1F]">
              В корзине {count} {count === 1 ? 'товар' : count >= 2 && count <= 4 ? 'товара' : 'товаров'}
            </div>
            <div className="mt-0.5 text-[12px] text-[#9CA3AF]">
              Сумма: <span className="font-semibold text-[#1D1D1F]">{formatAzn(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3 px-5 py-4">
          {previewItems.map((item: any, index: number) => {
            const imageUrl = getCartItemImage(item);
            const title = getCartItemTitle(item);
            const quantity = Number(item?.quantity ?? item?.qty ?? 1);

            return (
              <div
                key={item?.id ?? item?.cartItemId ?? `${title}-${index}`}
                className="relative h-[56px] w-[44px] shrink-0 overflow-hidden bg-white"
                style={{ border: '1px solid #E8EAF0' }}
                title={`${title}${quantity > 1 ? ` × ${quantity}` : ''}`}
              >
                {imageUrl ? (
                  <Image src={imageUrl} alt={title} fill unoptimized className="object-contain p-1" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#F9FAFB] text-[9px] text-[#9CA3AF]">—</div>
                )}

                {quantity > 1 && (
                  <div
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center text-[9px] font-bold text-white"
                    style={{ background: '#F64FA0' }}
                  >
                    {quantity}
                  </div>
                )}
              </div>
            );
          })}
          {count > 3 && <div className="text-[12px] font-medium text-[#9CA3AF]">+{count - 3} ещё</div>}
        </div>

        <div className="flex items-center gap-3 border-t border-[#E8EAF0] px-5 py-4 lg:border-l lg:border-t-0">
          <Link
            href="/cart"
            className="flex h-10 items-center border border-[#E8EAF0] px-5 text-[12px] font-semibold text-[#1D1D1F] transition-colors hover:border-[#1D1D1F]"
          >
            В корзину
          </Link>
          <Link
            href="/checkout"
            className="flex h-10 items-center px-5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#1D1D1F' }}
          >
            Оформить заказ
          </Link>
          <button
            type="button"
            onClick={() => setClosed(true)}
            className="flex h-8 w-8 items-center justify-center text-[#9CA3AF] transition-colors hover:text-[#1D1D1F]"
            aria-label="Закрыть"
          >
            <IconClose />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Trust Strip ──────────────────────────────────────────────────────────────

function TrustStrip() {
  const items = [
    { icon: <IconTruck />, title: 'Бесплатная доставка', sub: 'от 50 ₼' },
    { icon: <IconPercent />, title: 'Скидки и акции', sub: 'каждый день' },
    { icon: <IconCard />, title: 'Рассрочка 24 мес.', sub: 'Birbank' },
    { icon: <IconShield />, title: 'Гарантия качества', sub: 'официальные продавцы' },
  ];

  return (
    <div className="grid grid-cols-2 gap-[1px] bg-[#E8EAF0] sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.title} className="flex items-center gap-3 bg-white px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center text-[#9CA3AF]" style={{ background: '#F3F4F6' }}>
            {item.icon}
          </div>
          <div>
            <div className="text-[12px] font-semibold text-[#1D1D1F]">{item.title}</div>
            <div className="text-[11px] text-[#9CA3AF]">{item.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-[20px] font-bold text-[#1D1D1F]" style={{ letterSpacing: '-0.02em' }}>
        {title}
      </h2>
      <Link href={href} className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide transition-colors" style={{ color: '#F64FA0' }}>
        Все товары <IconArrowRight />
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [rawCategories, setRawCategories] = useState<Category[]>([]);

  const { data: cart, isLoading: cartLoading } = useQuery({
    queryKey: ['cart', user?.userId],
    queryFn: () => cartAPI.getCart(),
    enabled: !authLoading && !!user,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  const { data: cartTotalData, isLoading: totalLoading } = useQuery({
    queryKey: ['cart-total', user?.userId],
    queryFn: () => cartAPI.getTotal(),
    enabled: !authLoading && !!user,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    let alive = true;

    categoriesAPI.getCategories().then((data) => {
      if (alive) setRawCategories(data);
    });

    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(() => buildTree(rawCategories), [rawCategories]);
  const cartTotal = cartTotalData?.total ?? null;
  const isCartBannerLoading = authLoading || cartLoading || totalLoading;

  return (
    <div className="min-h-screen text-[#1D1D1F]" style={{ background: '#EFEFEF', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <main className="mx-auto max-w-[1500px] px-6 py-5">
        {user && (
          <CartSummaryBanner
            cart={(cart as Cart) ?? null}
            totalFromApi={cartTotal}
            loading={isCartBannerLoading}
          />
        )}

        {/* ── Hero grid ── */}
        <section className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_200px] lg:items-stretch">
          {/* Left: categories */}
          <CategoriesSidebar categories={categories} />

          {/* Centre: hero carousel + trust strip */}
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="flex-1 min-h-0">
              <Carousel slides={HERO_SLIDES} />
            </div>
            <TrustStrip />
          </div>

          {/* Right: side promo column */}
          <div className="flex h-full flex-col gap-3">
            <CustomDesignerSideCard />
            <FallbackSideCard title="Скидки до 50%" sub="Акция действует" accent={true} />
            <FallbackSideCard title="Рассрочка 0%" sub="Birbank · 24 мес." accent={false} />
          </div>
        </section>

        {/* ── Popular products ── */}
        <section className="mt-6">
          <SectionHeader title="Популярные товары" href="/shop/products" />
          <ProductGrid />
        </section>

        {/* ── Category quick-links ── */}
        {categories.length > 0 && (
          <section className="mt-6">
            <SectionHeader title="Все категории" href="/shop/categories" />
            <div className="grid grid-cols-2 gap-[1px] bg-[#E8EAF0] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {categories.slice(0, 12).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/shop/products?categoryId=${encodeURIComponent(cat.id)}`}
                  className="flex items-center gap-3 bg-white px-4 py-4 transition-colors hover:bg-[#F9FAFB]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[#9CA3AF]" style={{ background: '#F3F4F6' }}>
                    {getCategoryIcon(cat.name ?? '')}
                  </span>
                  <span className="truncate text-[12px] font-medium text-[#1D1D1F]">{cat.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Bottom CTA strip ── */}
        <section className="mt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/custom-designer"
              className="relative overflow-hidden p-6 transition-opacity hover:opacity-95 sm:col-span-1"
              style={{ background: '#F64FA0', border: '1px solid #F64FA0' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">
                3D Bag Studio
              </div>
              <div className="mt-2 text-[20px] font-bold leading-[1.2] text-white" style={{ letterSpacing: '-0.02em' }}>
                Make It<br />Yours
              </div>
              <p className="mt-2 text-[12px] leading-[1.6] text-white/70">
                Upload your image. Pick your finish. Done.
              </p>
              <div className="mt-4 flex items-center gap-2 text-[12px] font-bold text-white">
                Start Designing <IconArrowRight />
              </div>
            </Link>

            <Link
              href="/shop/products?discountOnly=1"
              className="relative overflow-hidden p-6 transition-opacity hover:opacity-95"
              style={{ background: '#1D1D1F', border: '1px solid #1D1D1F' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                Только сейчас
              </div>
              <div className="mt-2 text-[20px] font-bold leading-[1.2] text-white" style={{ letterSpacing: '-0.02em' }}>
                Товары со скидкой
              </div>
              <div className="mt-4 flex items-center gap-2 text-[12px] font-semibold tracking-wide" style={{ color: '#F64FA0' }}>
                Смотреть все <IconArrowRight />
              </div>
            </Link>

            <Link
              href="/shop/products"
              className="relative overflow-hidden p-6 transition-opacity hover:opacity-95"
              style={{ background: 'white', border: '1px solid #E8EAF0' }}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
                Birbank · 0%
              </div>
              <div className="mt-2 text-[20px] font-bold leading-[1.2] text-[#1D1D1F]" style={{ letterSpacing: '-0.02em' }}>
                Рассрочка<br />до 24 мес.
              </div>
              <div className="mt-4 flex items-center gap-2 text-[12px] font-semibold tracking-wide text-[#1D1D1F]">
                Выбрать товар <IconArrowRight />
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}