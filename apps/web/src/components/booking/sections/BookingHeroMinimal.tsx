'use client';

import { useBookingTheme } from '@/lib/themes';
import type { HotelPublicInfo } from '@/lib/api/public-booking';
import { IconMapPin, IconPhone, IconMail } from '../icons/booking-icons';

interface BookingHeroMinimalProps {
  hotel: HotelPublicInfo;
}

/**
 * Compact hero for fresh-green + minimal-white themes.
 * Uses theme.layout.heroMinHeight and heroOverlayGradient from presets.
 */
export function BookingHeroMinimal({ hotel }: BookingHeroMinimalProps) {
  const { theme } = useBookingTheme();
  const minHeight = theme.layout.heroMinHeight;
  const overlayGradient = theme.layout.heroOverlayGradient;

  return (
    <section className="relative overflow-hidden" style={{ minHeight }}>
      {/* Cover photo */}
      {hotel.cover_photo ? (
        <img
          src={hotel.cover_photo}
          alt={hotel.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, var(--t-primary), var(--t-primary-light))` }}
        />
      )}

      {/* Overlay gradient from theme */}
      <div className="absolute inset-0" style={{ background: overlayGradient }} />

      {/* Content at bottom */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-4 sm:px-6 lg:px-8 pb-8 pt-16 max-w-7xl mx-auto w-full">
        <h1
          className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight"
          style={{ fontFamily: 'var(--t-font-heading)' }}
        >
          {hotel.name}
        </h1>
        <div className="flex flex-wrap gap-4 text-white/80 text-sm">
          <span className="flex items-center gap-1.5">
            <IconMapPin className="text-t-primary shrink-0" />
            {hotel.city}, {hotel.address}
          </span>
          <a href={`tel:${hotel.phone}`} className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
            <IconPhone className="text-t-primary shrink-0" />
            {hotel.phone}
          </a>
          {hotel.mini_site_config?.email && (
            <a href={`mailto:${hotel.mini_site_config.email}`} className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
              <IconMail className="text-t-primary shrink-0" />
              {hotel.mini_site_config.email}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
