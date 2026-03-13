'use client';

import type { HotelRoom } from '@/lib/api/public-booking';
import { formatMoney } from '@/lib/utils/money';
import { cn } from '@/lib/cn';
import { useBookingTheme } from '@/lib/themes';
import { IconBed, IconUsers } from '../icons/booking-icons';
import { ROOM_TYPE_LABELS } from '../constants';

interface BookingRoomsShowcaseProps {
  rooms: HotelRoom[];
  showPrices?: boolean;
}

const AMENITY_SHORT: Record<string, string> = {
  wifi: 'Wi-Fi',
  ac: 'Кондиционер',
  tv: 'ТВ',
  fridge: 'Холодильник',
  balcony: 'Балкон',
  view: 'Вид',
  bathtub: 'Ванна',
  shower: 'Душ',
  safe: 'Сейф',
  minibar: 'Мини-бар',
  kettle: 'Чайник',
};

/**
 * Room cards grid with theme-specific variants:
 * - gold-accent (silk-road): tall aspect-ratio cards, fullbleed photo, gold overlay
 * - eco (fresh-green): eco badge
 * - numbered (minimal-white): numbered overlay
 * - default (cozy/modern): rounded cards
 */
export function BookingRoomsShowcase({ rooms, showPrices = true }: BookingRoomsShowcaseProps) {
  const { theme, isDark } = useBookingTheme();
  const variant = theme.layout.roomCardVariant;
  const isGoldAccent = variant === 'gold-accent';

  if (!rooms || rooms.length === 0) return null;

  return (
    <section id="rooms" className="py-16 sm:py-24" style={{ background: 'var(--t-bg)' }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-3">
          <div>
            {/* Section label with gold-line decorator for silk-road */}
            {isGoldAccent ? (
              <div className="flex items-center gap-3 mb-5">
                <span className="w-10 h-px" style={{ background: 'var(--t-primary)' }} />
                <span
                  className="text-[10px] uppercase tracking-[0.15em] font-semibold"
                  style={{ color: 'var(--t-primary)' }}
                >
                  Размещение
                </span>
              </div>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
                style={{
                  backgroundColor: 'rgba(var(--t-secondary-rgb, 74,124,89), 0.1)',
                  color: 'var(--t-secondary, var(--t-primary))',
                }}
              >
                Номера
              </span>
            )}
            <h2
              className="text-3xl sm:text-4xl lg:text-[46px] leading-[1.2]"
              style={{
                fontFamily: 'var(--t-font-heading)',
                fontWeight: isDark ? 300 : 400,
                letterSpacing: '-0.02em',
              }}
            >
              {isGoldAccent ? (
                <>Выберите <em className="italic" style={{ color: 'var(--t-primary)' }}>номер</em></>
              ) : (
                <>Выберите <em className="italic text-t-primary">свой уголок</em></>
              )}
            </h2>
          </div>
          <p className="text-[13px] text-t-text-subtle max-w-[220px] leading-relaxed">
            {rooms.length} {rooms.length === 1 ? 'номер' : rooms.length < 5 ? 'номера' : 'номеров'} &middot; Все с кондиционером
          </p>
        </div>

        {/* Room cards grid */}
        <div className={cn(
          'grid mb-10',
          isGoldAccent
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[2px]'
            : 'gap-5 md:grid-cols-2 lg:grid-cols-3',
        )}>
          {rooms.map((room, index) => (
            isGoldAccent
              ? <GoldAccentCard key={room.id} room={room} index={index} showPrices={showPrices} />
              : <DefaultCard key={room.id} room={room} index={index} variant={variant} showPrices={showPrices} />
          ))}
        </div>

        {/* Wide CTA button */}
        <a
          href="#booking"
          className="booking-btn-primary flex items-center justify-center gap-2.5 w-full py-5 text-[15px]"
          style={{ borderRadius: isGoldAccent ? '0' : 'var(--t-card-radius, 24px)' }}
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
          Забронировать номер — цена лучше чем на Booking.com
        </a>
      </div>
    </section>
  );
}

/* ── Gold-accent card (silk-road-luxury): tall, fullbleed photo, gradient overlay ── */
function GoldAccentCard({ room, index, showPrices }: { room: HotelRoom; index: number; showPrices: boolean }) {
  const isPopular = index === 0; // First room marked as popular

  return (
    <a
      href="#booking"
      className="relative group overflow-hidden cursor-pointer block"
      style={{ aspectRatio: '3/4' }}
    >
      {/* Photo or placeholder */}
      {room.photos.length > 0 ? (
        <img
          src={room.photos[0]}
          alt={room.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--t-primary), var(--t-primary-light))' }}
        >
          <IconBed className="w-16 h-16 text-white/20" />
        </div>
      )}

      {/* Gradient overlay from bottom */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,.8) 0%, rgba(0,0,0,.2) 40%, transparent 70%)' }}
      />

      {/* Type badge — uppercase gold */}
      <span
        className="absolute top-4 left-4 px-3 py-1 text-[9px] uppercase tracking-[0.15em] font-semibold"
        style={{ background: 'rgba(201,169,110,.15)', color: '#C9A96E', backdropFilter: 'blur(8px)' }}
      >
        {ROOM_TYPE_LABELS[room.room_type] || room.room_type}
      </span>

      {/* Popular badge */}
      {isPopular && (
        <span
          className="absolute top-4 right-4 px-3 py-1 text-[9px] uppercase tracking-[0.1em] font-bold"
          style={{ background: '#C9A96E', color: '#0A0A08' }}
        >
          Popular
        </span>
      )}

      {/* Content at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        <h3
          className="text-lg text-white mb-1"
          style={{ fontFamily: 'var(--t-font-heading)', fontWeight: 300 }}
        >
          {room.name}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-white/50 mb-3">
          <IconUsers className="w-3.5 h-3.5" />
          <span>{room.capacity_adults} {room.capacity_adults === 1 ? 'гость' : 'гостя'}</span>
          {room.amenities.slice(0, 2).map((a) => (
            <span key={a} className="pl-2 border-l border-white/20">{AMENITY_SHORT[a] || a}</span>
          ))}
        </div>
        {showPrices && (
          <div className="flex items-baseline gap-2">
            <span
              className="text-xl text-white"
              style={{ fontFamily: 'var(--t-font-heading)', fontWeight: 300 }}
            >
              {formatMoney(room.base_price)}
            </span>
            <span className="text-[10px] uppercase tracking-[0.08em] text-white/40">
              сум / ночь
            </span>
          </div>
        )}
      </div>
    </a>
  );
}

/* ── Default card (cozy, modern, fresh-green, minimal-white) ── */
function DefaultCard({ room, index, variant, showPrices }: { room: HotelRoom; index: number; variant: string; showPrices: boolean }) {
  return (
    <div
      className={cn(
        'rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer group',
        'hover:-translate-y-1.5 hover:shadow-2xl',
      )}
      style={{ background: 'var(--t-surface)' }}
    >
      {/* Photo */}
      <div className="h-[200px] relative overflow-hidden">
        {room.photos.length > 0 ? (
          <img
            src={room.photos[0]}
            alt={room.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--t-primary), var(--t-primary-light))' }}
          >
            <IconBed className="w-12 h-12 text-white/40" />
          </div>
        )}
        {/* Type badge */}
        <span
          className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md"
          style={{ background: 'rgba(255,255,255,.88)', color: 'var(--t-text)' }}
        >
          {ROOM_TYPE_LABELS[room.room_type] || room.room_type}
        </span>

        {variant === 'eco' && (
          <span className="absolute top-3.5 right-3.5 px-2.5 py-1 bg-green-600/90 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full">
            Эко
          </span>
        )}
        {variant === 'numbered' && (
          <span className="absolute bottom-3 right-3 text-5xl font-bold text-white/20 leading-none">
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6">
        <h3 className="text-xl mb-2" style={{ fontFamily: 'var(--t-font-heading)', fontWeight: 400 }}>
          {room.name}
        </h3>

        {room.description && (
          <p className="text-[13px] text-t-text-muted leading-relaxed mb-4 line-clamp-2">{room.description}</p>
        )}

        {/* Specs row */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-t-text-subtle font-medium">
            <IconUsers className="w-3.5 h-3.5 text-t-text-subtle" />
            {room.capacity_adults === 1 ? '1 гость' : `1\u2013${room.capacity_adults + (room.capacity_children || 0)} ${(room.capacity_adults + (room.capacity_children || 0)) < 5 ? 'гостя' : 'гостей'}`}
          </span>
          {room.amenities.slice(0, 2).map((a) => (
            <span key={a} className="flex items-center gap-1 text-xs text-t-text-subtle font-medium">
              <svg className="w-3.5 h-3.5" style={{ color: 'var(--t-border-subtle)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {AMENITY_SHORT[a] || a}
            </span>
          ))}
        </div>

        {/* Footer: price + CTA */}
        <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--t-border-subtle)' }}>
          {showPrices ? (
            <div className="flex flex-col gap-px">
              <span className="text-2xl leading-none" style={{ fontFamily: 'var(--t-font-heading)', fontWeight: 400 }}>
                {formatMoney(room.base_price)}
              </span>
              <span className="text-[11px] text-t-text-subtle font-medium">сум &middot; за ночь</span>
            </div>
          ) : (
            <div />
          )}
          <a href="#booking" className="booking-btn-outline px-5 py-2.5 text-xs">
            Выбрать
          </a>
        </div>
      </div>
    </div>
  );
}
