'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { BellIcon } from '@/components/icons';

// ─── Page title mapping ─────────────────────────────────────────────────────

const pageTitles: Record<string, { title: string; breadcrumbs?: string[] }> = {
  '/calendar': { title: 'Шахматка' },
  '/bookings': { title: 'Бронирования' },
  '/guests': { title: 'Гости' },
  '/analytics': { title: 'Аналитика' },
  '/rates': { title: 'Тарифы' },
  '/settings/rooms': {
    title: 'Номера',
    breadcrumbs: ['Настройки', 'Номера'],
  },
  '/settings/channels': {
    title: 'Каналы',
    breadcrumbs: ['Настройки', 'Каналы'],
  },
  '/settings/notifications': {
    title: 'Уведомления',
    breadcrumbs: ['Настройки', 'Уведомления'],
  },
  '/onboarding': { title: 'Настройка' },
  '/housekeeping': { title: 'Housekeeping' },
  '/group-bookings': { title: 'Групповые бронирования' },
  '/settings/general': {
    title: 'Основные настройки',
    breadcrumbs: ['Настройки', 'Основные'],
  },
  '/settings/team': {
    title: 'Команда',
    breadcrumbs: ['Настройки', 'Команда'],
  },
  '/settings/pricing': {
    title: 'Ценообразование',
    breadcrumbs: ['Настройки', 'Ценообразование'],
  },
  '/settings/extras': {
    title: 'Доп. услуги',
    breadcrumbs: ['Настройки', 'Доп. услуги'],
  },
  '/settings/floor-plan': {
    title: 'План этажей',
    breadcrumbs: ['Настройки', 'План этажей'],
  },
  '/settings/booking-page': {
    title: 'Онлайн-бронирование',
    breadcrumbs: ['Настройки', 'Онлайн-бронирование'],
  },
};

function getPageInfo(pathname: string): { title: string; breadcrumbs?: string[] } {
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }

  if (pathname.startsWith('/bookings/')) {
    return { title: 'Бронирование', breadcrumbs: ['Бронирования'] };
  }
  if (pathname.startsWith('/guests/')) {
    return { title: 'Гость', breadcrumbs: ['Гости'] };
  }
  if (pathname.startsWith('/settings/')) {
    return { title: 'Настройки' };
  }

  return { title: 'Панель управления' };
}

// ─── Header component ───────────────────────────────────────────────────────

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { title, breadcrumbs } = getPageInfo(pathname);

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left: Title + Breadcrumbs */}
        <div className="flex items-center gap-3 ml-12 lg:ml-0">
          <div>
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    )}
                    {crumb}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <button
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Уведомления"
          >
            <BellIcon size={20} />
            {/* Notification dot - uncomment when notifications API exists */}
            {/* <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" /> */}
          </button>

          {/* User avatar */}
          {user && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-sardoba-blue flex items-center justify-center text-white text-sm font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-700 leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] text-gray-400 leading-tight">Администратор</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
