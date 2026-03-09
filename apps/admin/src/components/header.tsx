'use client';

import { Bell, Search, ChevronDown, ExternalLink, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'SA';

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {searchOpen ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Поиск отелей, пользователей, бронирований..."
              className="w-96 pl-10 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              onBlur={() => setSearchOpen(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Поиск...</span>
            <kbd className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 rounded border bg-gray-50 text-[10px] font-mono text-gray-400">
              Ctrl+K
            </kbd>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <a
          href="http://localhost:3002"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-brand-600 transition-colors"
          title="Открыть PMS клиента"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Открыть PMS
        </a>

        <button className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="h-6 w-px bg-gray-200" />

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-medium">
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium text-gray-900">{user?.name ?? 'Super Admin'}</div>
              <div className="text-[10px] text-gray-500">{user?.email ?? ''}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
