'use client';

import { useBookingTheme } from '@/lib/themes';
import type { HotelPublicInfo } from '@/lib/api/public-booking';

interface BookingHeroCenteredProps {
  hotel: HotelPublicInfo;
}

/**
 * Full-viewport centered hero matching hotel-site-prototype.html (silk-road-luxury)
 * and modern-clean. Features: grain texture, ambient glow, search form, amenity bar.
 */
export function BookingHeroCentered({ hotel }: BookingHeroCenteredProps) {
  const { theme, isDark } = useBookingTheme();
  const showNoise = theme.effects.noiseTexture;
  const locationLabel = [hotel.city, hotel.address].filter(Boolean).join(', ');

  return (
    <section
      className="relative flex flex-col items-center justify-center overflow-hidden"
      style={{ minHeight: theme.layout.heroMinHeight || '100vh' }}
    >
      {/* Background: cover photo or atmospheric gradient */}
      {hotel.cover_photo ? (
        <img
          src={hotel.cover_photo}
          alt={hotel.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : isDark ? (
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse at 70% 50%, rgba(201,169,110,.08) 0%, transparent 50%),
            radial-gradient(ellipse at 20% 80%, rgba(201,169,110,.04) 0%, transparent 40%),
            linear-gradient(135deg, #0A0A08 0%, #131310 40%, #1C1C18 70%, #0A0A08 100%)
          `,
        }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{ background: theme.layout.heroOverlayGradient }} />

      {/* Noise/grain texture */}
      {showNoise && (
        <div
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
          style={{
            opacity: 0.4,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 150 150\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
            backgroundRepeat: 'repeat',
            backgroundSize: '150px 150px',
          }}
        />
      )}

      {/* Decorative pattern */}
      {theme.effects.backgroundPattern && (
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: theme.effects.backgroundPattern }} />
      )}

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1100px] mx-auto px-6 sm:px-8 text-center">
        {/* Location chip with lines */}
        <div className="inline-flex items-center gap-3 mb-8">
          <span className="w-8 h-px" style={{ background: isDark ? 'rgba(201,169,110,.3)' : 'rgba(255,255,255,.3)' }} />
          <span
            className="text-[11px] uppercase tracking-[0.12em] font-medium"
            style={{ color: isDark ? 'var(--t-primary)' : 'rgba(255,255,255,.7)' }}
          >
            {locationLabel}
          </span>
          <span className="w-8 h-px" style={{ background: isDark ? 'rgba(201,169,110,.3)' : 'rgba(255,255,255,.3)' }} />
        </div>

        {/* Title */}
        <h1
          className="mb-5"
          style={{
            fontFamily: 'var(--t-font-heading)',
            fontSize: 'clamp(42px, 7vw, 86px)',
            fontWeight: isDark ? 300 : 600,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: '#fff',
          }}
        >
          {hotel.mini_site_config?.display_name || hotel.name}
        </h1>

        {/* Subtitle */}
        <p
          className="text-[13px] sm:text-[14px] max-w-[400px] mx-auto mb-10 leading-[1.7]"
          style={{ color: isDark ? 'var(--t-text-muted)' : 'rgba(255,255,255,.65)' }}
        >
          {hotel.description
            ? hotel.description.slice(0, 120) + (hotel.description.length > 120 ? '...' : '')
            : `Забронируйте ${hotel.name} напрямую — лучшая цена гарантирована.`}
        </p>

        {/* Search form card */}
        <a
          href="#booking"
          className="mx-auto max-w-[820px] flex flex-col sm:flex-row items-stretch overflow-hidden cursor-pointer"
          style={{
            background: isDark ? 'rgba(20, 20, 16, 0.85)' : 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            border: isDark ? '1px solid rgba(201,169,110,.2)' : '1px solid rgba(255,255,255,.15)',
            borderRadius: isDark ? '0' : 'var(--t-card-radius, 12px)',
          }}
        >
          <div className="flex-1 px-6 py-4 text-left border-b sm:border-b-0 sm:border-r"
            style={{ borderColor: isDark ? 'rgba(201,169,110,.1)' : 'rgba(255,255,255,.1)' }}>
            <div className="text-[9px] uppercase tracking-[0.1em] mb-1"
              style={{ color: isDark ? 'var(--t-text-subtle)' : 'rgba(255,255,255,.4)' }}>Заезд</div>
            <div className="text-sm" style={{ color: isDark ? 'var(--t-text)' : '#fff' }}>
              {hotel.checkin_time || '14:00'}
            </div>
          </div>
          <div className="flex-1 px-6 py-4 text-left border-b sm:border-b-0 sm:border-r"
            style={{ borderColor: isDark ? 'rgba(201,169,110,.1)' : 'rgba(255,255,255,.1)' }}>
            <div className="text-[9px] uppercase tracking-[0.1em] mb-1"
              style={{ color: isDark ? 'var(--t-text-subtle)' : 'rgba(255,255,255,.4)' }}>Выезд</div>
            <div className="text-sm" style={{ color: isDark ? 'var(--t-text)' : '#fff' }}>
              {hotel.checkout_time || '12:00'}
            </div>
          </div>
          <div className="flex-1 px-6 py-4 text-left border-b sm:border-b-0 sm:border-r"
            style={{ borderColor: isDark ? 'rgba(201,169,110,.1)' : 'rgba(255,255,255,.1)' }}>
            <div className="text-[9px] uppercase tracking-[0.1em] mb-1"
              style={{ color: isDark ? 'var(--t-text-subtle)' : 'rgba(255,255,255,.4)' }}>Гости</div>
            <div className="text-sm" style={{ color: isDark ? 'var(--t-text)' : '#fff' }}>2 гостя</div>
          </div>
          <div
            className="px-8 py-4 flex items-center justify-center gap-2.5 text-[11px] uppercase tracking-[0.08em] font-semibold shrink-0 transition-colors"
            style={{ background: 'var(--t-primary)', color: isDark ? '#0A0A08' : '#fff' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            Найти
          </div>
        </a>
      </div>

      {/* Amenity bar at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 hidden sm:block"
        style={{
          background: isDark ? 'rgba(10,10,8,.7)' : 'rgba(0,0,0,.3)',
          backdropFilter: 'blur(10px)',
          borderTop: isDark ? '1px solid rgba(201,169,110,.1)' : '1px solid rgba(255,255,255,.1)',
        }}
      >
        <div className="max-w-[1100px] mx-auto px-8 py-4 flex items-center justify-center gap-10 sm:gap-12">
          {[
            { icon: <path d="M5 12.55a11 11 0 0 1 14.08 0" />, label: 'Wi-Fi' },
            { icon: <><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /></>, label: 'Завтрак' },
            { icon: <path d="M12 2v10M18.4 6.6L12 12M5.6 6.6L12 12M12 12v10M18.4 17.4L12 12M5.6 17.4L12 12" />, label: 'Климат' },
            { icon: <><rect x="1" y="3" width="15" height="13" rx="2" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>, label: 'Трансфер' },
            { icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /></>, label: '24/7' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1.5">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                style={{ color: isDark ? 'rgba(201,169,110,.5)' : 'rgba(255,255,255,.5)' }}
              >
                {item.icon}
              </svg>
              <span className="text-[10px] uppercase tracking-[0.08em]"
                style={{ color: isDark ? 'var(--t-text-subtle)' : 'rgba(255,255,255,.4)' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
