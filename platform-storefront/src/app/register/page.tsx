'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const [form, setForm] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    try {
      await register({
        ...form,
        confirmPassword: form.confirmPassword,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации.');
    }
  }

  const inputClass =
    'w-full bg-transparent outline-none text-[14px] text-center pb-2 placeholder:text-[#AAAAAA] text-[#1D1D1F] transition-colors duration-200';

  const inputStyle: React.CSSProperties = {
    borderBottom: '1px solid #D0D0D0',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ backgroundColor: '#EFEFEF' }}
    >
      <div className="w-full max-w-[420px]">
        {/* Карточка */}
        <div
          className="bg-white px-10 py-12"
          style={{
            boxShadow:
              '0 2px 24px 0 rgba(0,0,0,0.07), 0 1.5px 6px 0 rgba(0,0,0,0.04)',
            borderRadius: '2px',
          }}
        >
          {/* Логотип */}
          <div className="flex justify-center mb-9">
            <Image
              src="/logo.png"
              alt="Логотип"
              width={130}
              height={130}
              className="object-contain"
              priority
            />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {error && (
                <p className="text-[13px] text-red-500 text-center">{error}</p>
              )}

              {/* Имя + Фамилия */}
              <div className="grid grid-cols-2 gap-5">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                  autoComplete="given-name"
                  placeholder="Имя"
                  className={inputClass}
                  style={inputStyle}
                />
                <input
                  type="text"
                  value={form.surname}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, surname: e.target.value }))
                  }
                  required
                  autoComplete="family-name"
                  placeholder="Фамилия"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              {/* Email */}
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                required
                autoComplete="email"
                placeholder="Email"
                className={inputClass}
                style={inputStyle}
              />

              {/* Пароль */}
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                required
                autoComplete="new-password"
                placeholder="Пароль"
                className={inputClass}
                style={inputStyle}
              />

              {/* Подтверждение пароля */}
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((f) => ({ ...f, confirmPassword: e.target.value }))
                }
                required
                autoComplete="new-password"
                placeholder="Подтвердите пароль"
                className={inputClass}
                style={inputStyle}
              />

              {/* Кнопка */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full text-[14px] font-semibold text-white transition duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor: '#1D1D1F',
                    borderRadius: '999px',
                    height: '46px',
                  }}
                >
                  {isLoading ? 'Регистрация...' : 'Создать аккаунт'}
                </button>
              </div>
            </div>

            {/* Ссылки снизу */}
            <div className="mt-5 flex flex-col items-center gap-2">
              <Link
                href="/login"
                className="text-[13px] font-semibold text-[#1D1D1F] hover:underline"
              >
                Войти в аккаунт
              </Link>
              <Link
                href="/forgot-password"
                className="text-[13px] text-[#AAAAAA] hover:underline"
              >
                Забыли пароль?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}