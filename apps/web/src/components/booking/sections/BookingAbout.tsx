'use client';

import { useState } from 'react';
import type { HotelPublicInfo } from '@/lib/api/public-booking';
import { useBookingTheme } from '@/lib/themes';

interface BookingAboutProps {
  hotel: HotelPublicInfo;
}

/**
 * "About" section matching hotel-site-cozy.html design:
 * Left: chip, title, description, stats row, amenity tags
 * Right: photo collage grid (3 photos)
 */
export function BookingAbout({ hotel }: BookingAboutProps) {
  const { theme } = useBookingTheme();

  if (!hotel.description && (!hotel.photos || hotel.photos.length === 0)) {
    return null;
  }

  const photos = hotel.photos || [];
  const rooms = hotel.rooms || [];
  const roomCount = rooms.length;

  // Collect unique amenities from all rooms
  const allAmenities = new Set<string>();
  rooms.forEach((r) => r.amenities?.forEach((a) => allAmenities.add(a)));

  const AMENITY_DISPLAY: Record<string, { label: string; icon: JSX.Element }> = {
    wifi: {
      label: 'Wi-Fi',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><circle cx="12" cy="20" r="1" /></svg>,
    },
    ac: {
      label: 'Кондиционер',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>,
    },
    tv: {
      label: 'ТВ',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2" /><polyline points="17 2 12 7 7 2" /></svg>,
    },
    fridge: {
      label: 'Холодильник',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="4" y1="10" x2="20" y2="10" /></svg>,
    },
    balcony: {
      label: 'Балкон',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>,
    },
    kettle: {
      label: 'Чайник',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /></svg>,
    },
    shower: {
      label: 'Душ',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v16" /><path d="M4 8h13a3 3 0 0 1 0 6H4" /></svg>,
    },
    safe: {
      label: 'Сейф',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="12" r="3" /></svg>,
    },
  };

  const photoLabels = ['Интерьер', 'Территория', 'Атмосфера'];
  const photoGradients = [
    'linear-gradient(145deg, #D4BC90 0%, #C8A870 50%, #E0C890 100%)',
    'linear-gradient(145deg, #8CA870 0%, #7A9860 50%, #6A8850 100%)',
    'linear-gradient(145deg, #C89870 0%, #B88060 50%, #D0A878 100%)',
  ];

  return (
    <section id="about" className="py-16 sm:py-24" style={{ background: 'var(--t-surface)' }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-20 items-center">
          {/* Left: Text content */}
          <div>
            {/* Chip */}
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{
                backgroundColor: 'rgba(var(--t-secondary-rgb, 74,124,89), 0.1)',
                color: 'var(--t-secondary, var(--t-primary))',
              }}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              Об отеле
            </span>

            <h2
              className="text-3xl sm:text-4xl lg:text-[46px] leading-[1.2] tracking-tight mb-5"
              style={{
                fontFamily: 'var(--t-font-heading)',
                fontWeight: 400,
                letterSpacing: '-0.02em',
              }}
            >
              Место где гость{'\n'}
              становится <em className="italic text-t-primary">своим</em>
            </h2>

            {hotel.description && (
              <div className="text-base leading-[1.8] text-t-text-muted mb-8 whitespace-pre-line max-w-[500px]">
                {hotel.description}
              </div>
            )}

            {/* Stats row */}
            <div className="flex gap-8 mb-8">
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-4xl text-t-primary leading-none"
                  style={{ fontFamily: 'var(--t-font-heading)', fontWeight: 400 }}
                >
                  {roomCount}
                </span>
                <span className="text-xs font-medium text-t-text-subtle">
                  {roomCount === 1 ? 'номер' : roomCount < 5 ? 'номера' : 'номеров'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-4xl text-t-primary leading-none"
                  style={{ fontFamily: 'var(--t-font-heading)', fontWeight: 400 }}
                >
                  24/7
                </span>
                <span className="text-xs font-medium text-t-text-subtle">ресепшн</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-4xl text-t-primary leading-none"
                  style={{ fontFamily: 'var(--t-font-heading)', fontWeight: 400 }}
                >
                  {hotel.checkin_time || '14:00'}
                </span>
                <span className="text-xs font-medium text-t-text-subtle">заезд</span>
              </div>
            </div>

            {/* Amenity tags */}
            {allAmenities.size > 0 && (
              <div className="flex flex-wrap gap-2">
                {Array.from(allAmenities).slice(0, 8).map((amenity) => {
                  const info = AMENITY_DISPLAY[amenity];
                  return (
                    <span
                      key={amenity}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
                      style={{
                        backgroundColor: 'var(--t-bg)',
                        borderColor: 'var(--t-border-subtle)',
                        color: 'var(--t-text-muted)',
                      }}
                    >
                      <span className="w-3.5 h-3.5 text-t-primary">{info?.icon || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>}</span>
                      {info?.label || amenity}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Photo collage */}
          <div className="grid grid-cols-2 gap-3" style={{ gridTemplateRows: '220px 200px' }}>
            {/* First photo spans full width */}
            <div
              className="col-span-2 rounded-3xl overflow-hidden relative group cursor-pointer"
              style={{ height: '220px' }}
            >
              {photos[0] ? (
                <img
                  src={photos[0]}
                  alt={photoLabels[0]}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full" style={{ background: photoGradients[0] }}>
                  <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 65% 35%, rgba(255,240,200,.5) 0%, transparent 55%)' }} />
                </div>
              )}
              <span className="absolute bottom-3 left-3.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: 'rgba(44,36,22,.7)', background: 'rgba(255,255,255,.65)', backdropFilter: 'blur(6px)' }}>
                {photoLabels[0]}
              </span>
            </div>

            {/* Second photo */}
            <div className="rounded-3xl overflow-hidden relative group cursor-pointer">
              {photos[1] ? (
                <img
                  src={photos[1]}
                  alt={photoLabels[1]}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full" style={{ background: photoGradients[1] }}>
                  <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 40% 55%, rgba(180,220,160,.35) 0%, transparent 60%)' }} />
                </div>
              )}
              <span className="absolute bottom-3 left-3.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: 'rgba(44,36,22,.7)', background: 'rgba(255,255,255,.65)', backdropFilter: 'blur(6px)' }}>
                {photoLabels[1]}
              </span>
            </div>

            {/* Third photo */}
            <div className="rounded-3xl overflow-hidden relative group cursor-pointer">
              {photos[2] ? (
                <img
                  src={photos[2]}
                  alt={photoLabels[2]}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full" style={{ background: photoGradients[2] }}>
                  <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 55% 40%, rgba(240,200,160,.4) 0%, transparent 55%)' }} />
                </div>
              )}
              <span className="absolute bottom-3 left-3.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: 'rgba(44,36,22,.7)', background: 'rgba(255,255,255,.65)', backdropFilter: 'blur(6px)' }}>
                {photoLabels[2]}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
