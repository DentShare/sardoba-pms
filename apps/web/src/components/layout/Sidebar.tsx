'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/auth';
import { useBookingStore } from '@/lib/store/use-booking-store';
import {
  CalendarIcon,
  UsersIcon,
  ChartIcon,
  TagIcon,
  BellIcon,
} from '@/components/icons';

// ─── Icons not in shared icons.tsx ──────────────────────────────────────────

function DocumentIcon({ className = '', size = 20 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function CogIcon({ className = '', size = 20 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function BedSmallIcon({ className = '', size = 18 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" />
    </svg>
  );
}

function LinkIcon({ className = '', size = 18 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function GlobeIcon({ className = '', size = 18 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function StarIcon({ className = '', size = 18 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function LogoutIcon({ className = '', size = 20 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function ChevronIcon({ className = '', size = 16, open }: { className?: string; size?: number; open: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('transition-transform duration-200', open && 'rotate-90', className)}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function MenuIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

// ─── Navigation structure ───────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: { label: string; href: string; icon: React.ReactNode }[];
}

const navigation: NavItem[] = [
  {
    label: 'Шахматка',
    href: '/calendar',
    icon: <CalendarIcon size={20} />,
  },
  {
    label: 'Бронирования',
    href: '/bookings',
    icon: <DocumentIcon />,
  },
  {
    label: 'Гости',
    href: '/guests',
    icon: <UsersIcon size={20} />,
  },
  {
    label: 'Аналитика',
    href: '/analytics',
    icon: <ChartIcon size={20} />,
  },
  {
    label: 'Тарифы',
    href: '/rates',
    icon: <TagIcon size={20} />,
  },
  {
    label: 'Настройки',
    href: '/settings',
    icon: <CogIcon />,
    children: [
      {
        label: 'Номера',
        href: '/settings/rooms',
        icon: <BedSmallIcon />,
      },
      {
        label: 'Каналы',
        href: '/settings/channels',
        icon: <LinkIcon />,
      },
      {
        label: 'Уведомления',
        href: '/settings/notifications',
        icon: <BellIcon size={18} />,
      },
      {
        label: 'Страница бронирования',
        href: '/settings/booking-page',
        icon: <GlobeIcon />,
      },
      {
        label: 'Доп. услуги',
        href: '/settings/extras',
        icon: <StarIcon />,
      },
    ],
  },
];

// ─── Sidebar Component ─────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { sidebarOpen, toggleSidebar } = useBookingStore();
  const [settingsOpen, setSettingsOpen] = useState(
    pathname.startsWith('/settings'),
  );

  const isActive = (href: string) => {
    if (href === '/settings') {
      return pathname.startsWith('/settings');
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-sardoba-blue text-white shadow-lg hover:bg-sardoba-blue-light transition-colors"
        aria-label="Открыть меню"
      >
        {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-sardoba-blue flex flex-col',
          'transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Property name */}
        <div className="px-5 py-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white truncate">
            Sardoba <span className="text-sardoba-gold">PMS</span>
          </h2>
          {user && (
            <p className="mt-0.5 text-xs text-gray-400 truncate">
              {user.name}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const active = isActive(item.href);

              if (item.children) {
                return (
                  <li key={item.href}>
                    <button
                      onClick={() => setSettingsOpen(!settingsOpen)}
                      className={cn(
                        'flex items-center justify-between w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-white/10 text-sardoba-gold'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white',
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span className={cn(active && 'text-sardoba-gold')}>
                          {item.icon}
                        </span>
                        {item.label}
                      </span>
                      <ChevronIcon open={settingsOpen} />
                    </button>

                    {settingsOpen && (
                      <ul className="mt-1 ml-5 space-y-1 border-l border-white/10 pl-3">
                        {item.children.map((child) => {
                          const childActive = isActive(child.href);
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={() => {
                                  if (sidebarOpen) toggleSidebar();
                                }}
                                className={cn(
                                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                                  childActive
                                    ? 'text-sardoba-gold bg-white/5'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5',
                                )}
                              >
                                {child.icon}
                                {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (sidebarOpen) toggleSidebar();
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-white/10 text-sardoba-gold'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <span className={cn(active && 'text-sardoba-gold')}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User menu at bottom */}
        <div className="border-t border-white/10 px-3 py-4">
          {user && (
            <div className="flex items-center gap-3 px-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-sardoba-gold/20 flex items-center justify-center text-sardoba-gold text-sm font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogoutIcon />
            Выйти
          </button>
        </div>
      </aside>
    </>
  );
}
