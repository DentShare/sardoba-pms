'use client';

import type { HotelExtra } from '@/lib/api/public-booking';
import { formatMoney } from '@/lib/utils/money';
import { useBookingTheme } from '@/lib/themes';
import { PRICE_TYPE_LABELS } from '../constants';

interface BookingExtrasShowcaseProps {
  extras: HotelExtra[];
  showPrices?: boolean;
}

const EXTRA_ICONS: Record<string, JSX.Element> = {
  breakfast: <><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /></>,
  transfer: <><rect x="1" y="3" width="15" height="13" rx="2" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>,
  parking: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></>,
  laundry: <path d="M3 6h18M3 12h18M3 18h18" />,
  tour: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
};

/**
 * Extras/services section with theme-adaptive styling.
 * Grid layout (default) or list layout (minimal-white).
 */
export function BookingExtrasShowcase({ extras, showPrices = true }: BookingExtrasShowcaseProps) {
  const { theme, isDark } = useBookingTheme();
  const layout = theme.layout.extrasLayout;

  if (!extras || extras.length === 0) return null;

  return (
    <section className="py-16 sm:py-20" style={{ background: isDark ? 'var(--t-bg-alt)' : 'var(--t-surface)' }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14">
        <div className="text-center mb-10">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{
              backgroundColor: `rgba(var(--t-primary-rgb), 0.1)`,
              color: 'var(--t-primary)',
            }}
          >
            Услуги
          </span>
          <h2
            className="text-2xl sm:text-3xl lg:text-4xl"
            style={{
              fontFamily: 'var(--t-font-heading)',
              fontWeight: isDark ? 300 : 600,
              letterSpacing: '-0.02em',
            }}
          >
            Дополнительные услуги
          </h2>
        </div>

        {layout === 'list' ? (
          /* ── List layout (minimal-white) ── */
          <div className="max-w-2xl mx-auto">
            {extras.map((extra, index) => (
              <div
                key={extra.id}
                className="flex items-center gap-4 py-4 border-b transition-colors"
                style={{ borderColor: 'var(--t-border-subtle)' }}
              >
                <span
                  className="w-7 h-7 flex items-center justify-center rounded text-sm font-bold shrink-0"
                  style={{ background: 'var(--t-bg-alt)', color: 'var(--t-text-subtle)' }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>{extra.name}</span>
                </div>
                {showPrices && (
                  <span className="text-sm font-semibold shrink-0" style={{ color: 'var(--t-text)' }}>
                    {formatMoney(extra.price)}
                    <span className="text-xs font-normal text-t-text-subtle ml-1">
                      {PRICE_TYPE_LABELS[extra.price_type]}
                    </span>
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* ── Grid layout (default) ── */
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {extras.map((extra) => {
              const iconKey = extra.name?.toLowerCase().includes('завтрак') ? 'breakfast'
                : extra.name?.toLowerCase().includes('трансфер') ? 'transfer'
                : extra.name?.toLowerCase().includes('парковка') ? 'parking'
                : extra.name?.toLowerCase().includes('экскурс') || extra.name?.toLowerCase().includes('тур') ? 'tour'
                : extra.name?.toLowerCase().includes('стирка') || extra.name?.toLowerCase().includes('прачеч') ? 'laundry'
                : null;

              return (
                <div
                  key={extra.id}
                  className="flex gap-4 items-start p-5 transition-all"
                  style={{
                    background: isDark ? 'var(--t-bg-alt)' : 'var(--t-surface)',
                    border: `1px solid ${isDark ? 'rgba(201,169,110,.1)' : 'var(--t-border-subtle)'}`,
                    borderRadius: isDark ? '0' : 'var(--t-card-radius, 12px)',
                    boxShadow: isDark ? 'none' : 'var(--t-card-shadow)',
                  }}
                >
                  <div
                    className="w-11 h-11 flex items-center justify-center rounded-[10px] shrink-0"
                    style={{
                      background: isDark ? 'transparent' : `rgba(var(--t-primary-rgb), 0.08)`,
                      border: isDark ? '1px solid rgba(201,169,110,.15)' : 'none',
                    }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                      style={{ color: 'var(--t-primary)' }}>
                      {iconKey && EXTRA_ICONS[iconKey] ? EXTRA_ICONS[iconKey] : (
                        <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>
                      )}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--t-text)' }}>{extra.name}</h3>
                    {extra.description && (
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--t-text-subtle)' }}>{extra.description}</p>
                    )}
                    {showPrices && (
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="font-bold text-sm" style={{ color: 'var(--t-primary)' }}>
                          {formatMoney(extra.price)}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--t-text-subtle)' }}>
                          {PRICE_TYPE_LABELS[extra.price_type]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
