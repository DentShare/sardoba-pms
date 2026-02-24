'use client';

import { useCallback } from 'react';
import { addDays, subDays, startOfToday, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { useBookingStore } from '@/lib/store/use-booking-store';

export function CalendarHeader() {
  const { selectedDate, viewDays, setSelectedDate, setViewDays } =
    useBookingStore();

  const goToToday = useCallback(() => {
    setSelectedDate(startOfToday());
  }, [setSelectedDate]);

  const goBack = useCallback(() => {
    setSelectedDate(subDays(selectedDate, viewDays));
  }, [selectedDate, viewDays, setSelectedDate]);

  const goForward = useCallback(() => {
    setSelectedDate(addDays(selectedDate, viewDays));
  }, [selectedDate, viewDays, setSelectedDate]);

  const monthLabel = format(selectedDate, 'LLLL yyyy', { locale: ru });

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        <button
          onClick={goBack}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          title="Назад"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <h2 className="text-lg font-semibold text-gray-900 capitalize min-w-[180px] text-center">
          {monthLabel}
        </h2>

        <button
          onClick={goForward}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          title="Вперед"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        <Button variant="outline" size="sm" onClick={goToToday}>
          Сегодня
        </Button>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {([30, 60, 90] as const).map((days) => (
          <button
            key={days}
            onClick={() => setViewDays(days)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              viewDays === days
                ? 'bg-white text-sardoba-blue shadow-sm'
                : 'text-gray-600 hover:text-gray-900',
            )}
          >
            {days} дн.
          </button>
        ))}
      </div>
    </div>
  );
}
