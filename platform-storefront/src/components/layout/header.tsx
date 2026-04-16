'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { cartAPI } from '@/lib/api/cart';
import { categoriesAPI } from '@/lib/api/categories';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import type { Category } from '@/types/category';

type AuthUser = {
  userId?: string;
  name?: string;
  surname?: string;
  email?: string;
  role?: string;
};

type LanguageCode = 'ru' | 'az';

const LANGUAGE_OPTIONS: Array<{ code: LanguageCode; label: string; short: string; flag: string }> = [
  { code: 'ru', label: 'Русский', short: 'RU', flag: '🇷🇺' },
  { code: 'az', label: 'Azərbaycanca', short: 'AZ', flag: '🇦🇿' },
];

// ─── Mega Menu (3-level) ─────────────────────────────────────────────────────

function MegaMenu({ category, onClose }: { category: Category; onClose: () => void }) {
  const [activeL1, setActiveL1] = useState<Category | null>(category.children?.[0] ?? null);
  const [activeL2, setActiveL2] = useState<Category | null>(null);

  const l1Items = category.children ?? [];
  const l2Items = activeL1?.children ?? [];
  const l3Items = activeL2?.children ?? [];

  return (
    <div
      className="absolute left-full top-0 z-50 flex border border-[#E8EAF0] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.10)]"
      style={{ minWidth: 560, minHeight: 360 }}
      onMouseLeave={onClose}
    >
      {/* L1 */}
      <div className="w-[200px] border-r border-[#F0F2F7] py-2">
        {l1Items.map((l1) => (
          <div
            key={l1.id}
            className={cn(
              'flex cursor-pointer items-center justify-between px-4 py-[9px] text-[13px] transition-colors',
              activeL1?.id === l1.id
                ? 'bg-[#F7F8FC] text-[#F64FA0]'
                : 'text-[#2D2D2F] hover:bg-[#F7F8FC] hover:text-[#F64FA0]'
            )}
            onMouseEnter={() => { setActiveL1(l1); setActiveL2(null); }}
          >
            <Link href={`/shop/products?categoryId=${l1.id}`} className="flex-1 font-medium" onClick={onClose}>
              {l1.name}
            </Link>
            {(l1.children?.length ?? 0) > 0 && (
              <span className="ml-1 text-[10px] text-[#C0C4D6]">›</span>
            )}
          </div>
        ))}
      </div>

      {/* L2 */}
      {l2Items.length > 0 && (
        <div className="w-[200px] border-r border-[#F0F2F7] py-2">
          {l2Items.map((l2) => (
            <div
              key={l2.id}
              className={cn(
                'flex cursor-pointer items-center justify-between px-4 py-[9px] text-[13px] transition-colors',
                activeL2?.id === l2.id
                  ? 'bg-[#F7F8FC] text-[#F64FA0]'
                  : 'text-[#2D2D2F] hover:bg-[#F7F8FC] hover:text-[#F64FA0]'
              )}
              onMouseEnter={() => setActiveL2(l2)}
            >
              <Link href={`/shop/products?categoryId=${l2.id}`} className="flex-1" onClick={onClose}>
                {l2.name}
              </Link>
              {(l2.children?.length ?? 0) > 0 && (
                <span className="ml-1 text-[10px] text-[#C0C4D6]">›</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* L3 */}
      {l3Items.length > 0 && (
        <div className="w-[200px] py-2">
          {l3Items.map((l3) => (
            <Link
              key={l3.id}
              href={`/shop/products?categoryId=${l3.id}`}
              className="block px-4 py-[9px] text-[13px] text-[#2D2D2F] transition-colors hover:bg-[#F7F8FC] hover:text-[#F64FA0]"
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

function CategorySideItem({ category }: { category: Category }) {
  const hasChildren = (category.children?.length ?? 0) > 0;
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => hasChildren && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={`/shop/products?categoryId=${encodeURIComponent(category.id)}`}
        className={cn(
          'flex items-center justify-between px-4 py-[9px] text-[13px] font-medium transition-colors',
          open ? 'bg-[#F7F8FC] text-[#F64FA0]' : 'text-[#2D2D2F] hover:bg-[#F7F8FC] hover:text-[#F64FA0]'
        )}
      >
        <span>{category.name}</span>
        {hasChildren && <span className="text-[10px] text-[#C0C4D6]">›</span>}
      </Link>
      {hasChildren && open && (
        <MegaMenu category={category} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

// ─── Dropdown helper ────────────────────────────────────────────────────────

function DropdownLink({ href, label, icon, onClick }: {
  href: string; label: string; icon: React.ReactNode; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-[9px] text-[13px] text-[#1D1D1F] transition hover:bg-[#F7F8FB]"
    >
      <span className="shrink-0 text-[#ABABAB]">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuth() as { user?: AuthUser | null; logout?: () => Promise<void> | void };

  const [search, setSearch] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>('ru');

  const catalogRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = Boolean(user?.userId || user?.email);
  const currentLanguage = LANGUAGE_OPTIONS.find((o) => o.code === language) ?? LANGUAGE_OPTIONS[0];

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => { try { return await cartAPI.getCart(); } catch { return null; } },
    enabled: isAuthenticated,
    staleTime: 30_000,
    retry: false,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', 'header'],
    queryFn: async () => {
      try {
        const data = await categoriesAPI.getCategories();
        return Array.isArray(data) ? data : [];
      } catch { return []; }
    },
    staleTime: 60_000,
    retry: false,
  });

  // Build tree
  const categoryTree = useMemo(() => {
    const flat = categories ?? [];
    const map = new Map<string, Category & { children: Category[] }>();
    flat.forEach((c) => map.set(c.id, { ...c, children: [] }));
    const roots: Category[] = [];
    map.forEach((node) => {
      if (node.parentCategoryId && map.has(node.parentCategoryId)) {
        map.get(node.parentCategoryId)!.children.push(node);
      } else if (!node.parentCategoryId) roots.push(node);
    });
    return roots;
  }, [categories]);

  const visibleCategories = useMemo(() => categoryTree.slice(0, 14), [categoryTree]);
  const itemCount = (cart as any)?.items?.reduce((s: number, i: any) => s + (i.quantity ?? 0), 0) ?? 0;

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('birmarket-language') as LanguageCode : null;
    if (saved === 'ru' || saved === 'az') setLanguage(saved);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('birmarket-language', language);
    if (typeof document !== 'undefined') document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (catalogRef.current && !catalogRef.current.contains(t)) setCatalogOpen(false);
      if (accountRef.current && !accountRef.current.contains(t)) setAccountOpen(false);
      if (languageRef.current && !languageRef.current.contains(t)) setLanguageOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setCatalogOpen(false); setAccountOpen(false); setLanguageOpen(false); }
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClickOutside); document.removeEventListener('keydown', onKey); };
  }, []);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    router.push(`/shop/products?query=${encodeURIComponent(q)}`);
    setCatalogOpen(false); setAccountOpen(false); setLanguageOpen(false);
  };

  const handleLogout = async () => {
    try { await logout?.(); setAccountOpen(false); router.push('/'); } catch { setAccountOpen(false); }
  };

  return (
    <header className="sticky top-0 z-[200] bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Top bar ── */}
      <div className="border-b border-[#EFEFEF] bg-white">
        <div className="mx-auto flex h-[28px] max-w-[1440px] items-center justify-between px-6 text-[11px] text-[#888888] lg:px-8">
          <div className="flex items-center gap-4">
            {['Доставка', 'Оплата', 'Гарантия', 'Возврат'].map((item) => (
              <button key={item} type="button" className="transition hover:text-[#1D1D1F]">{item}</button>
            ))}
            <button
              type="button"
              className="bg-[#1D1D1F] px-2.5 py-[2px] text-[10px] font-semibold text-white tracking-wide hover:bg-black"
              style={{ letterSpacing: '0.04em' }}
            >
              ПРОДАВАЙТЕ У НАС
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Phone */}
            <span className="flex items-center gap-1 text-[#888888]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.89.32 1.75.59 2.58a2 2 0 0 1-.45 2.11L8 9a16 16 0 0 0 6 6l.59-.2a2 2 0 0 1 2.11-.45c.83.27 1.69.47 2.58.59A2 2 0 0 1 22 16.92Z" />
              </svg>
              915
            </span>

            {/* Language */}
            <div className="relative" ref={languageRef}>
              <button
                type="button"
                onClick={() => { setLanguageOpen((p) => !p); setAccountOpen(false); setCatalogOpen(false); }}
                className="flex items-center gap-1 text-[11px] text-[#888888] hover:text-[#1D1D1F]"
              >
                <span>{currentLanguage.flag}</span>
                <span className="font-medium">{currentLanguage.short}</span>
                <span className={cn('text-[9px] transition-transform', languageOpen ? 'rotate-180' : '')}>▾</span>
              </button>

              <div className={cn(
                'absolute right-0 top-[calc(100%+4px)] z-[3000] w-[160px] border border-[#E8EAF0] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.10)] origin-top-right transition-all duration-150',
                languageOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
              )}>
                <div className="border-b border-[#F0F2F7] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#888888]">Язык</div>
                <div className="py-1">
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => { setLanguage(opt.code); setLanguageOpen(false); }}
                      className={cn('flex w-full items-center gap-2 px-3 py-2 text-[13px] transition', opt.code === language ? 'bg-[#F7F8FC] text-[#1D1D1F] font-medium' : 'text-[#1D1D1F] hover:bg-[#F7F8FC]')}
                    >
                      <span>{opt.flag}</span>
                      <span className="flex-1">{opt.label}</span>
                      <span className="text-[10px] text-[#ABABAB]">{opt.short}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Account */}
            {isAuthenticated ? (
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => { setAccountOpen((p) => !p); setCatalogOpen(false); setLanguageOpen(false); }}
                  className="flex items-center gap-1 text-[11px] text-[#888888] hover:text-[#1D1D1F]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Кабинет</span>
                  <span className={cn('text-[9px] transition-transform', accountOpen ? 'rotate-180' : '')}>▾</span>
                </button>

                <div className={cn(
                  'absolute right-0 top-[calc(100%+4px)] z-[3000] w-[240px] border border-[#E8EAF0] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.10)] origin-top-right transition-all duration-150',
                  accountOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
                )}>
                  <div className="border-b border-[#F0F2F7] px-4 py-3">
                    <div className="text-[13px] font-semibold text-[#1D1D1F]">Личный кабинет</div>
                    <div className="text-[11px] text-[#888888]">{user?.email ?? ''}</div>
                  </div>
                  <div className="py-1">
                    <DropdownLink href="/account/profile" label="Профиль" icon={<UserIcon />} onClick={() => setAccountOpen(false)} />
                    <DropdownLink href="/account/orders" label="Мои заказы" icon={<BagIcon />} onClick={() => setAccountOpen(false)} />
                    <DropdownLink href="/account/favorites" label="Избранное" icon={<HeartIcon />} onClick={() => setAccountOpen(false)} />
                    <DropdownLink href="/account/bonus-card" label="Бонусная карта" icon={<CardIcon />} onClick={() => setAccountOpen(false)} />
                    <DropdownLink href="/account/addresses" label="Мои адреса" icon={<PinIcon />} onClick={() => setAccountOpen(false)} />
                  </div>
                  <div className="border-t border-[#F0F2F7] py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-3 py-[9px] text-[13px] text-[#888888] transition hover:bg-[#F7F8FB] hover:text-[#1D1D1F]"
                    >
                      <PowerIcon />
                      <span>Выйти</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-[11px] text-[#888888] hover:text-[#1D1D1F]">Войти</Link>
                <Link href="/register" className="text-[11px] text-[#888888] hover:text-[#1D1D1F]">Регистрация</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main row ── */}
      <div className="border-b border-[#EFEFEF] bg-white">
        <div className="mx-auto flex h-[64px] max-w-[1440px] items-center gap-5 px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <img src="/logo.png" alt="Logo" className="h-[48px] w-auto object-contain" />
          </Link>

          {/* Catalog button → dropdown with mega-menu */}
          <div className="relative shrink-0" ref={catalogRef}>
            <button
              type="button"
              onClick={() => { setCatalogOpen((p) => !p); setAccountOpen(false); setLanguageOpen(false); }}
              className={cn(
                'inline-flex h-[38px] items-center gap-2 px-4 text-[13px] font-semibold transition-colors',
                catalogOpen
                  ? 'bg-[#F64FA0] text-white'
                  : 'bg-[#1D1D1F] text-white hover:bg-black'
              )}
              style={{ letterSpacing: '0.01em' }}
            >
              <BurgerIcon open={catalogOpen} />
              Каталог
            </button>

            {/* Catalog dropdown */}
            <div className={cn(
              'absolute left-0 top-[calc(100%+1px)] z-[3000] w-[240px] border border-[#E8EAF0] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.10)] origin-top-left transition-all duration-150',
              catalogOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
            )}>
              <div className="border-b border-[#F0F2F7] px-4 py-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#888888]">Категории</div>
              </div>
              <div className="py-1">
                {visibleCategories.map((cat) => (
                  <CategorySideItem key={cat.id} category={cat} />
                ))}
              </div>
              <div className="border-t border-[#F0F2F7] p-2">
                <Link
                  href="/shop/categories"
                  className="block bg-[#1D1D1F] py-2 text-center text-[12px] font-semibold text-white hover:bg-black"
                  onClick={() => setCatalogOpen(false)}
                >
                  Все категории →
                </Link>
              </div>
            </div>
          </div>

          {/* Search */}
          <form onSubmit={onSearchSubmit} className="flex min-w-0 flex-1 items-stretch">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск товаров..."
              className="h-[38px] min-w-0 flex-1 border border-[#E0E2EA] border-r-0 bg-[#FAFAFA] px-4 text-[13px] text-[#1D1D1F] outline-none placeholder:text-[#ABABAB] focus:border-[#1D1D1F] focus:bg-white transition-colors"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="border border-[#E0E2EA] border-r-0 bg-[#FAFAFA] px-2 text-[#ABABAB] hover:text-[#1D1D1F] transition-colors"
              >
                ×
              </button>
            )}
            <button
              type="submit"
              className="h-[38px] shrink-0 bg-[#1D1D1F] px-5 text-[12px] font-semibold text-white hover:bg-black transition-colors"
              style={{ letterSpacing: '0.03em' }}
            >
              НАЙТИ
            </button>
          </form>

          {/* City */}
          <div className="hidden items-center gap-1.5 text-[12px] text-[#888888] xl:flex">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s6-5.4 6-11a6 6 0 0 0-12 0c0 5.6 6 11 6 11Z" /><circle cx="12" cy="10" r="2" />
            </svg>
            <span>Баку</span>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-1">
            <Link href="/shop/favorites" className="inline-flex flex-col items-center gap-0.5 px-3 py-1 text-[#1D1D1F] transition hover:text-[#F64FA0]">
              <HeartIcon />
              <span className="text-[10px] font-medium">Избранное</span>
            </Link>
            <Link href="/cart" className="relative inline-flex flex-col items-center gap-0.5 px-3 py-1 text-[#1D1D1F] transition hover:text-[#F64FA0]">
              <CartHeaderIcon />
              <span className="text-[10px] font-medium">Корзина</span>
              {itemCount > 0 && (
                <span className="absolute right-1.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center bg-[#F64FA0] px-1 text-[9px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      {open ? (
        <><path d="M18 6 6 18" /><path d="M6 6l12 12" /></>
      ) : (
        <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>
      )}
    </svg>
  );
}
function HeartIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
}
function CartHeaderIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>;
}
function UserIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>; }
function BagIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2l1.5 4h9L18 2" /><path d="M4 6h16l-1 14H5L4 6Z" /></svg>; }
function CardIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="0" /><path d="M3 10h18" /></svg>; }
function PinIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s6-5.4 6-11a6 6 0 0 0-12 0c0 5.6 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></svg>; }
function PowerIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v10" /><path d="M5.6 5.6a9 9 0 1 0 12.8 0" /></svg>; }