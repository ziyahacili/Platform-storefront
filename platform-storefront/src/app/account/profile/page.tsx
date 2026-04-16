'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

export default function ProfilePage() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-3xl border border-fuchsia-100 bg-fuchsia-50 px-6 py-12 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Профиль</h1>
          <p className="mt-2 text-slate-600">
            Войдите в аккаунт, чтобы увидеть данные профиля
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-[#e11e86] px-6 py-3 font-medium text-white transition hover:bg-[#d7197d]"
          >
            Войти
          </Link>
        </div>
      </div>
    );
  }

  const initials =
    `${user.name?.slice(0, 1) ?? ''}${user.surname?.slice(0, 1) ?? ''}`.trim() || 'U';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
        <div className="bg-[linear-gradient(135deg,#8c2cff_0%,#e61e86_55%,#ff4d6d_100%)] px-6 py-10 text-white sm:px-10">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold backdrop-blur">
              {initials}
            </div>
            <div>
              <h1 className="text-3xl font-bold">Профиль</h1>
              <p className="mt-1 text-white/85">
                Личный кабинет клиента Birmarket
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:p-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4">
            <InfoRow label="Имя" value={user.name ?? '—'} />
            <InfoRow label="Фамилия" value={user.surname ?? '—'} />
            <InfoRow label="Email" value={user.email ?? '—'} />
            <InfoRow label="Телефон" value={user.phoneNumber ?? '—'} />
          </div>

          <div className="space-y-4">
            <ActionCard title="Мои заказы" text="Посмотреть историю заказов" href="/orders" />
            <ActionCard title="Корзина" text="Перейти к вашим товарам" href="/cart" />
            <ActionCard title="Избранное" text="Сохраненные товары" href="/shop/favorites" />

            <button
              onClick={logout}
              className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-left font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Выйти из аккаунта
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-base font-medium text-slate-900">{value}</div>
    </div>
  );
}

function ActionCard({
  title,
  text,
  href,
}: {
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-slate-100 bg-white px-5 py-4 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{text}</div>
    </Link>
  );
}