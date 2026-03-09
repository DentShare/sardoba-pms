'use client';

import type { HotelPublicInfo } from '@/lib/api/public-booking';

interface BookingFooterProps {
  hotel: HotelPublicInfo;
}

export function BookingFooter({ hotel }: BookingFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-t-footer-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Hotel name */}
          <p
            className="text-sm font-semibold text-t-footer-text"
            style={{ fontFamily: 'var(--t-font-heading)' }}
          >
            {hotel.name}
          </p>

          {/* Copyright */}
          <p className="text-xs text-t-footer-text opacity-60">
            &copy; {year}. Все права защищены.
          </p>

          {/* PMS branding */}
          <p className="text-xs text-t-footer-text opacity-60">
            Работает на{' '}
            <span className="font-semibold text-t-footer-text">
              Sardoba <span className="text-t-primary">PMS</span>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
