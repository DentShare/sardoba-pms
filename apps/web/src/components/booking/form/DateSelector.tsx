'use client';

import { cn } from '@/lib/cn';
import { getNights } from '@/lib/utils/dates';

interface DateSelectorProps {
  checkIn: string;
  checkOut: string;
  onCheckInChange: (date: string) => void;
  onCheckOutChange: (date: string) => void;
  formErrors: Record<string, string>;
  today: string;
}

/**
 * Step 1: Compact check-in / check-out date inputs for form card.
 */
export function DateSelector({
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  formErrors,
  today,
}: DateSelectorProps) {
  const nights = checkIn && checkOut ? getNights(checkIn, checkOut) : 0;

  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.08em] font-medium mb-2" style={{ color: 'var(--t-text-subtle)' }}>
        Даты проживания
        {nights > 0 && (
          <span className="ml-2 normal-case tracking-normal" style={{ color: 'var(--t-primary)' }}>
            — {nights} {nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей'}
          </span>
        )}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <input
            type="date"
            min={today}
            value={checkIn}
            onChange={(e) => {
              onCheckInChange(e.target.value);
              if (checkOut && e.target.value >= checkOut) onCheckOutChange('');
            }}
            className={cn('booking-input w-full', formErrors.checkIn && 'border-red-500')}
          />
          {formErrors.checkIn && <p className="mt-1 text-[11px] text-red-500">{formErrors.checkIn}</p>}
        </div>
        <div>
          <input
            type="date"
            min={checkIn || today}
            value={checkOut}
            onChange={(e) => onCheckOutChange(e.target.value)}
            className={cn('booking-input w-full', formErrors.checkOut && 'border-red-500')}
          />
          {formErrors.checkOut && <p className="mt-1 text-[11px] text-red-500">{formErrors.checkOut}</p>}
        </div>
      </div>
    </div>
  );
}
