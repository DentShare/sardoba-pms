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
 * Step 3: Compact adults + children counters.
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
    <div>
      <label className="block text-[10px] uppercase tracking-[0.08em] font-medium mb-3" style={{ color: 'var(--t-text-subtle)' }}>
        Гости
      </label>
      <div className="space-y-3">
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
