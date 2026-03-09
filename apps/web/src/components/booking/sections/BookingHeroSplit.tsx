'use client';

import { useBookingTheme } from '@/lib/themes';
import type { HotelPublicInfo } from '@/lib/api/public-booking';
import { IconMapPin, IconPhone, IconClock, IconCheck, IconMail } from '../icons/booking-icons';

interface BookingHeroSplitProps {
  hotel: HotelPublicInfo;
}

/**
 * CSS Grid 2-column hero for "cozy-guest-house" theme.
 * Left: text + perks list, Right: cover photo/gradient.
 */
export function BookingHeroSplit({ hotel }: BookingHeroSplitProps) {
  const { theme } = useBookingTheme();

  const perks = [
    'Уютная домашняя атмосфера',
    'Заезд с ' + hotel.checkin_time,
    'Выезд до ' + hotel.checkout_time,
  ];

  return (
    <section
      className="relative grid grid-cols-1 lg:grid-cols-2"
      style={{ minHeight: theme.layout.heroMinHeight || '70vh' }}
    >
      {/* Left: Text content */}
      <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-20 pt-28 bg-t-bg">
        {/* Badge */}
        <span
          className="inline-block self-start px-3 py-1 rounded-full text-xs font-semibold mb-6"
          style={{ backgroundColor: 'var(--t-primary-light)', color: 'var(--t-primary)' }}
        >
          Добро пожаловать
        </span>

        <h1
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-t-text mb-4 leading-tight"
          style={{ fontFamily: 'var(--t-font-heading)' }}
        >
          {hotel.name}
        </h1>

        <div className="text-t-text-muted text-base sm:text-lg mb-6 max-w-lg space-y-2">
          <span className="flex items-center gap-1.5">
            <IconMapPin className="text-t-primary shrink-0" />
            {hotel.city}, {hotel.address}
          </span>
          <a href={`tel:${hotel.phone}`} className="flex items-center gap-1.5 hover:text-t-primary transition-colors cursor-pointer">
            <IconPhone className="text-t-primary shrink-0" />
            {hotel.phone}
          </a>
          {hotel.mini_site_config?.email && (
            <a href={`mailto:${hotel.mini_site_config.email}`} className="flex items-center gap-1.5 hover:text-t-primary transition-colors cursor-pointer">
              <IconMail className="text-t-primary shrink-0" />
              {hotel.mini_site_config.email}
            </a>
          )}
        </div>

        {/* Perks */}
        <ul className="space-y-2 mb-8">
          {perks.map((perk, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-t-text-muted">
              <IconCheck className="text-t-primary shrink-0" />
              {perk}
            </li>
          ))}
        </ul>

        <a
          href="#booking"
          className="inline-flex self-start booking-btn-primary text-base px-8 py-3"
        >
          Забронировать
        </a>
      </div>

      {/* Right: Cover photo */}
      <div className="relative hidden lg:block">
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
      </div>

      {/* Mobile: show cover photo as banner below text */}
      <div className="relative lg:hidden aspect-[16/9]">
        {hotel.cover_photo ? (
          <img
            src={hotel.cover_photo}
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, var(--t-primary), var(--t-primary-light))` }}
          />
        )}
      </div>
    </section>
  );
}
