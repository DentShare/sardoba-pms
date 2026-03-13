'use client';

import { useBookingTheme } from '@/lib/themes';
import type { HotelPublicInfo } from '@/lib/api/public-booking';

interface BookingHeroMinimalProps {
  hotel: HotelPublicInfo;
}

/**
 * Compact hero for fresh-green + minimal-white themes.
 * fresh-green: 60vh, centered, leaf icon, hero tags (Wi-Fi, Eco, etc.)
 * minimal-white: 50vh, centered, meta items row
 */
export function BookingHeroMinimal({ hotel }: BookingHeroMinimalProps) {
  const { theme } = useBookingTheme();
  const minHeight = theme.layout.heroMinHeight;
  const overlayGradient = theme.layout.heroOverlayGradient;
  const isFreshGreen = theme.id === 'fresh-green';
  const isMinimalWhite = theme.id === 'minimal-white';

  const locationLabel = [hotel.city, hotel.address].filter(Boolean).join(', ');

  // Collect amenities for tags (fresh-green)
  const rooms = hotel.rooms || [];
  const amenitySet = new Set<string>();
  rooms.forEach((r) => r.amenities?.forEach((a) => amenitySet.add(a)));
  const AMENITY_TAG: Record<string, string> = {
    wifi: 'Wi-Fi', ac: 'Климат', tv: 'ТВ', balcony: 'Балкон',
    fridge: 'Холодильник', kettle: 'Чайник', shower: 'Душ', safe: 'Сейф',
  };

  return (
    <section
      className="relative overflow-hidden flex flex-col items-center justify-center text-center"
      style={{ minHeight, paddingTop: isMinimalWhite ? '100px' : '120px', paddingBottom: isMinimalWhite ? '48px' : '80px' }}
    >
      {/* Cover photo or gradient background */}
      {hotel.cover_photo ? (
        <img src={hotel.cover_photo} alt={hotel.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : isFreshGreen ? (
        <div className="absolute inset-0" style={{
          background: `
            linear-gradient(180deg, rgba(26,46,31,0.4) 0%, rgba(26,46,31,0.65) 100%),
            linear-gradient(135deg, #1A2E1F 0%, #2D7A4F 50%, #1F5C3A 100%)
          `,
        }} />
      ) : (
        <div className="absolute inset-0" style={{
          background: `
            linear-gradient(180deg, rgba(26,26,26,0.3) 0%, rgba(26,26,26,0.6) 100%),
            linear-gradient(135deg, #333333 0%, #1A1A1A 100%)
          `,
        }} />
      )}

      {/* Overlay gradient */}
      {overlayGradient && <div className="absolute inset-0" style={{ background: overlayGradient }} />}

      {/* Content */}
      <div className="relative z-10 px-5 sm:px-8 max-w-[700px] mx-auto">
        {/* Fresh-green: Leaf icon */}
        {isFreshGreen && (
          <svg className="w-10 h-10 mx-auto mb-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            style={{ color: 'var(--t-secondary, rgba(255,255,255,.8))', opacity: 0.8 }}>
            <path d="M12 3c-4.97 0-9 4.03-9 9h2c0-3.87 3.13-7 7-7s7 3.13 7 7h2c0-4.97-4.03-9-9-9Z" />
            <path d="M12 21V12m0 0-3 3m3-3 3 3" />
          </svg>
        )}

        {/* Title */}
        <h1
          className="mb-3"
          style={{
            fontFamily: 'var(--t-font-heading)',
            fontSize: isMinimalWhite ? 'clamp(32px, 5vw, 56px)' : 'clamp(36px, 5vw, 64px)',
            fontWeight: isMinimalWhite ? 700 : 600,
            lineHeight: 1.15,
            letterSpacing: isMinimalWhite ? '-0.03em' : '-0.02em',
            color: '#fff',
          }}
        >
          {hotel.mini_site_config?.display_name || hotel.name}
        </h1>

        {/* Subtitle */}
        <p
          className="text-[15px] sm:text-base max-w-[500px] mx-auto leading-relaxed mb-6"
          style={{ color: 'rgba(255,255,255,0.65)' }}
        >
          {hotel.description
            ? hotel.description.slice(0, 100) + (hotel.description.length > 100 ? '...' : '')
            : locationLabel}
        </p>

        {/* Fresh-green: amenity tags */}
        {isFreshGreen && amenitySet.size > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-4">
            {Array.from(amenitySet).slice(0, 6).map((a) => (
              <span
                key={a}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                <svg className="w-3 h-3" style={{ color: 'var(--t-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {AMENITY_TAG[a] || a}
              </span>
            ))}
          </div>
        )}

        {/* Minimal-white: meta items row */}
        {isMinimalWhite && (
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              {locationLabel}
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              {hotel.checkin_time} — {hotel.checkout_time}
            </span>
            {hotel.phone && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {hotel.phone}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
