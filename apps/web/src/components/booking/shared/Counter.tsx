'use client';

import { IconMinus, IconPlus } from '../icons/booking-icons';

interface CounterProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}

export function Counter({
  value,
  onChange,
  min = 0,
  max = 10,
  label,
}: CounterProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-t-text-muted">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-t-border-subtle flex items-center justify-center text-t-text-muted hover:border-t-primary hover:text-t-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <IconMinus />
        </button>
        <span className="w-6 text-center font-semibold text-t-text">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full border border-t-border-subtle flex items-center justify-center text-t-text-muted hover:border-t-primary hover:text-t-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <IconPlus />
        </button>
      </div>
    </div>
  );
}
