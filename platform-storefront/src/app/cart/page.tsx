'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { cartAPI } from '@/lib/api/cart';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

export default function CartPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: cart, isLoading, error } = useQuery({
    queryKey: ['cart', user?.userId],
    queryFn: () => cartAPI.getCart(),
    enabled: !authLoading && !!user,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (cart) {
      const ids = new Set((cart?.items ?? []).map((i: any) => i.id as string));
      setSelectedIds(ids);
    }
  }, [cart]);

  const removeItem = useMutation({
    mutationFn: (cartItemId: string) => cartAPI.removeItem(cartItemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart', user?.userId] }),
  });

  const updateQty = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => cartAPI.updateQuantity(id, qty),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart', user?.userId] }),
  });

  const clearCart = useMutation({
    mutationFn: () => cartAPI.clearCart(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart', user?.userId] }),
  });

  const items = cart?.items ?? [];
  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((i: any) => i.id)));
  };

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelected = () => selectedIds.forEach((id) => removeItem.mutate(id));

  const selectedItems = items.filter((i: any) => selectedIds.has(i.id));
  const selectedTotal = selectedItems.reduce((sum: number, i: any) => sum + (i.totalPrice ?? 0), 0);
  const selectedCount = selectedItems.length;

  const grouped = items.reduce((acc: Record<string, any[]>, item: any) => {
    const shop = item.shopName || 'Satıcı';
    if (!acc[shop]) acc[shop] = [];
    acc[shop].push(item);
    return acc;
  }, {});

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#EFEFEF] px-4 py-8" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="mx-auto max-w-[1140px]">
          <div className="mb-6 h-7 w-40 animate-pulse bg-white" />
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse bg-white border border-[#E8EAF0]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        emoji="🛒"
        title="Войдите в аккаунт"
        subtitle="Чтобы увидеть корзину, необходимо авторизоваться"
        cta={{ label: 'Войти', href: '/login' }}
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        emoji="⚠️"
        title="Не удалось загрузить корзину"
        subtitle="Попробуйте войти заново"
        cta={{ label: 'Войти заново', href: '/login' }}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        emoji="🛒"
        title="Корзина пуста"
        subtitle="Добавьте товары из каталога"
        cta={{ label: 'Перейти в каталог', href: '/shop/products' }}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-[#EFEFEF] px-4 py-7"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <div className="mx-auto max-w-[1140px]">
        {/* Page title */}
        <div className="mb-5 flex items-baseline gap-3">
          <h1 className="text-[22px] font-bold tracking-tight text-[#1D1D1F]">Корзина</h1>
          <span className="text-[13px] text-[#888888]">{items.length} товар{items.length === 1 ? '' : items.length <= 4 ? 'а' : 'ов'}</span>
        </div>

        <div className="flex gap-5">
          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Select-all bar */}
            <div className="flex items-center justify-between bg-white border border-[#E8EAF0] px-4 py-2.5">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-[14px] w-[14px] accent-[#1D1D1F]"
                />
                <span className="text-[13px] font-medium text-[#1D1D1F]">Выбрать все</span>
              </label>
              <button
                onClick={deleteSelected}
                disabled={selectedIds.size === 0}
                className="text-[12px] text-[#888888] transition hover:text-[#F64FA0] disabled:opacity-40"
              >
                Удалить выбранные
              </button>
            </div>

            {/* Groups */}
            {Object.entries(grouped).map(([shopName, shopItems]) => (
              <div key={shopName} className="bg-white border border-[#E8EAF0]">
                {/* Shop header */}
                <div className="flex items-center gap-2 border-b border-[#F0F2F7] px-4 py-2.5">
                  <div className="flex h-6 w-6 items-center justify-center bg-[#1D1D1F] text-[10px] font-bold text-white">
                    {shopName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[12px] font-semibold text-[#1D1D1F]">{shopName}</span>
                </div>

                {/* Items */}
                {(shopItems as any[]).map((item: any) => {
                  const isSelected = selectedIds.has(item.id);
                  const unitPrice = item.unitPrice ?? (item.totalPrice / item.quantity) ?? 0;
                  const installment = Math.ceil(unitPrice / 18);

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 border-b border-[#F7F8FC] px-4 py-4 last:border-b-0"
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItem(item.id)}
                        className="h-[14px] w-[14px] shrink-0 accent-[#1D1D1F]"
                      />

                      {/* Image */}
                      <div className="relative h-[80px] w-[80px] shrink-0 border border-[#F0F2F7] bg-[#FAFAFA]">
                        <Image
                          src={item.imageUrls?.[0] ?? '/placeholder-product.svg'}
                          alt={item.productName}
                          fill
                          className="object-contain p-1.5"
                          unoptimized
                        />
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-[#1D1D1F]">
                          {item.productName}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-[15px] font-bold text-[#1D1D1F]">
                            {formatPrice(unitPrice)}
                          </span>
                        </div>
                        <div className="mt-1 inline-flex items-center bg-[#FFF3CC] px-2 py-[2px] text-[10px] font-semibold text-[#8A6800]">
                          {formatPrice(installment)} × 18 мес
                        </div>
                        <div className="mt-1 text-[11px] text-[#F64FA0] font-medium">
                          🚀 Доставка: завтра
                        </div>
                      </div>

                      {/* Qty + remove */}
                      <div className="flex flex-col items-end gap-3">
                        <button
                          onClick={() => removeItem.mutate(item.id)}
                          className="text-[#CCCCCC] transition hover:text-[#F64FA0]"
                          aria-label="Удалить"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>

                        <div className="flex items-center border border-[#E8EAF0]">
                          <button
                            onClick={() => updateQty.mutate({ id: item.id, qty: Math.max(1, item.quantity - 1) })}
                            className="flex h-7 w-7 items-center justify-center text-[#1D1D1F] transition hover:bg-[#EFEFEF] text-[15px]"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-[13px] font-semibold text-[#1D1D1F]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQty.mutate({ id: item.id, qty: item.quantity + 1 })}
                            className="flex h-7 w-7 items-center justify-center text-[#1D1D1F] transition hover:bg-[#EFEFEF] text-[15px]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Shop subtotal */}
                <div className="flex items-center justify-end border-t border-[#F0F2F7] bg-[#FAFAFA] px-4 py-2.5">
                  <span className="text-[12px] text-[#888888]">Итого магазин:</span>
                  <span className="ml-2 text-[14px] font-bold text-[#1D1D1F]">
                    {formatPrice((shopItems as any[]).reduce((s: number, i: any) => s + (i.totalPrice ?? 0), 0))}
                  </span>
                </div>
              </div>
            ))}

            {/* Bottom actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => clearCart.mutate()}
                className="text-[12px] text-[#888888] transition hover:text-[#F64FA0]"
              >
                Очистить корзину
              </button>
              <Link href="/shop/products" className="text-[12px] font-medium text-[#1D1D1F] hover:text-[#F64FA0] transition-colors">
                ← Продолжить покупки
              </Link>
            </div>
          </div>

          {/* Right: summary */}
          <div className="w-[268px] shrink-0">
            <div className="sticky top-[80px] bg-white border border-[#E8EAF0]">
              <div className="border-b border-[#F0F2F7] px-5 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#888888]">
                  Ваш заказ
                </div>
              </div>

              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#888888]">Товаров ({selectedCount})</span>
                  <span className="font-semibold text-[#1D1D1F]">{formatPrice(selectedTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#888888]">Доставка</span>
                  <span className="font-semibold text-[#27AE60]">Бесплатно</span>
                </div>
                <div className="border-t border-[#F0F2F7] pt-3 flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#1D1D1F]">Итого</span>
                  <span className="text-[18px] font-bold text-[#1D1D1F]">{formatPrice(selectedTotal)}</span>
                </div>
              </div>

              <div className="px-5 pb-5 space-y-2">
                <Link
                  href="/checkout"
                  className="block w-full bg-[#F64FA0] py-3 text-center text-[13px] font-bold text-white tracking-wide hover:bg-[#e0408e] transition-colors"
                  style={{ letterSpacing: '0.03em' }}
                >
                  ОФОРМИТЬ ЗАКАЗ
                </Link>
                <button className="block w-full border border-[#1D1D1F] py-3 text-center text-[13px] font-semibold text-[#1D1D1F] hover:bg-[#1D1D1F] hover:text-white transition-colors">
                  Рассрочка / Кредит
                </button>
              </div>

              {/* Trust badges */}
              <div className="border-t border-[#F0F2F7] px-5 py-4 space-y-2">
                {[
                  { icon: '🔒', text: 'Безопасная оплата' },
                  { icon: '↩️', text: 'Возврат 14 дней' },
                  { icon: '✅', text: 'Гарантия качества' },
                ].map((b) => (
                  <div key={b.text} className="flex items-center gap-2 text-[11px] text-[#888888]">
                    <span>{b.icon}</span>
                    <span>{b.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ emoji, title, subtitle, cta }: {
  emoji: string; title: string; subtitle: string; cta: { label: string; href: string };
}) {
  return (
    <div className="min-h-screen bg-[#EFEFEF] flex items-center justify-center px-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="bg-white border border-[#E8EAF0] px-10 py-12 text-center max-w-[400px] w-full">
        <div className="text-[48px] mb-4">{emoji}</div>
        <h2 className="text-[18px] font-bold text-[#1D1D1F]">{title}</h2>
        <p className="mt-2 text-[13px] text-[#888888]">{subtitle}</p>
        <Link href={cta.href} className="mt-6 inline-block bg-[#1D1D1F] px-8 py-3 text-[13px] font-bold text-white hover:bg-black transition-colors">
          {cta.label}
        </Link>
      </div>
    </div>
  );
}