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
 * Room cards grid matching hotel-site-cozy.html:
 * 3-column grid with photo, badge, name, description, specs row, price+CTA footer.
 */
export function BookingRoomsShowcase({ rooms, showPrices = true }: BookingRoomsShowcaseProps) {
  const { theme } = useBookingTheme();
  const variant = theme.layout.roomCardVariant;

  if (!rooms || rooms.length === 0) return null;

  return (
    <section id="rooms" className="py-16 sm:py-24" style={{ background: 'var(--t-bg)' }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-3">
          <div>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{
                backgroundColor: 'rgba(var(--t-secondary-rgb, 74,124,89), 0.1)',
                color: 'var(--t-secondary, var(--t-primary))',
              }}
            >
              Номера
            </span>
            <h2
              className="text-3xl sm:text-4xl lg:text-[46px] leading-[1.2] tracking-tight"
              style={{ fontFamily: 'var(--t-font-heading)', fontWeight: 400, letterSpacing: '-0.02em' }}
            >
              Выберите <em className="italic text-t-primary">свой уголок</em>
            </h2>
          </div>
          <p className="text-[13px] text-t-text-subtle max-w-[220px] leading-relaxed">
            {rooms.length} {rooms.length === 1 ? 'номер' : rooms.length < 5 ? 'номера' : 'номеров'} &middot; Все с кондиционером
          </p>
        </div>

        {/* Room cards grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 mb-10">
          {rooms.map((room, index) => (
            <div
              key={room.id}
              className={cn(
                'rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer group',
                'hover:-translate-y-1.5 hover:shadow-2xl',
                variant === 'gold-accent' && 'border border-t-primary/20',
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
                <h3
                  className="text-xl mb-2"
                  style={{ fontFamily: 'var(--t-font-heading)', fontWeight: 400 }}
                >
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
                <div
                  className="flex items-center justify-between pt-4 border-t"
                  style={{ borderColor: 'var(--t-border-subtle)' }}
                >
                  {showPrices ? (
                    <div className="flex flex-col gap-px">
                      <span
                        className="text-2xl leading-none"
                        style={{ fontFamily: 'var(--t-font-heading)', fontWeight: 400 }}
                      >
                        {formatMoney(room.base_price)}
                      </span>
                      <span className="text-[11px] text-t-text-subtle font-medium">сум &middot; за ночь</span>
                    </div>
                  ) : (
                    <div />
                  )}
                  <a
                    href="#booking"
                    className="booking-btn-outline px-5 py-2.5 text-xs"
                  >
                    Выбрать
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Wide CTA button */}
        <a
          href="#booking"
          className="booking-btn-primary flex items-center justify-center gap-2.5 w-full py-5 text-[15px]"
          style={{ borderRadius: 'var(--t-card-radius, 24px)' }}
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
          Забронировать номер — цена лучше чем на Booking.com
        </a>
      </div>
    </section>
  );
}
