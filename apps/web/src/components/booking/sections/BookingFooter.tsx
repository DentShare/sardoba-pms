'use client';

import type { HotelPublicInfo } from '@/lib/api/public-booking';

interface BookingFooterProps {
  hotel: HotelPublicInfo;
}

/**
 * Footer matching hotel-site-cozy.html:
 * Logo mark + name, copyright, powered-by link.
 */
export function BookingFooter({ hotel }: BookingFooterProps) {
  const year = new Date().getFullYear();
  const initial = hotel.name.charAt(0).toUpperCase();

  return (
    <footer
      className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-14 py-10"
      style={{ background: 'var(--t-footer-bg)', color: 'rgba(255,255,255,.7)' }}
    >
      {/* Logo area */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-base"
          style={{ background: 'var(--t-primary)', fontFamily: 'var(--t-font-heading)', fontWeight: 400 }}
        >
          {initial}
        </div>
        <span
          className="text-[17px] text-white"
          style={{ fontFamily: 'var(--t-font-heading)', fontWeight: 400 }}
        >
          {hotel.name}
        </span>
      </div>

      {/* Copyright */}
      <span className="text-xs opacity-80">
        &copy; {year} &middot; {hotel.city}, Узбекистан
      </span>

      {/* Powered by */}
      <span className="text-[11px] flex items-center gap-1.5">
        Работает на{' '}
        <span className="font-semibold" style={{ color: 'var(--t-primary)' }}>
          Sardoba PMS
        </span>
      </span>
    </footer>
  );
}
