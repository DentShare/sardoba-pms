'use client';

import type { HotelPublicInfo } from '@/lib/api/public-booking';
import { useBookingTheme } from '@/lib/themes';
import { IconWhatsApp, IconTelegram, IconInstagram } from '../icons/booking-icons';

interface BookingContactsProps {
  hotel: HotelPublicInfo;
}

/**
 * Contacts section — 4-column grid with themed cards.
 * Adapts style based on theme (dark border for luxury, colored for eco, minimal for white).
 */
export function BookingContacts({ hotel }: BookingContactsProps) {
  const { theme, isDark } = useBookingTheme();
  const config = hotel.mini_site_config;
  const phone = hotel.phone || config?.phone;
  const email = config?.email;
  const address = config?.address || `${hotel.city}, ${hotel.address}`;
  const whatsapp = config?.whatsapp;
  const telegram = config?.telegram;
  const instagram = config?.instagram;
  const googleMaps = config?.google_maps_link || config?.google_maps_url;
  const hasMessengers = whatsapp || telegram || instagram;

  const contactItems = [
    {
      show: true,
      icon: <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />,
      icon2: <circle cx="12" cy="10" r="3" />,
      label: 'Адрес',
      value: address,
      href: googleMaps,
      linkText: 'На карте',
    },
    {
      show: !!phone,
      icon: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />,
      label: 'Телефон',
      value: phone,
      href: phone ? `tel:${phone}` : undefined,
    },
    {
      show: !!email,
      icon: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>,
      label: 'Email',
      value: email,
      href: email ? `mailto:${email}` : undefined,
    },
    {
      show: true,
      icon: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
      label: 'Время',
      value: `Заезд ${hotel.checkin_time} · Выезд ${hotel.checkout_time}`,
    },
  ].filter((c) => c.show);

  return (
    <section id="contacts" className="py-16 sm:py-20" style={{ background: isDark ? 'var(--t-bg)' : 'var(--t-bg-alt)' }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14">
        <div className="text-center mb-10">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{
              backgroundColor: `rgba(var(--t-primary-rgb), 0.1)`,
              color: 'var(--t-primary)',
            }}
          >
            Контакты
          </span>
          <h2
            className="text-2xl sm:text-3xl lg:text-4xl"
            style={{
              fontFamily: 'var(--t-font-heading)',
              fontWeight: isDark ? 300 : 600,
              letterSpacing: '-0.02em',
            }}
          >
            Свяжитесь с нами
          </h2>
        </div>

        {/* Contact cards grid */}
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          style={{ gap: isDark ? '2px' : undefined }}
        >
          {contactItems.map((item) => (
            <div
              key={item.label}
              className="p-6 sm:p-7 transition-all"
              style={{
                background: isDark ? 'var(--t-bg-alt)' : 'var(--t-surface)',
                border: `1px solid ${isDark ? 'rgba(201,169,110,.1)' : 'var(--t-border-subtle)'}`,
                borderRadius: isDark ? '0' : 'var(--t-card-radius, 12px)',
              }}
            >
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-[10px] flex items-center justify-center mb-4"
                style={{
                  border: isDark ? '1px solid rgba(201,169,110,.15)' : 'none',
                  background: isDark ? 'transparent' : `rgba(var(--t-primary-rgb), 0.08)`,
                }}
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  style={{ color: 'var(--t-primary)' }}>
                  {item.icon}
                  {item.icon2}
                </svg>
              </div>

              <div className="text-[9px] uppercase tracking-[0.06em] font-medium mb-2"
                style={{ color: 'var(--t-text-subtle)' }}>
                {item.label}
              </div>

              {item.href ? (
                <a href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="text-[15px] leading-snug transition-colors cursor-pointer hover:text-t-primary"
                  style={{ color: 'var(--t-text)', textDecoration: 'none' }}>
                  {item.value}
                </a>
              ) : (
                <p className="text-[15px] leading-snug" style={{ color: 'var(--t-text)' }}>
                  {item.value}
                </p>
              )}

              {item.linkText && item.href && (
                <a href={item.href} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs mt-2 transition-colors cursor-pointer"
                  style={{ color: 'var(--t-primary)' }}>
                  {item.linkText}
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Messengers row */}
        {hasMessengers && (
          <div className="flex items-center justify-center gap-4 mt-8">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-colors cursor-pointer text-t-text-muted hover:text-[#25D366] hover:border-[#25D366]"
                style={{ borderColor: 'var(--t-border-subtle)' }}
              >
                <IconWhatsApp className="w-4 h-4" />WhatsApp
              </a>
            )}
            {telegram && (
              <a
                href={telegram.startsWith('http') ? telegram : `https://t.me/${telegram.replace('@', '')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-colors cursor-pointer text-t-text-muted hover:text-[#2AABEE] hover:border-[#2AABEE]"
                style={{ borderColor: 'var(--t-border-subtle)' }}
              >
                <IconTelegram className="w-4 h-4" />Telegram
              </a>
            )}
            {instagram && (
              <a
                href={instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@', '')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-colors cursor-pointer text-t-text-muted hover:text-[#E4405F] hover:border-[#E4405F]"
                style={{ borderColor: 'var(--t-border-subtle)' }}
              >
                <IconInstagram className="w-4 h-4" />Instagram
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
