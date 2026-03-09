'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  Users,
  BarChart3,
  ScrollText,
  CreditCard,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Layers,
  HeartPulse,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

interface NavSection {
  title: string;
  items: { name: string; href: string; icon: typeof LayoutDashboard }[];
}

const sections: NavSection[] = [
  {
    title: 'Обзор',
    items: [
      { name: 'Дашборд', href: '/', icon: LayoutDashboard },
      { name: 'Аналитика', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Управление',
    items: [
      { name: 'Отели', href: '/hotels', icon: Building2 },
      { name: 'Бронирования', href: '/bookings', icon: CalendarCheck },
      { name: 'Пользователи', href: '/users', icon: Users },
    ],
  },
  {
    title: 'Монетизация',
    items: [
      { name: 'Тарифы', href: '/tariffs', icon: Layers },
      { name: 'Подписки', href: '/subscriptions', icon: CreditCard },
    ],
  },
  {
    title: 'Система',
    items: [
      { name: 'Здоровье системы', href: '/system-health', icon: HeartPulse },
      { name: 'Логи и ошибки', href: '/logs', icon: ScrollText },
      { name: 'Рассылки', href: '/notifications', icon: MessageSquare },
      { name: 'Настройки', href: '/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 z-40 h-screen bg-gray-950 text-white transition-all duration-300 flex flex-col',
        collapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-bold tracking-tight">SARDOBA</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-widest">Super Admin</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {sections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      )}
                      title={collapsed ? item.name : undefined}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {!collapsed && <span>{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-white/10 text-gray-400 hover:text-white transition-colors shrink-0"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
