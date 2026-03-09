'use client';

import { formatMoney } from '@/lib/utils/money';
import type { PriceCalculation } from '@/lib/api/public-booking';

interface MobilePriceBarProps {
  priceCalc: PriceCalculation | null;
  visible: boolean;
}

/**
 * Fixed bottom bar on mobile with total price and CTA button.
 */
export function MobilePriceBar({ priceCalc, visible }: MobilePriceBarProps) {
  if (!visible || !priceCalc) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-t-surface/95 backdrop-blur-lg border-t border-t-border-subtle px-4 py-3 flex items-center justify-between">
      <div>
        <span className="text-xs text-t-text-muted">Итого</span>
        <p className="text-lg font-bold text-t-primary">{formatMoney(priceCalc.total)}</p>
      </div>
      <a
        href="#booking"
        className="booking-btn-primary px-6 py-2.5 text-sm"
      >
        Забронировать
      </a>
    </div>
  );
}
