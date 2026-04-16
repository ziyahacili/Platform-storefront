'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { isAxiosError } from 'axios';
import { ordersAPI } from '@/lib/api/orders';
import { paymentsAPI } from '@/lib/api/payments';
import { productsAPI } from '@/lib/api/products';
import { shopsAPI } from '@/lib/api/shops';
import { authAPI } from '@/lib/api/auth';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

const ORDERS_PER_PAGE = 5;

type AnyRecord = Record<string, any>;

function getText(source: any, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

function getFirstDefinedString(source: any, paths: string[], fallback = '') {
  for (const path of paths) {
    const value = path.split('.').reduce((acc: any, part: string) => acc?.[part], source);
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

function getOrderItems(order: AnyRecord) {
  const items = order?.orderItems ?? order?.items ?? order?.products ?? order?.orderLines ?? [];
  return Array.isArray(items) ? items : [];
}

function normalizeOrderStatus(rawStatus: any) {
  if (rawStatus === null || rawStatus === undefined) return 'Pending';
  if (typeof rawStatus === 'number') {
    const map: Record<number, string> = { 0: 'Pending', 1: 'Confirmed', 2: 'Rejected', 3: 'OnHold', 4: 'Shipped', 5: 'Delivered', 6: 'Cancelled', 7: 'Returned', 8: 'PaymentFailed' };
    return map[rawStatus] ?? 'Pending';
  }
  const raw = String(rawStatus).trim().toLowerCase();
  if (!raw) return 'Pending';
  if (raw === 'pending') return 'Pending';
  if (raw === 'confirmed') return 'Confirmed';
  if (raw === 'rejected') return 'Rejected';
  if (raw === 'onhold' || raw === 'on hold') return 'OnHold';
  if (raw === 'shipped') return 'Shipped';
  if (raw === 'delivered') return 'Delivered';
  if (raw === 'cancelled' || raw === 'canceled') return 'Cancelled';
  if (raw === 'returned') return 'Returned';
  if (raw === 'paymentfailed' || raw === 'payment failed') return 'PaymentFailed';
  return String(rawStatus).trim();
}

function getOrderStatusLabel(order: AnyRecord) {
  if (typeof order?.status === 'number') return normalizeOrderStatus(order.status);
  const raw = getFirstDefinedString(order, ['status', 'orderStatus', 'deliveryStatus', 'fulfillmentStatus', 'shipmentStatus']);
  return raw ? normalizeOrderStatus(raw) : 'Pending';
}

function getStatusStyle(statusLabel: string): { bg: string; text: string; border: string } {
  const v = statusLabel.toLowerCase();
  if (v.includes('cancel') || v.includes('rejected')) return { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' };
  if (v.includes('pending') || v.includes('confirmed') || v.includes('onhold')) return { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' };
  if (v.includes('shipped')) return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
  if (v.includes('delivered') || v.includes('returned')) return { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' };
  if (v.includes('paymentfailed') || v.includes('failed')) return { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' };
  return { bg: '#F9FAFB', text: '#374151', border: '#E5E7EB' };
}

function getPaymentStatusLabel(status: any) {
  const raw = String(status ?? '').trim().toLowerCase();
  if (!raw) return 'Нет данных';
  if (raw.includes('succeeded') || raw.includes('success')) return 'Оплачено';
  if (raw.includes('pending')) return 'Ожидает';
  if (raw.includes('failed')) return 'Ошибка';
  return String(status ?? '');
}

function getPaymentColor(status: any): string {
  const v = String(status ?? '').toLowerCase();
  if (v.includes('succeeded') || v.includes('success')) return '#16A34A';
  if (v.includes('pending')) return '#D97706';
  if (v.includes('failed')) return '#DC2626';
  return '#6B7280';
}

function formatOrderDateTime(value: any) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function getPickupDeadlineText(order: AnyRecord) {
  const rawDate = order?.orderDate ?? order?.createdAt ?? order?.createdAtUtc;
  const base = rawDate ? new Date(rawDate) : null;
  if (!base || Number.isNaN(base.getTime())) return 'Срок хранения на пункте выдачи — 4 дня.';
  const deadline = new Date(base);
  deadline.setDate(deadline.getDate() + 4);
  return `Срок хранения — 4 дня (до ${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(deadline)}).`;
}

function getProductImage(product: AnyRecord) {
  const urls = product?.imageUrls ?? product?.images ?? product?.photos ?? [];
  if (Array.isArray(urls) && urls.length > 0) {
    const first = urls.find((v) => typeof v === 'string' && v.trim());
    if (first) return first;
  }
  return getFirstDefinedString(product, ['imageUrl', 'image', 'thumbnail']) || '/placeholder-product.svg';
}

function getOrderItemProduct(item: AnyRecord) {
  return item?.product && typeof item.product === 'object' ? item.product : null;
}

function getOrderItemName(item: AnyRecord) {
  const product = getOrderItemProduct(item);
  return (
    getText(item, ['productName', 'name', 'title', 'productTitle'], '') ||
    getFirstDefinedString(item, ['product.name', 'product.title'], '') ||
    getFirstDefinedString(product, ['name', 'title'], '') ||
    `Товар ${String(item?.productId ?? '').slice(0, 8)}`
  );
}

function getOrderItemImage(item: AnyRecord) {
  const direct = getFirstDefinedString(item, ['imageUrl', 'image', 'thumbnail', 'thumb']) || '';
  if (direct) return direct;
  const imageUrls = item?.imageUrls;
  if (Array.isArray(imageUrls) && imageUrls.length > 0) {
    const first = imageUrls.find((v) => typeof v === 'string' && v.trim());
    if (first) return first;
  }
  const product = getOrderItemProduct(item);
  if (product) return getProductImage(product);
  return '/placeholder-product.svg';
}

function getOrderItemShopId(item: AnyRecord) {
  return String(item?.shopId ?? item?.product?.shopId ?? '').trim();
}

function getOrderItemShopName(item: AnyRecord, shopMap: Map<string, AnyRecord>) {
  const shopId = getOrderItemShopId(item);
  const shop = shopId ? shopMap.get(shopId) : null;
  if (shop?.name) return shop.name.trim();
  const product = getOrderItemProduct(item);
  return (
    getText(item, ['shopName', 'sellerName', 'companyName', 'merchantName', 'vendorName', 'storeName']) ||
    getFirstDefinedString(item, ['product.shopName', 'product.shop.name'], '') ||
    getFirstDefinedString(product, ['shop.name', 'shopName'], '') ||
    'Магазин'
  );
}

function getOrderSellerName(order: AnyRecord, shopMap: Map<string, AnyRecord>) {
  const direct = getFirstDefinedString(order, ['sellerName', 'shopName', 'companyName', 'merchantName', 'vendorName', 'storeName', 'seller.companyName', 'seller.name', 'shop.name', 'company.name']) || '';
  if (direct) return direct;
  const firstItem = getOrderItems(order)[0] ?? {};
  return getOrderItemShopName(firstItem, shopMap) || 'Магазин';
}

function getOrderCountAndTotal(order: AnyRecord) {
  const items = getOrderItems(order);
  const count = items.reduce((sum: number, item: AnyRecord) => {
    const quantity = typeof item?.quantity === 'number' ? item.quantity : Number(item?.quantity ?? 1);
    return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
  }, 0);
  const total = typeof order?.totalAmount === 'number' ? order.totalAmount : Number(order?.totalAmount ?? order?.amount ?? 0);
  return { count: count > 0 ? count : items.length || 0, total: Number.isFinite(total) ? total : 0 };
}

// ─── Pagination component ──────────────────────────────────────────────────────

function OrdersPagination({
  page,
  totalPages,
  onPageChange,
  isFetching,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  isFetching: boolean;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between bg-white px-5 py-4" style={{ border: '1px solid #E8EAF0' }}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1 || isFetching}
        className="flex h-9 items-center gap-2 border border-[#E8EAF0] bg-white px-4 text-[12px] font-semibold text-[#1D1D1F] transition-colors hover:border-[#1D1D1F] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Назад
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            disabled={isFetching}
            className="flex h-9 w-9 items-center justify-center text-[13px] font-semibold transition-colors disabled:cursor-not-allowed"
            style={{
              background: p === page ? '#1D1D1F' : 'white',
              color: p === page ? 'white' : '#1D1D1F',
              border: `1px solid ${p === page ? '#1D1D1F' : '#E8EAF0'}`,
            }}
          >
            {p}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages || isFetching}
        className="flex h-9 items-center gap-2 px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: '#1D1D1F' }}
      >
        Вперёд
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function OrderSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#EFEFEF', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="bg-white p-6" style={{ border: '1px solid #E8EAF0' }}>
          <div className="h-7 w-48 animate-pulse bg-[#E8EAF0]" />
        </div>
        <div className="mt-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white" style={{ border: '1px solid #E8EAF0' }}>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-56 animate-pulse bg-[#E8EAF0]" />
                  <div className="h-7 w-28 animate-pulse bg-[#F3F4F6]" />
                </div>
                <div className="mt-3 h-4 w-40 animate-pulse bg-[#F3F4F6]" />
              </div>
              <div className="border-t border-[#E8EAF0] bg-[#FAFAFA] px-6 py-4">
                <div className="h-4 w-full animate-pulse bg-[#E8EAF0]" />
              </div>
              <div className="p-6">
                <div className="flex gap-4">
                  <div className="h-20 w-20 animate-pulse bg-[#E8EAF0]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 animate-pulse bg-[#E8EAF0]" />
                    <div className="h-3 w-32 animate-pulse bg-[#F3F4F6]" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const { user, isLoading: authLoading } = useAuth();

  // Client-side pagination state
  const [clientPage, setClientPage] = useState(1);

  // Fetch ALL orders once, then paginate client-side
  // (API supports page/limit but doesn't return total count, so we fetch a large batch)
  const { data: orders, isLoading, error, isFetching } = useQuery({
    queryKey: ['orders', user?.userId],
    queryFn: () => ordersAPI.getUserOrders(1, 100),
    enabled: !authLoading && !!user,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const { data: paymentTransactions, error: paymentError } = useQuery({
    queryKey: ['payment-transactions'],
    queryFn: () => paymentsAPI.getAllPaymentTransactions(),
    enabled: !authLoading && !!user,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const orderList = orders ?? [];
  const totalPages = Math.max(1, Math.ceil(orderList.length / ORDERS_PER_PAGE));

  // Reset to page 1 when orders load
  useEffect(() => { setClientPage(1); }, [orderList.length]);

  // Current page slice
  const pagedOrders = useMemo(() => {
    const start = (clientPage - 1) * ORDERS_PER_PAGE;
    return orderList.slice(start, start + ORDERS_PER_PAGE);
  }, [orderList, clientPage]);

  const productIds = useMemo(() => {
    const ids = new Set<string>();
    pagedOrders.forEach((order) => {
      getOrderItems(order).forEach((item) => {
        const id = String(item?.productId ?? '').trim();
        if (id) ids.add(id);
      });
    });
    return Array.from(ids);
  }, [pagedOrders]);

  const shopIds = useMemo(() => {
    const ids = new Set<string>();
    pagedOrders.forEach((order) => {
      getOrderItems(order).forEach((item) => {
        const id = getOrderItemShopId(item);
        if (id) ids.add(id);
      });
    });
    return Array.from(ids);
  }, [pagedOrders]);

  const { data: enrichment, isLoading: enrichmentLoading } = useQuery({
    queryKey: ['orders-enrichment', productIds.join(','), shopIds.join(',')],
    enabled: !authLoading && !isLoading && pagedOrders.length > 0,
    retry: false,
    staleTime: 300_000,
    queryFn: async () => {
      const [productsSettled, shopsSettled] = await Promise.all([
        Promise.allSettled(productIds.map((id) => productsAPI.getProductDetail(id))),
        Promise.allSettled(shopIds.map((id) => shopsAPI.getShopById(id))),
      ]);
      const productMap = new Map<string, AnyRecord>();
      productsSettled.forEach((result, index) => {
        if (result.status === 'fulfilled') productMap.set(productIds[index], result.value as AnyRecord);
      });
      const shopMap = new Map<string, AnyRecord>();
      shopsSettled.forEach((result, index) => {
        if (result.status === 'fulfilled') shopMap.set(shopIds[index], result.value as AnyRecord);
      });
      return { productMap, shopMap };
    },
  });

  useEffect(() => {
    if (error && isAxiosError(error) && error.response?.status === 401) void authAPI.logout();
    if (paymentError && isAxiosError(paymentError) && paymentError.response?.status === 401) void authAPI.logout();
  }, [error, paymentError]);

  const productMap = enrichment?.productMap ?? new Map<string, AnyRecord>();
  const shopMap = enrichment?.shopMap ?? new Map<string, AnyRecord>();

  const paymentMap = useMemo(() => {
    return new Map((paymentTransactions ?? []).map((tx) => [String(tx.orderId), tx]));
  }, [paymentTransactions]);

  function handlePageChange(p: number) {
    if (p < 1 || p > totalPages) return;
    setClientPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const pageStyle = { background: '#EFEFEF', fontFamily: "'Inter', system-ui, sans-serif" } as const;

  if (authLoading || isLoading || enrichmentLoading) return <OrderSkeleton />;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={pageStyle}>
        <div className="bg-white p-10 text-center w-full max-w-sm" style={{ border: '1px solid #E8EAF0' }}>
          <div className="text-[20px] font-bold text-[#1D1D1F]">Мои заказы</div>
          <p className="mt-3 text-[13px] text-[#9CA3AF]">Войдите в аккаунт, чтобы просмотреть заказы</p>
          <Link href="/login" className="mt-5 flex h-11 items-center justify-center text-[14px] font-semibold text-white" style={{ background: '#1D1D1F' }}>
            Войти
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={pageStyle}>
        <div className="bg-white p-10 text-center w-full max-w-sm" style={{ border: '1px solid #E8EAF0' }}>
          <div className="text-[20px] font-bold text-[#1D1D1F]">Ошибка загрузки</div>
          <p className="mt-3 text-[13px] text-[#9CA3AF]">Не удалось загрузить заказы</p>
          <Link href="/login" className="mt-5 flex h-11 items-center justify-center text-[14px] font-semibold text-white" style={{ background: '#1D1D1F' }}>
            Войти заново
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={pageStyle}>
      <div className="mx-auto max-w-[1400px] px-6 py-6">

        {/* Header */}
        <div className="bg-white px-6 py-5 flex items-center justify-between" style={{ border: '1px solid #E8EAF0' }}>
          <h1 className="text-[22px] font-bold text-[#1D1D1F]" style={{ letterSpacing: '-0.02em' }}>
            Мои заказы
          </h1>
          {orderList.length > 0 && (
            <div className="flex items-center gap-3">
              {isFetching && (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-[#9CA3AF]">
                  <span className="inline-block h-2 w-2 animate-spin rounded-full border border-[#9CA3AF] border-t-transparent" />
                  Обновление...
                </span>
              )}
              <span className="text-[13px] text-[#9CA3AF]">
                {orderList.length} заказ{orderList.length === 1 ? '' : orderList.length >= 2 && orderList.length <= 4 ? 'а' : 'ов'}
                {totalPages > 1 && ` · стр. ${clientPage} из ${totalPages}`}
              </span>
            </div>
          )}
        </div>

        {orderList.length === 0 ? (
          <div className="mt-4 bg-white px-6 py-16 text-center" style={{ border: '1px solid #E8EAF0' }}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center" style={{ background: '#F3F4F6' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-[#1D1D1F]">Заказов пока нет</p>
            <p className="mt-1 text-[13px] text-[#9CA3AF]">Перейдите в каталог, чтобы сделать первый заказ</p>
            <Link href="/shop/products" className="mt-5 inline-flex h-10 items-center px-6 text-[13px] font-semibold text-white" style={{ background: '#1D1D1F' }}>
              Перейти в каталог
            </Link>
          </div>
        ) : (
          <>
            <div className={`mt-4 space-y-4 transition-opacity duration-150 ${enrichmentLoading ? 'opacity-60' : 'opacity-100'}`}>
              {pagedOrders.map((order: AnyRecord) => {
                const trackingId = order?.trackingId ?? order?.id ?? '';
                const sellerName = getOrderSellerName(order, shopMap);
                const statusLabel = getOrderStatusLabel(order);
                const statusStyle = getStatusStyle(statusLabel);
                const orderDateText = formatOrderDateTime(order?.orderDate ?? order?.createdAt ?? order?.date);
                const { count, total } = getOrderCountAndTotal(order);
                const items = getOrderItems(order);
                const payment = paymentMap.get(String(order?.id ?? '')) ?? paymentMap.get(String(order?.trackingId ?? '')) ?? null;
                const paymentLabel = getPaymentStatusLabel(payment?.status);
                const paymentColor = getPaymentColor(payment?.status);

                return (
                  <div key={String(trackingId)} className="bg-white" style={{ border: '1px solid #E8EAF0' }}>
                    {/* Header */}
                    <div className="px-6 py-5">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex flex-col gap-1 xl:flex-row xl:items-center xl:gap-5">
                          <div className="text-[15px] font-bold tracking-tight text-[#1D1D1F]">
                            Заказ №{trackingId}
                          </div>
                          <div className="hidden h-4 w-px bg-[#E8EAF0] xl:block" />
                          <div className="text-[12px] text-[#9CA3AF]">
                            Продавец: <span className="font-semibold text-[#6B7280]">{sellerName}</span>
                          </div>
                          <div className="hidden h-4 w-px bg-[#E8EAF0] xl:block" />
                          <div className="text-[12px] text-[#9CA3AF]">{orderDateText}</div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="text-[12px]">
                            <span className="text-[#9CA3AF]">Платёж: </span>
                            <span className="font-semibold" style={{ color: paymentColor }}>{paymentLabel}</span>
                            {payment && <span className="ml-2 text-[#9CA3AF]">({formatPrice(payment.amount)})</span>}
                          </div>
                          <div
                            className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                            style={{ background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}` }}
                          >
                            {statusLabel}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Warning */}
                    <div className="border-t border-[#E8EAF0] bg-[#FFFBEB] px-6 py-3" style={{ borderBottom: '1px solid #FDE68A' }}>
                      <div className="flex items-start gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" className="mt-0.5 shrink-0">
                          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <p className="text-[12px] leading-[1.6] text-[#92400E]">{getPickupDeadlineText(order)}</p>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="p-6">
                      <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.1em] text-[#9CA3AF]">Товары в заказе</div>
                      <div className="space-y-3">
                        {items.length > 0 ? items.map((item: AnyRecord, index: number) => {
                          const productId = String(item?.productId ?? '').trim();
                          const product = productMap.get(productId) ?? getOrderItemProduct(item);
                          const itemName = product?.name ? String(product.name) : getOrderItemName(item);
                          const itemImage = getProductImage(product) || getOrderItemImage(item);
                          const qty = Number(item?.quantity ?? 1) || 1;
                          const unitPrice = Number(product?.price ?? item?.unitPrice ?? item?.price ?? 0) || 0;
                          const totalPrice = Number(item?.totalPrice ?? 0) || unitPrice * qty;
                          const shopName = getOrderItemShopName(item, shopMap);

                          return (
                            <div
                              key={String(item?.id ?? `${itemName}-${index}`)}
                              className="flex items-start gap-4 p-4"
                              style={{ background: '#FAFAFA', border: '1px solid #E8EAF0' }}
                            >
                              <div className="relative h-[80px] w-[80px] shrink-0 overflow-hidden bg-white" style={{ border: '1px solid #E8EAF0' }}>
                                <Image
                                  src={itemImage}
                                  alt={itemName}
                                  fill
                                  className="object-contain p-2"
                                  unoptimized={itemImage.startsWith('http')}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[13px] font-semibold leading-[1.4] text-[#1D1D1F]">{itemName}</div>
                                <div className="mt-1 text-[11px] text-[#9CA3AF]">{shopName} · {qty} шт.</div>
                                <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[12px]">
                                  <div>
                                    <span className="text-[#9CA3AF]">За шт.: </span>
                                    <span className="font-semibold text-[#1D1D1F]">{formatPrice(unitPrice)}</span>
                                  </div>
                                  <div className="h-3 w-px bg-[#E8EAF0]" />
                                  <div>
                                    <span className="text-[#9CA3AF]">Итого: </span>
                                    <span className="font-bold text-[#1D1D1F]">{formatPrice(totalPrice)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }) : (
                          <div className="py-6 text-center text-[12px] text-[#9CA3AF]" style={{ border: '1px dashed #E8EAF0' }}>
                            Товары не найдены
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #E8EAF0' }}>
                      <Link
                        href={`/account/orders/${encodeURIComponent(String(trackingId))}`}
                        className="text-[12px] font-semibold tracking-wide transition-colors"
                        style={{ color: '#F64FA0' }}
                      >
                        Подробнее →
                      </Link>
                      <div className="text-[13px] text-[#6B7280]">
                        {count} товар{count === 1 ? '' : count >= 2 && count <= 4 ? 'а' : 'ов'} на сумму{' '}
                        <span className="font-bold text-[#1D1D1F]">{formatPrice(total)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <OrdersPagination
              page={clientPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              isFetching={enrichmentLoading}
            />
          </>
        )}
      </div>
    </div>
  );
}

