'use client';

import { cn } from '@/lib/cn';
import { getNights } from '@/lib/utils/dates';
import { IconCalendar } from '../icons/booking-icons';

interface DateSelectorProps {
  checkIn: string;
  checkOut: string;
  onCheckInChange: (date: string) => void;
  onCheckOutChange: (date: string) => void;
  formErrors: Record<string, string>;
  today: string;
}

/**
 * Step 1: Check-in / Check-out date inputs.
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
    <div className="booking-card p-6">
      <h3
        className="flex items-center gap-2 text-lg font-semibold text-t-text mb-4"
        style={{ fontFamily: 'var(--t-font-heading)' }}
      >
        <span className="w-7 h-7 rounded-full bg-t-primary text-white text-sm flex items-center justify-center font-bold">1</span>
        Даты проживания
      </h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-t-text-muted mb-1">
            <IconCalendar className="inline w-4 h-4 mr-1 text-t-text-subtle" />
            Дата заезда <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            min={today}
            value={checkIn}
            onChange={(e) => {
              onCheckInChange(e.target.value);
              if (checkOut && e.target.value >= checkOut) onCheckOutChange('');
            }}
            className={cn(
              'booking-input w-full',
              formErrors.checkIn && 'border-red-500',
            )}
          />
          {formErrors.checkIn && <p className="mt-1 text-xs text-red-600">{formErrors.checkIn}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-t-text-muted mb-1">
            <IconCalendar className="inline w-4 h-4 mr-1 text-t-text-subtle" />
            Дата выезда <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            min={checkIn || today}
            value={checkOut}
            onChange={(e) => onCheckOutChange(e.target.value)}
            className={cn(
              'booking-input w-full',
              formErrors.checkOut && 'border-red-500',
            )}
          />
          {formErrors.checkOut && <p className="mt-1 text-xs text-red-600">{formErrors.checkOut}</p>}
        </div>
      </div>
      {nights > 0 && (
        <p className="mt-3 text-sm text-t-primary font-medium">
          {nights} {nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей'}
        </p>
      )}
    </div>
  );
}
