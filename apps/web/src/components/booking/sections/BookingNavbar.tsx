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
 * Fixed navbar matching hotel-site-cozy.html:
 * Logo mark + name, nav links (hidden mobile), CTA button.
 * Transparent on top, solid on scroll for transparent-scroll navStyle.
 */
export function BookingNavbar({ hotelName, logoUrl }: BookingNavbarProps) {
  const { theme } = useBookingTheme();
  const navStyle = theme.layout.navStyle;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (navStyle !== 'transparent-scroll') return;
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [navStyle]);

  const showSolid = navStyle !== 'transparent-scroll' || scrolled;

  // Get first letter for logo mark
  const initial = hotelName.charAt(0).toUpperCase();

  return (
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
              className="text-[13px] font-medium no-underline transition-colors duration-200 cursor-pointer"
              style={{ color: showSolid ? 'var(--t-nav-text)' : 'var(--t-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = showSolid ? 'var(--t-nav-text)' : 'var(--t-text-muted)'; }}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      {/* Right: CTA button */}
      <div className="flex items-center gap-3">
        <a
          href="#booking"
          className="px-5 py-2.5 text-[13px] font-semibold text-white rounded-2xl transition-all hover:-translate-y-px cursor-pointer"
          style={{
            background: 'var(--t-primary)',
            fontFamily: 'var(--t-font-body)',
          }}
        >
          Забронировать
        </a>
      </div>
    </nav>
  );
}
