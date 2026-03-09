'use client';

import type { HotelPublicInfo } from '@/lib/api/public-booking';
import {
  IconPhone,
  IconMail,
  IconMapPin,
  IconClock,
  IconWhatsApp,
  IconTelegram,
  IconInstagram,
  IconGlobe,
} from '../icons/booking-icons';

interface BookingContactsProps {
  hotel: HotelPublicInfo;
}

export function BookingContacts({ hotel }: BookingContactsProps) {
  const config = hotel.mini_site_config;
  const phone = hotel.phone || config?.phone;
  const email = config?.email;
  const address = config?.address || `${hotel.city}, ${hotel.address}`;
  const whatsapp = config?.whatsapp;
  const telegram = config?.telegram;
  const instagram = config?.instagram;
  const googleMaps = config?.google_maps_link || config?.google_maps_url;

  const hasMessengers = whatsapp || telegram || instagram;

  return (
    <section id="contacts" className="py-16 sm:py-20 bg-t-bg-alt">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className="text-2xl sm:text-3xl font-bold text-t-primary mb-3"
            style={{ fontFamily: 'var(--t-font-heading)' }}
          >
            Контакты
          </h2>
          <p className="text-t-text-muted max-w-lg mx-auto">
            Свяжитесь с нами любым удобным способом
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Address */}
          <div className="booking-card p-6 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--t-primary-light)', opacity: 0.15 }}
            />
            <IconMapPin className="w-6 h-6 text-t-primary mx-auto -mt-[52px] mb-8" />
            <h3 className="font-semibold text-t-text text-sm mb-1">Адрес</h3>
            <p className="text-sm text-t-text-muted">{address}</p>
            {googleMaps && (
              <a
                href={googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-t-primary text-xs mt-2 hover:underline cursor-pointer"
              >
                <IconGlobe className="w-3.5 h-3.5" />
                Показать на карте
              </a>
            )}
          </div>

          {/* Phone */}
          {phone && (
            <div className="booking-card p-6 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'var(--t-primary-light)', opacity: 0.15 }}
              />
              <IconPhone className="w-6 h-6 text-t-primary mx-auto -mt-[52px] mb-8" />
              <h3 className="font-semibold text-t-text text-sm mb-1">Телефон</h3>
              <a
                href={`tel:${phone}`}
                className="text-sm text-t-text-muted hover:text-t-primary transition-colors cursor-pointer"
              >
                {phone}
              </a>
            </div>
          )}

          {/* Email */}
          {email && (
            <div className="booking-card p-6 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'var(--t-primary-light)', opacity: 0.15 }}
              />
              <IconMail className="w-6 h-6 text-t-primary mx-auto -mt-[52px] mb-8" />
              <h3 className="font-semibold text-t-text text-sm mb-1">Email</h3>
              <a
                href={`mailto:${email}`}
                className="text-sm text-t-text-muted hover:text-t-primary transition-colors cursor-pointer"
              >
                {email}
              </a>
            </div>
          )}

          {/* Check-in/out times */}
          <div className="booking-card p-6 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--t-primary-light)', opacity: 0.15 }}
            />
            <IconClock className="w-6 h-6 text-t-primary mx-auto -mt-[52px] mb-8" />
            <h3 className="font-semibold text-t-text text-sm mb-1">Время</h3>
            <p className="text-sm text-t-text-muted">
              Заезд {hotel.checkin_time}
            </p>
            <p className="text-sm text-t-text-muted">
              Выезд {hotel.checkout_time}
            </p>
          </div>
        </div>

        {/* Messengers row */}
        {hasMessengers && (
          <div className="flex items-center justify-center gap-4 mt-8">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-t-border-subtle text-sm text-t-text-muted hover:text-[#25D366] hover:border-[#25D366] transition-colors cursor-pointer"
              >
                <IconWhatsApp className="w-4 h-4" />
                WhatsApp
              </a>
            )}
            {telegram && (
              <a
                href={telegram.startsWith('http') ? telegram : `https://t.me/${telegram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-t-border-subtle text-sm text-t-text-muted hover:text-[#2AABEE] hover:border-[#2AABEE] transition-colors cursor-pointer"
              >
                <IconTelegram className="w-4 h-4" />
                Telegram
              </a>
            )}
            {instagram && (
              <a
                href={instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-t-border-subtle text-sm text-t-text-muted hover:text-[#E4405F] hover:border-[#E4405F] transition-colors cursor-pointer"
              >
                <IconInstagram className="w-4 h-4" />
                Instagram
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
