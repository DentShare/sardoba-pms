'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { useBookingTheme } from '@/lib/themes';
import { IconBed } from '../icons/booking-icons';

const NAV_LINKS = [
  { label: 'Главная', href: '#' },
  { label: 'Номера', href: '#rooms' },
  { label: 'Бронирование', href: '#booking' },
  { label: 'Контакты', href: '#contacts' },
];

interface BookingNavbarProps {
  hotelName: string;
  logoUrl?: string | null;
}

export function BookingNavbar({ hotelName, logoUrl }: BookingNavbarProps) {
  const { theme } = useBookingTheme();
  const navStyle = theme.layout.navStyle;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (navStyle !== 'transparent-scroll') return;
    const handler = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [navStyle]);

  const showSolid = navStyle !== 'transparent-scroll' || scrolled;

  const navClasses = cn(
    'fixed top-0 left-0 right-0 z-40 transition-all duration-300 backdrop-blur-xl',
    showSolid && 'border-b',
    !showSolid && 'bg-transparent',
  );

  const navInlineStyle: React.CSSProperties = showSolid
    ? {
        background: 'var(--t-nav-bg)',
        color: 'var(--t-nav-text)',
        borderColor: 'var(--t-border-subtle)',
      }
    : { color: '#fff' };

  return (
    <nav className={navClasses} style={navInlineStyle}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo + name */}
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={hotelName}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <IconBed className="text-t-primary" />
          )}
          <span
            className="font-bold text-lg truncate max-w-[200px] sm:max-w-none"
            style={{ fontFamily: 'var(--t-font-heading)', color: 'inherit' }}
          >
            {hotelName}
          </span>
        </div>

        {/* Nav links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors duration-200 hover:opacity-80 cursor-pointer"
              style={{ color: 'inherit' }}
              onClick={(e) => {
                if (link.href === '#') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA button */}
        <a
          href="#booking"
          className="booking-btn-primary px-5 py-2 text-sm"
        >
          Забронировать
        </a>
      </div>
    </nav>
  );
}
