'use client';

import { useBookingTheme } from '@/lib/themes';
import type { HotelPublicInfo } from '@/lib/api/public-booking';

interface BookingHeroSplitProps {
  hotel: HotelPublicInfo;
}

/**
 * CSS Grid 2-column hero matching hotel-site-cozy.html:
 * Left: badge, title, subtitle, search card, perks
 * Right: cover photo with floating rating/checkin cards
 */
export function BookingHeroSplit({ hotel }: BookingHeroSplitProps) {
  const { theme } = useBookingTheme();

  const perks = [
    'Без предоплаты',
    `Заезд с ${hotel.checkin_time || '14:00'}`,
    `Выезд до ${hotel.checkout_time || '12:00'}`,
  ];

  const locationLabel = [hotel.city, hotel.address].filter(Boolean).join(' · ');

  return (
    <section
      className="relative grid grid-cols-1 lg:grid-cols-2"
      style={{ minHeight: theme.layout.heroMinHeight || '100vh', paddingTop: '68px' }}
    >
      {/* Left: Text content */}
      <div
        className="flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-16"
        style={{ background: 'var(--t-bg)' }}
      >
        {/* Badge with blinking dot */}
        <div
          className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full text-xs font-semibold mb-7"
          style={{
            backgroundColor: 'rgba(var(--t-primary-rgb, 196,112,74), 0.1)',
            color: 'var(--t-primary)',
          }}
        >
          <span
            className="w-[7px] h-[7px] rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--t-primary)' }}
          />
          {locationLabel}
        </div>

        <h1
          className="text-4xl sm:text-5xl lg:text-[clamp(42px,4.5vw,64px)] leading-[1.12] tracking-tight mb-5"
          style={{ fontFamily: 'var(--t-font-heading)', fontWeight: 400, letterSpacing: '-0.02em' }}
        >
          {hotel.mini_site_config?.display_name || hotel.name}
        </h1>

        <p className="text-base text-t-text-muted leading-[1.75] max-w-[400px] mb-8">
          {hotel.description
            ? hotel.description.slice(0, 160) + (hotel.description.length > 160 ? '...' : '')
            : `Гостеприимный ${hotel.name} в самом центре города ${hotel.city}. Забронируйте напрямую — цена лучше чем на Booking.com.`}
        </p>

        {/* Search card */}
        <div
          className="rounded-3xl p-5 flex flex-col gap-3 max-w-[480px]"
          style={{
            background: 'var(--t-surface)',
            boxShadow: '0 4px 24px rgba(44,36,22,.1)',
          }}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href="#booking"
              className="px-4 py-3 rounded-2xl transition-all cursor-pointer hover:border-t-primary"
              style={{ background: 'var(--t-bg)', border: '1.5px solid transparent' }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-t-text-subtle mb-1">Заезд</div>
              <div className="text-sm font-medium text-t-text">{hotel.checkin_time || '14:00'}</div>
            </a>
            <a
              href="#booking"
              className="px-4 py-3 rounded-2xl transition-all cursor-pointer"
              style={{ background: 'var(--t-bg)', border: '1.5px solid transparent' }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-t-text-subtle mb-1">Выезд</div>
              <div className="text-sm font-medium text-t-text">{hotel.checkout_time || '12:00'}</div>
            </a>
          </div>

          <a
            href="#booking"
            className="w-full py-4 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2.5 transition-all hover:-translate-y-0.5 cursor-pointer"
            style={{
              background: 'var(--t-primary)',
              fontFamily: 'var(--t-font-body)',
              letterSpacing: '-0.01em',
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            Проверить доступность
          </a>
        </div>

        {/* Perks */}
        <div className="flex gap-5 mt-5 flex-wrap">
          {perks.map((perk) => (
            <div key={perk} className="flex items-center gap-1.5 text-xs font-medium text-t-text-muted">
              <svg className="w-3.5 h-3.5" style={{ color: 'var(--t-secondary, var(--t-primary))' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
              {perk}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Cover photo (desktop) */}
      <div className="relative hidden lg:block overflow-hidden" style={{ minHeight: '680px' }}>
        {hotel.cover_photo ? (
          <img
            src={hotel.cover_photo}
            alt={hotel.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(ellipse at 45% 38%, rgba(232,210,170,.55) 0%, transparent 55%),
              radial-gradient(ellipse at 75% 70%, rgba(196,112,74,.18) 0%, transparent 50%),
              linear-gradient(160deg, #E8D5B0 0%, #D4BC90 30%, #C8A870 60%, #B89058 100%)
            `,
          }} />
        )}

        {/* Floating rating card */}
        <div
          className="absolute top-24 right-14 z-10 bg-white rounded-2xl px-5 py-4 flex flex-col gap-0.5 hero-float"
          style={{ boxShadow: '0 8px 32px rgba(44,36,22,.15)' }}
        >
          <div className="text-amber-400 text-sm tracking-wider mb-1">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          <div className="text-3xl font-bold leading-none" style={{ fontFamily: 'var(--t-font-heading)', color: '#3A2E1E' }}>4.9</div>
          <div className="text-[11px] font-medium" style={{ color: '#9C8A6E' }}>из 5 &middot; Booking.com</div>
        </div>

        {/* Floating checkin card */}
        <div
          className="absolute bottom-28 left-6 z-10 rounded-2xl px-4 py-3.5 text-white hero-float-delay"
          style={{
            background: 'var(--t-primary)',
            boxShadow: '0 8px 24px rgba(196,112,74,.4)',
          }}
        >
          <div className="text-xl mb-1">&#127969;</div>
          <div className="text-[11px] font-semibold leading-snug">
            Заезд с {hotel.checkin_time || '14:00'}<br />
            Выезд до {hotel.checkout_time || '12:00'}
          </div>
          <div className="text-[10px] opacity-75 mt-0.5">Гибкий график</div>
        </div>
      </div>

      {/* Mobile: show cover photo as banner */}
      <div className="relative lg:hidden aspect-[16/9]">
        {hotel.cover_photo ? (
          <img src={hotel.cover_photo} alt={hotel.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, var(--t-primary), var(--t-primary-light))` }} />
        )}
      </div>
    </section>
  );
}
