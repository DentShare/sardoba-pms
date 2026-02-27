'use client';

import { useState, type FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isRegistered = searchParams.get('registered') === 'true';
  const isReset = searchParams.get('reset') === 'true';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);

      // Redirect to the intended page or /calendar (validated to prevent open redirect)
      const raw = searchParams.get('redirect') || '/calendar';
      const redirect = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/calendar';
      router.push(redirect);
    } catch (err: unknown) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError('Неверный email или пароль');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Вход в систему</h2>
        <p className="text-sm text-gray-400">
          Введите ваши данные для входа
        </p>
      </div>

      {/* Success messages */}
      {isRegistered && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3">
          <p className="text-sm text-green-400">Аккаунт успешно создан! Войдите с вашими данными.</p>
        </div>
      )}

      {isReset && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3">
          <p className="text-sm text-green-400">Пароль успешно изменён! Войдите с новым паролем.</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
          Email
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@hotel.uz"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-gray-600 bg-sardoba-dark px-3 py-2.5 pl-10 text-sm text-white placeholder:text-gray-500 focus:border-sardoba-gold focus:outline-none focus:ring-2 focus:ring-sardoba-gold/20 transition-colors"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-gray-300">
            Пароль
          </label>
          <Link href="/forgot-password" className="text-xs text-sardoba-gold hover:text-sardoba-gold-light transition-colors">
            Забыли пароль?
          </Link>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-gray-600 bg-sardoba-dark px-3 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-gray-500 focus:border-sardoba-gold focus:outline-none focus:ring-2 focus:ring-sardoba-gold/20 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="m1 1 22 22" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-sardoba-gold py-2.5 text-sm font-semibold text-sardoba-dark transition-all duration-200 hover:bg-sardoba-gold-light hover:shadow-glow-gold focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:ring-offset-2 focus:ring-offset-sardoba-dark disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Вход...
          </span>
        ) : (
          'Войти'
        )}
      </button>

      {/* Link to register */}
      <p className="text-center text-sm text-gray-400">
        Нет аккаунта?{' '}
        <Link href="/register" className="text-sardoba-gold hover:text-sardoba-gold-light transition-colors">
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Вход в систему</h2>
          <p className="text-sm text-gray-400">Загрузка...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
