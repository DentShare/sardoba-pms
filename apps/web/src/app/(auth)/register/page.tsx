'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+998');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = (): string | null => {
    if (!name.trim()) return 'Введите ваше имя';
    if (!email.trim()) return 'Введите email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Введите корректный email';
    if (!phone || !/^\+998\d{9}$/.test(phone)) return 'Введите корректный номер телефона (+998XXXXXXXXX)';
    if (!password) return 'Введите пароль';
    if (password.length < 8) return 'Пароль должен содержать минимум 8 символов';
    if (!/(?=.*[a-z])/.test(password)) return 'Пароль должен содержать строчную букву';
    if (!/(?=.*[A-Z])/.test(password)) return 'Пароль должен содержать заглавную букву';
    if (!/(?=.*\d)/.test(password)) return 'Пароль должен содержать цифру';
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) return 'Пароль должен содержать спецсимвол';
    if (password !== confirmPassword) return 'Пароли не совпадают';
    if (!propertyName.trim()) return 'Введите название отеля';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone,
          password,
          property_name: propertyName.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorObj = errorData as { error?: { message?: string }; message?: string };
        throw new Error(errorObj.error?.message || errorObj.message || 'Registration failed');
      }

      // Redirect to login with success message
      router.push('/login?registered=true');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ошибка при регистрации. Попробуйте позже.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Регистрация</h2>
        <p className="text-sm text-gray-400">
          Создайте аккаунт для управления отелем
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">
          Имя
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Алишер Каримов"
            autoComplete="name"
            required
            className="w-full rounded-lg border border-gray-600 bg-sardoba-dark px-3 py-2.5 pl-10 text-sm text-white placeholder:text-gray-500 focus:border-sardoba-gold focus:outline-none focus:ring-2 focus:ring-sardoba-gold/20 transition-colors"
          />
        </div>
      </div>

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

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1.5">
          Телефон
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              const val = e.target.value;
              if (val.startsWith('+998') && val.length <= 13) {
                setPhone(val.replace(/[^\d+]/g, ''));
              }
            }}
            placeholder="+998901234567"
            autoComplete="tel"
            required
            className="w-full rounded-lg border border-gray-600 bg-sardoba-dark px-3 py-2.5 pl-10 text-sm text-white placeholder:text-gray-500 focus:border-sardoba-gold focus:outline-none focus:ring-2 focus:ring-sardoba-gold/20 transition-colors"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
          Пароль
        </label>
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
            placeholder="Минимум 8 символов"
            autoComplete="new-password"
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
        {/* Password strength hints */}
        {password && (
          <div className="mt-2 space-y-1">
            <div className={`text-xs ${password.length >= 8 ? 'text-green-400' : 'text-gray-500'}`}>
              {password.length >= 8 ? '\u2713' : '\u2022'} Минимум 8 символов
            </div>
            <div className={`text-xs ${/[A-Z]/.test(password) ? 'text-green-400' : 'text-gray-500'}`}>
              {/[A-Z]/.test(password) ? '\u2713' : '\u2022'} Заглавная буква
            </div>
            <div className={`text-xs ${/[a-z]/.test(password) ? 'text-green-400' : 'text-gray-500'}`}>
              {/[a-z]/.test(password) ? '\u2713' : '\u2022'} Строчная буква
            </div>
            <div className={`text-xs ${/\d/.test(password) ? 'text-green-400' : 'text-gray-500'}`}>
              {/\d/.test(password) ? '\u2713' : '\u2022'} Цифра
            </div>
            <div className={`text-xs ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-green-400' : 'text-gray-500'}`}>
              {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? '\u2713' : '\u2022'} Спецсимвол (!@#$%...)
            </div>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
          Подтвердите пароль
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Повторите пароль"
            autoComplete="new-password"
            required
            className="w-full rounded-lg border border-gray-600 bg-sardoba-dark px-3 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-gray-500 focus:border-sardoba-gold focus:outline-none focus:ring-2 focus:ring-sardoba-gold/20 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 transition-colors"
            tabIndex={-1}
          >
            {showConfirmPassword ? (
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
        {confirmPassword && password !== confirmPassword && (
          <p className="mt-1 text-xs text-red-400">Пароли не совпадают</p>
        )}
      </div>

      {/* Property Name */}
      <div>
        <label htmlFor="propertyName" className="block text-sm font-medium text-gray-300 mb-1.5">
          Название отеля
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <input
            id="propertyName"
            type="text"
            value={propertyName}
            onChange={(e) => setPropertyName(e.target.value)}
            placeholder="Sardoba Hotel"
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
            Регистрация...
          </span>
        ) : (
          'Создать аккаунт'
        )}
      </button>

      {/* Link to login */}
      <p className="text-center text-sm text-gray-400">
        Уже есть аккаунт?{' '}
        <Link href="/login" className="text-sardoba-gold hover:text-sardoba-gold-light transition-colors">
          Войти
        </Link>
      </p>
    </form>
  );
}
