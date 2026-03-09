'use client';

import { useBookingTheme } from '@/lib/themes';
import type { HotelPublicInfo } from '@/lib/api/public-booking';
import { IconMapPin, IconPhone, IconClock, IconChevronDown, IconMail } from '../icons/booking-icons';

interface BookingHeroCenteredProps {
  hotel: HotelPublicInfo;
}

/**
 * Full-viewport centered hero for luxury + modern-clean themes.
 * Cover photo with overlay gradient. Hotel name, city/address, phone, CTA button.
 */
export function BookingHeroCentered({ hotel }: BookingHeroCenteredProps) {
  const { theme } = useBookingTheme();
  const showNoise = theme.effects.noiseTexture;

  return (
    <section
      className="relative flex items-end"
      style={{ minHeight: theme.layout.heroMinHeight || '70vh' }}
    >
      {/* Background */}
      {hotel.cover_photo ? (
        <img
          src={hotel.cover_photo}
          alt={hotel.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-700" />
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: theme.layout.heroOverlayGradient || 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.3), transparent)' }}
      />

      {/* Noise texture overlay */}
      {showNoise && (
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
            backgroundRepeat: 'repeat',
          }}
        />
      )}

      {/* Decorative pattern */}
      {theme.effects.backgroundPattern && (
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: theme.effects.backgroundPattern }} />
      )}

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-20">
        <div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight"
            style={{ fontFamily: 'var(--t-font-heading)' }}
          >
            {hotel.name}
          </h1>

          <div className="flex flex-wrap gap-4 text-white/80 text-sm sm:text-base mb-6">
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

          <div className="flex flex-wrap gap-4 text-white/70 text-sm">
            <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5">
              <IconClock className="text-t-primary" />
              Заезд с {hotel.checkin_time}
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5">
              <IconClock className="text-t-primary" />
              Выезд до {hotel.checkout_time}
            </span>
          </div>
        </div>

        {/* CTA */}
        <a
          href="#booking"
          className="mt-8 inline-flex items-center gap-2 booking-btn-primary text-base"
        >
          Забронировать номер
          <IconChevronDown />
        </a>
      </div>
    </section>
  );
}
