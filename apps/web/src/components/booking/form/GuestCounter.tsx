'use client';

import { Counter } from '../shared/Counter';

interface GuestCounterProps {
  adults: number;
  children: number;
  onAdultsChange: (v: number) => void;
  onChildrenChange: (v: number) => void;
  maxAdults: number;
  maxChildren: number;
}

/**
 * Step 3: Adults + Children counters.
 */
export function GuestCounter({
  adults,
  children,
  onAdultsChange,
  onChildrenChange,
  maxAdults,
  maxChildren,
}: GuestCounterProps) {
  return (
    <div className="booking-card p-6">
      <h3
        className="flex items-center gap-2 text-lg font-semibold text-t-text mb-4"
        style={{ fontFamily: 'var(--t-font-heading)' }}
      >
        <span className="w-7 h-7 rounded-full bg-t-primary text-white text-sm flex items-center justify-center font-bold">3</span>
        Гости
      </h3>
      <div className="space-y-4 max-w-sm">
        <Counter
          label="Взрослые"
          value={adults}
          onChange={onAdultsChange}
          min={1}
          max={maxAdults}
        />
        <Counter
          label="Дети"
          value={children}
          onChange={onChildrenChange}
          min={0}
          max={maxChildren}
        />
      </div>
    </div>
  );
}
