'use client';

import type { HotelExtra } from '@/lib/api/public-booking';
import { formatMoney } from '@/lib/utils/money';
import { useBookingTheme } from '@/lib/themes';
import { IconService } from '../icons/booking-icons';
import { PRICE_TYPE_LABELS } from '../constants';

interface BookingExtrasShowcaseProps {
  extras: HotelExtra[];
  showPrices?: boolean;
}

/**
 * Extras/services display section.
 * Grid layout (default) or list layout (minimal-white theme).
 */
export function BookingExtrasShowcase({ extras, showPrices = true }: BookingExtrasShowcaseProps) {
  const { theme } = useBookingTheme();
  const layout = theme.layout.extrasLayout;

  if (!extras || extras.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 bg-t-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className="text-2xl sm:text-3xl font-bold text-t-primary mb-3"
            style={{ fontFamily: 'var(--t-font-heading)' }}
          >
            Дополнительные услуги
          </h2>
          <p className="text-t-text-muted max-w-lg mx-auto">
            Сделайте ваше пребывание ещё комфортнее
          </p>
        </div>

        {layout === 'list' ? (
          /* ── List layout (minimal-white) ── */
          <div className="max-w-2xl mx-auto divide-y divide-t-border-subtle">
            {extras.map((extra, index) => (
              <div
                key={extra.id}
                className="flex items-center gap-6 py-4 hover:bg-t-surface-hover transition-colors"
              >
                <span className="text-2xl font-bold text-t-text-subtle w-10 text-right shrink-0">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-t-text text-sm">{extra.name}</h3>
                  {extra.description && (
                    <p className="text-xs text-t-text-subtle mt-0.5 line-clamp-1">{extra.description}</p>
                  )}
                </div>
                {showPrices && (
                  <div className="text-right shrink-0">
                    <span className="font-bold text-t-text text-sm">
                      {formatMoney(extra.price)}
                    </span>
                    <span className="text-xs text-t-text-subtle ml-1">
                      {PRICE_TYPE_LABELS[extra.price_type]}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* ── Grid layout (default) ── */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {extras.map((extra) => (
              <div
                key={extra.id}
                className="booking-card p-5 flex gap-4 items-start hover:shadow-lg transition-all duration-300"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--t-primary-light)' }}
                >
                  <IconService className="text-t-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-t-text text-sm">{extra.name}</h3>
                  {extra.description && (
                    <p className="text-xs text-t-text-subtle mt-0.5 line-clamp-2">{extra.description}</p>
                  )}
                  {showPrices && (
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="font-bold text-t-primary text-sm">
                        {formatMoney(extra.price)}
                      </span>
                      <span className="text-xs text-t-text-subtle">
                        {PRICE_TYPE_LABELS[extra.price_type]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
