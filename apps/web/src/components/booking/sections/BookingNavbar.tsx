'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { useBookingTheme } from '@/lib/themes';

const NAV_LINKS = [
  { label: 'Об отеле', href: '#about' },
  { label: 'Номера', href: '#rooms' },
  { label: 'Как добраться', href: '#location' },
  { label: 'Бронирование', href: '#booking' },
];

interface BookingNavbarProps {
  hotelName: string;
  logoUrl?: string | null;
}

/**
 * Fixed navbar with logo initial, nav links, mobile hamburger menu,
 * language badge, and CTA button. Transparent-on-scroll for silk-road.
 */
export function BookingNavbar({ hotelName, logoUrl }: BookingNavbarProps) {
  const { theme, isDark } = useBookingTheme();
  const navStyle = theme.layout.navStyle;
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (navStyle !== 'transparent-scroll') return;
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [navStyle]);

  const showSolid = navStyle !== 'transparent-scroll' || scrolled;
  const initial = hotelName.charAt(0).toUpperCase();

  function handleLinkClick() {
    setMobileOpen(false);
  }

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 h-[68px] flex items-center justify-between px-5 sm:px-10 transition-all duration-400',
          showSolid && 'backdrop-blur-xl',
        )}
        style={
          showSolid
            ? {
                background: 'var(--t-nav-bg)',
                boxShadow: '0 1px 0 rgba(var(--t-primary-rgb, 196,112,74), 0.12)',
              }
            : { background: 'transparent' }
        }
      >
        {/* Logo */}
        <a
          href="#"
          className="flex items-center gap-2.5 no-underline cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt={hotelName} className="h-9 w-auto object-contain" />
          ) : (
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white text-lg"
              style={{ background: 'var(--t-primary)', fontFamily: 'var(--t-font-heading)', fontWeight: 400 }}
            >
              {initial}
            </div>
          )}
          <span
            className="text-[19px] tracking-tight truncate max-w-[200px] sm:max-w-none"
            style={{
              fontFamily: 'var(--t-font-heading)',
              fontWeight: 400,
              letterSpacing: '-0.01em',
              color: showSolid ? 'var(--t-nav-text)' : 'var(--t-text)',
            }}
          >
            {hotelName}
          </span>
        </a>

        {/* Nav links — hidden on mobile */}
        <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-[11px] uppercase tracking-[0.12em] font-medium no-underline transition-colors duration-200 cursor-pointer"
                style={{ color: showSolid ? 'var(--t-nav-text)' : 'var(--t-text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = showSolid ? 'var(--t-nav-text)' : 'var(--t-text-muted)'; }}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Right: Language + CTA + Hamburger */}
        <div className="flex items-center gap-3">
          {/* Language badge */}
          <button
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium uppercase tracking-[0.06em] transition-colors"
            style={{
              background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)',
              color: showSolid ? 'var(--t-nav-text)' : 'var(--t-text-muted)',
              border: isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(0,0,0,.08)',
            }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            RU
          </button>

          {/* CTA button — hidden on mobile */}
          <a
            href="#booking"
            className="hidden sm:inline-flex px-5 py-2.5 text-[13px] font-semibold text-white rounded-2xl transition-all hover:-translate-y-px cursor-pointer"
            style={{ background: 'var(--t-primary)', fontFamily: 'var(--t-font-body)' }}
          >
            Забронировать
          </a>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Меню"
          >
            <span
              className={cn('w-5 h-px transition-all duration-300', mobileOpen && 'rotate-45 translate-y-[3.5px]')}
              style={{ background: showSolid ? 'var(--t-nav-text)' : 'var(--t-text)' }}
            />
            <span
              className={cn('w-5 h-px transition-all duration-300', mobileOpen && 'opacity-0')}
              style={{ background: showSolid ? 'var(--t-nav-text)' : 'var(--t-text)' }}
            />
            <span
              className={cn('w-5 h-px transition-all duration-300', mobileOpen && '-rotate-45 -translate-y-[3.5px]')}
              style={{ background: showSolid ? 'var(--t-nav-text)' : 'var(--t-text)' }}
            />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden pt-[68px]"
          style={{
            background: isDark ? 'rgba(10,10,8,.97)' : 'rgba(255,255,255,.97)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex flex-col items-center gap-6 pt-10">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleLinkClick}
                className="text-[14px] uppercase tracking-[0.12em] font-medium no-underline transition-colors"
                style={{ color: 'var(--t-text)' }}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#booking"
              onClick={handleLinkClick}
              className="mt-4 px-8 py-3 text-[14px] font-semibold text-white rounded-2xl"
              style={{ background: 'var(--t-primary)' }}
            >
              Забронировать
            </a>
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium uppercase tracking-[0.06em]"
              style={{
                background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)',
                color: 'var(--t-text-muted)',
                border: isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(0,0,0,.08)',
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              Русский
            </button>
          </div>
        </div>
      )}
    </>
  );
}
