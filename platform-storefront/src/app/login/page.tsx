'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      await login({ email, password });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка входа. Проверьте данные.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ backgroundColor: '#EFEFEF' }}
    >
      <div className="w-full max-w-[420px]">
        {/* Карточка — без border, только тень как на скрине */}
        <div
          className="bg-white px-10 py-12"
          style={{
            boxShadow: '0 2px 24px 0 rgba(0,0,0,0.07), 0 1.5px 6px 0 rgba(0,0,0,0.04)',
            borderRadius: '2px',
          }}
        >
          {/* Логотип по центру */}
          <div className="flex justify-center mb-10">
            <Image
              src="/logo.png"
              alt="Логотип"
              width={150}
              height={150}
              className="object-contain"
              priority
            />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {error && (
                <div className="text-[13px] text-red-500 text-center">
                  {error}
                </div>
              )}

              {/* Email — underline стиль как на скрине */}
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="Введите ваш email"
                  className="w-full bg-transparent outline-none text-[14px] text-center pb-2 placeholder:text-[#AAAAAA] text-[#1D1D1F]"
                  style={{
                    borderBottom: '1px solid #D0D0D0',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                  }}
                />
              </div>

              {/* Password — underline стиль */}
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Пароль"
                  className="w-full bg-transparent outline-none text-[14px] text-center pb-2 placeholder:text-[#AAAAAA] text-[#1D1D1F]"
                  style={{
                    borderBottom: '1px solid #D0D0D0',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                  }}
                />
              </div>

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
                  {isLoading ? 'Вход...' : 'Войти'}
                </button>
              </div>
            </div>

            {/* Ссылки снизу */}
            <div className="mt-5 flex flex-col items-center gap-2">
              <Link
                href="/register"
                className="text-[13px] font-semibold text-[#1D1D1F] hover:underline"
              >
                Регистрация
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