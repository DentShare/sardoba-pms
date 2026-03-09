'use client';

import type { HotelRoom } from '@/lib/api/public-booking';
import { formatMoney } from '@/lib/utils/money';
import { cn } from '@/lib/cn';
import { useBookingTheme } from '@/lib/themes';
import { IconBed, IconUsers, IconChild } from '../icons/booking-icons';
import { AmenityBadge } from '../shared/AmenityBadge';
import { ROOM_TYPE_LABELS } from '../constants';

interface BookingRoomsShowcaseProps {
  rooms: HotelRoom[];
  showPrices?: boolean;
}

/**
 * Display-only grid of room cards (3 columns desktop, 1 mobile).
 * Each card shows photo/gradient, room type, name, amenities, capacity, price.
 * Card variant adapts to theme: gold-accent, eco, numbered, or default.
 */
export function BookingRoomsShowcase({ rooms, showPrices = true }: BookingRoomsShowcaseProps) {
  const { theme } = useBookingTheme();
  const variant = theme.layout.roomCardVariant;

  if (!rooms || rooms.length === 0) return null;

  return (
    <section id="rooms" className="py-16 sm:py-20 bg-t-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className="text-2xl sm:text-3xl font-bold text-t-primary mb-3"
            style={{ fontFamily: 'var(--t-font-heading)' }}
          >
            Наши номера
          </h2>
          <p className="text-t-text-muted max-w-lg mx-auto">
            Выберите номер, идеально подходящий для вашего отдыха
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, index) => (
            <div
              key={room.id}
              className={cn(
                'booking-card overflow-hidden group hover:shadow-lg transition-all duration-500 hover:-translate-y-1 p-0',
                variant === 'gold-accent' && 'border border-t-primary/20',
              )}
            >
              {/* Room photo */}
              <div className="aspect-[16/10] relative overflow-hidden">
                {room.photos.length > 0 ? (
                  <img
                    src={room.photos[0]}
                    alt={room.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
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
                <span className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                  {ROOM_TYPE_LABELS[room.room_type] || room.room_type}
                </span>

                {/* Eco badge (fresh-green theme) */}
                {variant === 'eco' && (
                  <span className="absolute top-3 right-3 px-2.5 py-1 bg-green-600/90 backdrop-blur-sm text-white text-xs font-medium rounded-full flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-4.97 0-9 4.03-9 9h2c0-3.87 3.13-7 7-7s7 3.13 7 7h2c0-4.97-4.03-9-9-9Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V12m0 0-3 3m3-3 3 3" />
                    </svg>
                    Эко
                  </span>
                )}

                {/* Numbered overlay (minimal-white theme) */}
                {variant === 'numbered' && (
                  <span className="absolute bottom-3 right-3 text-5xl font-bold text-white/20 leading-none">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-t-text mb-2">{room.name}</h3>

                <div className="flex items-center gap-3 text-sm text-t-text-muted mb-3">
                  <span className="flex items-center gap-1">
                    <IconUsers className="w-4 h-4" />
                    {room.capacity_adults} {room.capacity_adults === 1 ? 'взрослый' : room.capacity_adults < 5 ? 'взрослых' : 'взрослых'}
                  </span>
                  {room.capacity_children > 0 && (
                    <span className="flex items-center gap-1">
                      <IconChild className="w-3.5 h-3.5" />
                      {room.capacity_children} {room.capacity_children === 1 ? 'ребёнок' : 'детей'}
                    </span>
                  )}
                </div>

                {room.description && (
                  <p className="text-sm text-t-text-muted mb-3 line-clamp-2">{room.description}</p>
                )}

                {/* Amenities */}
                {room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {room.amenities.slice(0, 5).map((a) => (
                      <AmenityBadge key={a} amenity={a} />
                    ))}
                    {room.amenities.length > 5 && (
                      <span className="text-xs text-t-text-subtle px-2 py-1">
                        +{room.amenities.length - 5}
                      </span>
                    )}
                  </div>
                )}

                {/* Price + CTA */}
                <div className="flex items-end justify-between pt-3 border-t border-t-border-subtle">
                  {showPrices ? (
                    <div>
                      <span className="text-xs text-t-text-subtle">от</span>
                      <p className="text-xl font-bold text-t-primary">
                        {formatMoney(room.base_price)}
                        <span className="text-sm font-normal text-t-text-subtle">/ночь</span>
                      </p>
                    </div>
                  ) : (
                    <div />
                  )}
                  <a
                    href="#booking"
                    className="booking-btn-primary px-4 py-2 text-sm"
                  >
                    Выбрать
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
