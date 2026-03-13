'use client';

import type { HotelPublicInfo } from '@/lib/api/public-booking';
import { useBookingTheme } from '@/lib/themes';
import { IconWhatsApp } from '../icons/booking-icons';

interface BookingLocationProps {
  hotel: HotelPublicInfo;
}

/**
 * Location section matching hotel-site-cozy.html:
 * Left: address block, distance cards, map/whatsapp buttons
 * Right: Google Maps embed
 */
export function BookingLocation({ hotel }: BookingLocationProps) {
  const { theme } = useBookingTheme();
  const config = hotel.mini_site_config;
  const address = config?.address || `${hotel.city}, ${hotel.address}`;
  const googleMaps = config?.google_maps_link || config?.google_maps_url;
  const whatsapp = config?.whatsapp;

  // Extract embed URL from google maps link if available
  const mapEmbedUrl = googleMaps
    ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
    : null;

  const distances = [
    { icon: '🏛️', name: 'Центр города', sub: 'Основные достопримечательности', time: 'Рядом' },
    { icon: '🚂', name: 'Вокзал', sub: 'Железнодорожный вокзал', time: '10 мин' },
    { icon: '✈️', name: 'Аэропорт', sub: 'Международный аэропорт', time: '20 мин' },
    { icon: '🍽️', name: 'Рестораны', sub: 'Лучшие рестораны', time: '5 мин' },
  ];

  return (
    <section id="location" className="py-16 sm:py-24" style={{ background: 'var(--t-surface)' }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14">
        {/* Header */}
        <div className="text-center mb-12">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{
              backgroundColor: 'rgba(var(--t-secondary-rgb, 74,124,89), 0.1)',
              color: 'var(--t-secondary, var(--t-primary))',
            }}
          >
            Как добраться
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-[46px] leading-[1.2] tracking-tight"
            style={{ fontFamily: 'var(--t-font-heading)', fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            Мы в самом <em className="italic text-t-primary">удобном месте</em>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Left: Address + distances + buttons */}
          <div>
            {/* Address block */}
            <div
              className="flex items-center gap-4 p-6 rounded-3xl mb-5"
              style={{ background: 'var(--t-bg)' }}
            >
              <div
                className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0"
                style={{ background: 'rgba(var(--t-primary-rgb, 196,112,74), 0.12)' }}
              >
                <svg className="w-[22px] h-[22px]" style={{ color: 'var(--t-primary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <div className="text-[15px] font-semibold text-t-text">{address}</div>
                <div className="text-[13px] text-t-text-subtle mt-0.5">{hotel.city}</div>
              </div>
            </div>

            {/* Distance cards */}
            <div className="flex flex-col gap-2.5 mb-6">
              {distances.map((d) => (
                <div
                  key={d.name}
                  className="flex items-center gap-3.5 px-5 py-4 rounded-2xl border transition-colors"
                  style={{
                    background: 'var(--t-bg)',
                    borderColor: 'var(--t-border-subtle)',
                  }}
                >
                  <span className="text-xl">{d.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-t-text">{d.name}</div>
                    <div className="text-xs text-t-text-subtle">{d.sub}</div>
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                    style={{
                      background: 'rgba(var(--t-primary-rgb, 196,112,74), 0.1)',
                      color: 'var(--t-primary)',
                    }}
                  >
                    {d.time}
                  </span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2.5">
              {googleMaps && (
                <a
                  href={googleMaps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3.5 px-5 rounded-2xl font-semibold text-[13px] text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  style={{ background: 'var(--t-primary)' }}
                >
                  <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Открыть в картах
                </a>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3.5 px-5 rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-2 border transition-colors cursor-pointer text-t-text-muted hover:text-[#25D366] hover:border-[#25D366]"
                  style={{
                    background: 'var(--t-surface)',
                    borderColor: 'var(--t-border-subtle)',
                  }}
                >
                  <IconWhatsApp className="w-[15px] h-[15px]" />
                  Написать в WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Right: Map embed */}
          <div
            className="rounded-3xl overflow-hidden border"
            style={{
              height: '420px',
              boxShadow: '0 8px 32px rgba(44,36,22,.1)',
              borderColor: 'var(--t-border-subtle)',
            }}
          >
            {mapEmbedUrl ? (
              <iframe
                src={mapEmbedUrl}
                className="w-full h-full border-none block"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: 'var(--t-bg)' }}
              >
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-t-text-subtle opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <p className="text-sm text-t-text-subtle">{address}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
