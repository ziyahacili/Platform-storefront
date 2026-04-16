'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cartAPI } from '@/lib/api/cart';
import { ordersAPI } from '@/lib/api/orders';

type PaymentMethod = 'online-card' | 'credit' | 'installment' | 'pickup-card';
type CardForm = { cardNumber: string; expirationDate: string; cvv: string; cardHolderName: string };
type CartItemLike = { productId?: string; id?: string; quantity?: number; productName?: string; name?: string; title?: string; unitPrice?: number; price?: number; totalPrice?: number; imageUrls?: string[] };
type StoredContact = { firstName: string; lastName: string; fullName: string; phone: string };

const STORAGE_USER = 'storefront_auth_user_v3';
const TEST_CARD: CardForm = { cardNumber: '4111111111111111', expirationDate: '12/25', cvv: '123', cardHolderName: 'Test User' };

function onlyDigits(v: string) { return v.replace(/\D/g, ''); }
function formatCardNumber(v: string) { const d = onlyDigits(v).slice(0, 16); return d.replace(/(.{4})/g, '$1 ').trim(); }
function formatExpiration(v: string) { const d = onlyDigits(v).slice(0, 4); if (d.length <= 2) return d; return `${d.slice(0, 2)}/${d.slice(2)}`; }
function money(v: number) { return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(v) ? v : 0); }
function getText<T extends Record<string, any>>(obj: T, keys: string[], fallback = '') { for (const k of keys) { const v = obj?.[k]; if (typeof v === 'string' && v.trim()) return v; } return fallback; }
function getNumber<T extends Record<string, any>>(obj: T, keys: string[], fallback = 0) { for (const k of keys) { const v = obj?.[k]; if (typeof v === 'number' && Number.isFinite(v)) return v; if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v); } return fallback; }

function readStoredContact(): StoredContact {
  if (typeof window === 'undefined') return { firstName: '', lastName: '', fullName: '', phone: '' };
  try {
    const raw = window.localStorage.getItem(STORAGE_USER);
    if (!raw) return { firstName: '', lastName: '', fullName: '', phone: '' };
    const user = JSON.parse(raw);
    const firstName = getText(user, ['name', 'firstName'], '') || getText(user?.data ?? {}, ['name', 'firstName'], '');
    const lastName = getText(user, ['surname', 'lastName'], '') || getText(user?.data ?? {}, ['surname', 'lastName'], '');
    const phone = getText(user, ['phoneNumber'], '') || getText(user?.data ?? {}, ['phoneNumber'], '');
    return { firstName, lastName, fullName: [firstName, lastName].filter(Boolean).join(' ').trim(), phone };
  } catch { return { firstName: '', lastName: '', fullName: '', phone: '' }; }
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  'online-card': 'Банковской картой онлайн',
  credit: 'Кредит',
  installment: 'Рассрочка Birbank',
  'pickup-card': 'Картой при получении',
};

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online-card');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [storedContact, setStoredContact] = useState<StoredContact>({ firstName: '', lastName: '', fullName: '', phone: '' });

  useEffect(() => {
    setStoredContact(readStoredContact());
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_USER) setStoredContact(readStoredContact()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const recipientName = useMemo(() => storedContact.fullName || '—', [storedContact]);
  const recipientPhone = useMemo(() => storedContact.phone || '—', [storedContact]);

  const { data: cart, isLoading, error } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartAPI.getCart(),
    retry: false,
  });

  const cartItems = useMemo<CartItemLike[]>(() => {
    const raw = (cart as any)?.items ?? (cart as any)?.orderItems ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [cart]);

  const totals = useMemo(() => {
    const subtotalFromItems = cartItems.reduce((sum, item) => {
      const qty = getNumber(item as any, ['quantity'], 1);
      const totalPrice = getNumber(item as any, ['totalPrice'], 0);
      const unitPrice = getNumber(item as any, ['unitPrice', 'price'], 0);
      return sum + (totalPrice > 0 ? totalPrice : unitPrice * qty);
    }, 0);
    const subtotal = getNumber(cart as any, ['subtotal', 'subTotal', 'itemsTotal', 'priceTotal'], subtotalFromItems);
    const discount = getNumber(cart as any, ['discountAmount', 'discount'], 0);
    const delivery = getNumber(cart as any, ['deliveryAmount', 'deliveryPrice', 'shippingPrice'], 0);
    const total = getNumber(cart as any, ['totalAmount', 'total', 'amount'], Math.max(subtotal - discount + delivery, 0));
    return { subtotal, discount, delivery, total };
  }, [cart, cartItems]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      setSubmitError('');
      if (!cartItems.length) throw new Error('Корзина пуста');
      if (!address.trim()) throw new Error('Введите адрес');
      if (!city.trim()) throw new Error('Введите город');
      const safeZip = parseInt(zip, 10);
      if (!Number.isFinite(safeZip) || safeZip <= 0) throw new Error('Введите корректный индекс');
      if (paymentMethod === 'online-card') {
        if (onlyDigits(cardNumber).length < 13) throw new Error('Введите корректный номер карты');
        if (!/^\d{2}\/\d{2}$/.test(expirationDate.trim())) throw new Error('Формат: MM/YY');
        if (onlyDigits(cvv).length < 3) throw new Error('Введите CVV');
        if (!cardHolderName.trim()) throw new Error('Введите имя держателя');
      }
      const created = await ordersAPI.createOrder({ order: { address: address.trim(), city: city.trim(), zip: safeZip, recipientName, recipientPhone, products: cartItems.map((i) => ({ productId: String(i.productId ?? i.id ?? ''), quantity: getNumber(i as any, ['quantity'], 1) })) } } as any);
      const trackingId = created?.trackingId || created?.id;
      if (!trackingId) throw new Error('Не удалось получить ID заказа');
      const paymentReq = paymentMethod === 'online-card' ? { cardNumber: onlyDigits(cardNumber), expirationDate: expirationDate.trim(), cvv: onlyDigits(cvv), cardHolderName: cardHolderName.trim(), amount: totals.total } : { ...TEST_CARD, amount: totals.total };
      await ordersAPI.captureOrder(trackingId, paymentReq);
      await Promise.allSettled([queryClient.invalidateQueries({ queryKey: ['cart'] }), cartAPI.clearCart()]);
      return trackingId;
    },
    onSuccess: (trackingId) => router.push(`/account/orders?created=1&trackingId=${encodeURIComponent(trackingId)}`),
    onError: (err: any) => setSubmitError(err?.response?.data?.message || err?.message || 'Ошибка оформления'),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#EFEFEF] px-4 py-8" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="mx-auto max-w-[1200px]">
          <div className="h-7 w-56 animate-pulse bg-white mb-8" />
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">{[0,1,2,3].map(i => <div key={i} className="h-24 animate-pulse bg-white border border-[#E8EAF0]" />)}</div>
            <div className="h-[380px] animate-pulse bg-white border border-[#E8EAF0]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !cartItems.length) {
    return (
      <div className="min-h-screen bg-[#EFEFEF] flex items-center justify-center px-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="bg-white border border-[#E8EAF0] px-10 py-12 text-center max-w-[400px] w-full">
          <div className="text-[48px] mb-4">🛒</div>
          <h2 className="text-[18px] font-bold text-[#1D1D1F]">Корзина пуста</h2>
          <p className="mt-2 text-[13px] text-[#888888]">Добавьте товары и вернитесь сюда</p>
          <Link href="/cart" className="mt-6 inline-block bg-[#1D1D1F] px-8 py-3 text-[13px] font-bold text-white hover:bg-black transition-colors">
            В корзину
          </Link>
        </div>
      </div>
    );
  }

  const lineItems = cartItems.map((item) => {
    const name = getText(item as any, ['productName', 'name', 'title'], 'Товар');
    const qty = getNumber(item as any, ['quantity'], 1);
    const totalPrice = getNumber(item as any, ['totalPrice'], 0);
    const unitPrice = getNumber(item as any, ['unitPrice', 'price'], 0);
    return { name, qty, lineTotal: totalPrice > 0 ? totalPrice : unitPrice * qty };
  });

  return (
    <div className="min-h-screen bg-[#EFEFEF] px-4 py-7" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="mx-auto max-w-[1200px]">
        {/* Breadcrumb */}
        <div className="mb-5 flex items-center gap-2 text-[12px] text-[#888888]">
          <Link href="/" className="hover:text-[#1D1D1F]">Главная</Link>
          <span>/</span>
          <Link href="/cart" className="hover:text-[#1D1D1F]">Корзина</Link>
          <span>/</span>
          <span className="text-[#1D1D1F] font-medium">Оформление</span>
        </div>

        <h1 className="mb-6 text-[22px] font-bold tracking-tight text-[#1D1D1F]">Оформление заказа</h1>

        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          {/* Left */}
          <form
            onSubmit={(e) => { e.preventDefault(); checkoutMutation.mutate(); }}
            className="space-y-4"
          >
            {/* Payment method */}
            <Section title="Способ оплаты">
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-[#888888] px-1 pt-1">Онлайн оплата</div>
                {(['online-card', 'credit', 'installment'] as PaymentMethod[]).map((method) => (
                  <PaymentOption
                    key={method}
                    active={paymentMethod === method}
                    title={PAYMENT_LABELS[method]}
                    onClick={() => setPaymentMethod(method)}
                  >
                    {method === 'online-card' && paymentMethod === 'online-card' && (
                      <div className="mt-4 border-t border-[#F0F2F7] pt-4 grid gap-3 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <FieldLabel>Номер карты</FieldLabel>
                          <Input value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} inputMode="numeric" placeholder="0000 0000 0000 0000" autoComplete="cc-number" />
                        </div>
                        <div>
                          <FieldLabel>Срок действия</FieldLabel>
                          <Input value={expirationDate} onChange={(e) => setExpirationDate(formatExpiration(e.target.value))} inputMode="numeric" placeholder="MM/YY" autoComplete="cc-exp" />
                        </div>
                        <div>
                          <FieldLabel>CVV</FieldLabel>
                          <Input value={cvv} onChange={(e) => setCvv(onlyDigits(e.target.value).slice(0, 4))} inputMode="numeric" placeholder="123" autoComplete="cc-csc" />
                        </div>
                        <div className="md:col-span-2">
                          <FieldLabel>Имя держателя</FieldLabel>
                          <Input value={cardHolderName} onChange={(e) => setCardHolderName(e.target.value)} placeholder="IVAN PETROV" autoComplete="cc-name" />
                        </div>
                      </div>
                    )}
                  </PaymentOption>
                ))}

                <div className="text-[10px] font-semibold uppercase tracking-widest text-[#888888] px-1 pt-2">При получении</div>
                <PaymentOption
                  active={paymentMethod === 'pickup-card'}
                  title={PAYMENT_LABELS['pickup-card']}
                  onClick={() => setPaymentMethod('pickup-card')}
                />
              </div>
            </Section>

            {/* Recipient */}
            <Section title="Получатель">
              <div className="bg-[#FAFAFA] border border-[#F0F2F7] px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-semibold text-[#1D1D1F]">{recipientName}</div>
                  <div className="text-[13px] text-[#888888]">{recipientPhone}</div>
                </div>
                <button type="button" className="text-[12px] font-semibold text-[#F64FA0] hover:underline">Изменить</button>
              </div>
            </Section>

            {/* Delivery address */}
            <Section title="Адрес доставки">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <FieldLabel>Улица, дом, квартира</FieldLabel>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="ул. Низами, д. 10" />
                </div>
                <div>
                  <FieldLabel>Город</FieldLabel>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} required placeholder="Баку" />
                </div>
                <div>
                  <FieldLabel>Индекс</FieldLabel>
                  <Input value={zip} onChange={(e) => setZip(onlyDigits(e.target.value).slice(0, 10))} required inputMode="numeric" placeholder="AZ1000" />
                </div>
              </div>

              {submitError && (
                <div className="mt-3 border-l-2 border-[#F64FA0] bg-[#FFF0F6] px-3 py-2.5 text-[13px] text-[#C0105A]">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={checkoutMutation.isPending}
                className="mt-4 w-full bg-[#F64FA0] py-3.5 text-[13px] font-bold tracking-wide text-white hover:bg-[#e0408e] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                style={{ letterSpacing: '0.04em' }}
              >
                {checkoutMutation.isPending ? 'ОФОРМЛЕНИЕ...' : 'ОФОРМИТЬ ЗАКАЗ'}
              </button>
            </Section>
          </form>

          {/* Right: summary */}
          <aside className="space-y-4">
            <div className="bg-white border border-[#E8EAF0]">
              <div className="border-b border-[#F0F2F7] px-5 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#888888]">Ваш заказ</div>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                <SummaryRow label={`Товары (${cartItems.length})`} value={`${money(totals.subtotal)} ₼`} />
                {totals.discount > 0 && <SummaryRow label="Скидка" value={`-${money(totals.discount)} ₼`} accent="pink" />}
                <SummaryRow label="Доставка" value={totals.delivery > 0 ? `${money(totals.delivery)} ₼` : 'Бесплатно'} accent={totals.delivery === 0 ? 'green' : 'default'} />
                <div className="border-t border-[#F0F2F7] pt-3 flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#1D1D1F]">Итого</span>
                  <span className="text-[20px] font-bold text-[#1D1D1F]">{money(totals.total)} ₼</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E8EAF0]">
              <div className="border-b border-[#F0F2F7] px-5 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#888888]">Состав заказа</div>
              </div>
              <div className="px-5 py-3 space-y-2.5 max-h-[320px] overflow-y-auto">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 py-2 border-b border-[#F7F8FC] last:border-b-0">
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-[12px] font-medium text-[#1D1D1F] leading-snug">{item.name}</div>
                      <div className="text-[11px] text-[#888888]">× {item.qty}</div>
                    </div>
                    <div className="shrink-0 text-[13px] font-bold text-[#1D1D1F]">{money(item.lineTotal)} ₼</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#E8EAF0] px-5 py-4 space-y-2">
              {[{ icon: '🔒', text: 'Защищённая оплата SSL' }, { icon: '↩️', text: 'Возврат в течение 14 дней' }, { icon: '✅', text: 'Гарантия подлинности' }].map((b) => (
                <div key={b.text} className="flex items-center gap-2 text-[11px] text-[#888888]">
                  <span>{b.icon}</span><span>{b.text}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#E8EAF0]">
      <div className="border-b border-[#F0F2F7] px-5 py-3">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#1D1D1F]">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function PaymentOption({ active, title, onClick, children }: { active: boolean; title: string; onClick: () => void; children?: React.ReactNode }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className={`cursor-pointer border px-4 py-3 transition-colors ${active ? 'border-[#1D1D1F] bg-white' : 'border-[#E8EAF0] bg-[#FAFAFA] hover:border-[#1D1D1F]'}`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-4 w-4 shrink-0 items-center justify-center border ${active ? 'border-[#1D1D1F]' : 'border-[#CCCCCC]'}`}>
          {active && <div className="h-2 w-2 bg-[#1D1D1F]" />}
        </div>
        <span className={`text-[13px] font-medium ${active ? 'text-[#1D1D1F]' : 'text-[#888888]'}`}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#888888]">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-[42px] w-full border border-[#E0E2EA] bg-white px-3 text-[13px] text-[#1D1D1F] outline-none placeholder:text-[#CCCCCC] focus:border-[#1D1D1F] transition-colors ${props.className ?? ''}`}
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    />
  );
}

function SummaryRow({ label, value, accent = 'default' }: { label: string; value: string; accent?: 'default' | 'pink' | 'green' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-[#888888]">{label}</span>
      <span className={`text-[13px] font-semibold ${accent === 'pink' ? 'text-[#F64FA0]' : accent === 'green' ? 'text-[#27AE60]' : 'text-[#1D1D1F]'}`}>{value}</span>
    </div>
  );
}