'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Введите email');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Введите корректный email');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setIsSuccess(true);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      if (axiosError?.response?.data?.error?.message) {
        setError(axiosError.response.data.error.message);
      } else {
        setError('Ошибка при отправке. Попробуйте позже.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Проверьте почту</h2>
          <p className="text-sm text-gray-400">
            Ссылка для восстановления отправлена на email
          </p>
        </div>

        <div className="rounded-lg bg-sardoba-gold/10 border border-sardoba-gold/20 px-4 py-4">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 text-sardoba-gold flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <div>
              <p className="text-sm text-gray-300">
                Если аккаунт с адресом <span className="text-white font-medium">{email}</span> существует, на него будет отправлена ссылка для сброса пароля.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Проверьте также папку «Спам», если письмо не пришло.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/login"
          className="block w-full rounded-lg bg-sardoba-gold py-2.5 text-center text-sm font-semibold text-sardoba-dark transition-all duration-200 hover:bg-sardoba-gold-light hover:shadow-glow-gold focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:ring-offset-2 focus:ring-offset-sardoba-dark"
        >
          Вернуться к входу
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Восстановление пароля</h2>
        <p className="text-sm text-gray-400">
          Введите email, привязанный к вашему аккаунту
        </p>
      </div>

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
            Отправка...
          </span>
        ) : (
          'Отправить ссылку'
        )}
      </button>

      {/* Link to login */}
      <p className="text-center text-sm text-gray-400">
        Вспомнили пароль?{' '}
        <Link href="/login" className="text-sardoba-gold hover:text-sardoba-gold-light transition-colors">
          Войти
        </Link>
      </p>
    </form>
  );
}
