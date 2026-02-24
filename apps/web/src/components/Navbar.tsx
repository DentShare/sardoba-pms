'use client';

import { useState } from 'react';
import { useScrollProgress, useActiveSection } from '@/lib/hooks';

const NAV_ITEMS = [
  { id: 'features', label: 'Возможности' },
  { id: 'dashboard', label: 'Платформа' },
  { id: 'pricing', label: 'Тарифы' },
  { id: 'testimonials', label: 'Отзывы' },
  { id: 'contact', label: 'Контакты' },
];

export function Navbar() {
  const { progress, isScrolled } = useScrollProgress();
  const activeSection = useActiveSection(NAV_ITEMS.map((i) => i.id));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-sardoba-dark/50">
        <div
          className="h-full bg-gradient-to-r from-sardoba-gold to-sardoba-gold-light transition-all duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <nav
        className={`fixed top-2 left-4 right-4 z-50 rounded-2xl transition-all duration-500 ${
          isScrolled ? 'nav-glass shadow-lg' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sardoba-gold to-sardoba-gold-dark flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <span className="text-sardoba-dark font-bold text-sm">S</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">
              Sardoba<span className="text-sardoba-gold">.pms</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${
                  activeSection === item.id
                    ? 'text-sardoba-gold bg-sardoba-gold/10'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="#contact"
              className="px-5 py-2.5 bg-sardoba-gold text-sardoba-dark font-semibold text-sm rounded-xl transition-all duration-300 cursor-pointer hover:bg-sardoba-gold-light hover:shadow-glow-gold hover:-translate-y-0.5"
            >
              Начать бесплатно
            </a>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-white p-2 cursor-pointer"
            aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            {mobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden px-6 pb-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeSection === item.id
                    ? 'text-sardoba-gold bg-sardoba-gold/10'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </a>
            ))}
            <a
              href="#contact"
              onClick={() => setMobileOpen(false)}
              className="block text-center mt-3 px-5 py-3 bg-sardoba-gold text-sardoba-dark font-semibold text-sm rounded-xl cursor-pointer"
            >
              Начать бесплатно
            </a>
          </div>
        )}
      </nav>
    </>
  );
}
