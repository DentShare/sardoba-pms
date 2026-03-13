'use client';

import { formatMoney } from '@/lib/utils/money';
import type { PriceCalculation } from '@/lib/api/public-booking';
import { useBookingTheme } from '@/lib/themes';

interface MobilePriceBarProps {
  priceCalc: PriceCalculation | null;
  visible: boolean;
}

/**
 * Fixed bottom bar on mobile with total price and CTA button.
 */
export function MobilePriceBar({ priceCalc, visible }: MobilePriceBarProps) {
  const { isDark } = useBookingTheme();

  if (!visible || !priceCalc) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden px-4 py-3 flex items-center justify-between"
      style={{
        background: isDark ? 'rgba(10,10,8,.95)' : 'rgba(255,255,255,.95)',
        backdropFilter: 'blur(20px)',
        borderTop: isDark ? '1px solid rgba(201,169,110,.15)' : '1px solid var(--t-border-subtle)',
      }}
    >
      <div>
        <span className="text-[10px] uppercase tracking-[0.06em]" style={{ color: 'var(--t-text-subtle)' }}>Итого</span>
        <p className="text-lg font-bold" style={{ color: 'var(--t-primary)', fontFamily: 'var(--t-font-heading)' }}>
          {formatMoney(priceCalc.total)}
        </p>
      </div>
      <a
        href="#booking"
        className="px-6 py-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] transition-all"
        style={{
          background: 'var(--t-primary)',
          color: isDark ? '#0A0A08' : '#fff',
          borderRadius: isDark ? '0' : '12px',
        }}
      >
        Забронировать
      </a>
    </div>
  );
}
