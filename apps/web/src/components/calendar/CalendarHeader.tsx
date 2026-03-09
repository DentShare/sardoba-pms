'use client';

import { useCallback } from 'react';
import {
  addDays,
  subDays,
  startOfToday,
  format,
  parseISO,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { useBookingStore } from '@/lib/store/use-booking-store';

function GridIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function FloorPlanIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M2 12h8" /><path d="M10 3v18" /><path d="M14 12h8" /><path d="M14 3v9" />
    </svg>
  );
}

export function CalendarHeader() {
  const {
    selectedDate,
    viewDays,
    viewMode,
    focusDate,
    focusDateEnd,
    setSelectedDate,
    setViewDays,
    setViewMode,
    setFocusDate,
    setFocusPeriod,
  } = useBookingStore();

  const goToToday = useCallback(() => {
    setSelectedDate(startOfToday());
    setFocusDate(startOfToday());
  }, [setSelectedDate, setFocusDate]);

  const goBack = useCallback(() => {
    if (viewMode === 'grid') {
      setSelectedDate(subDays(selectedDate, viewDays));
    } else {
      setFocusDate(subDays(focusDate, 1));
    }
  }, [viewMode, selectedDate, viewDays, focusDate, setSelectedDate, setFocusDate]);

  const goForward = useCallback(() => {
    if (viewMode === 'grid') {
      setSelectedDate(addDays(selectedDate, viewDays));
    } else {
      setFocusDate(addDays(focusDate, 1));
    }
  }, [viewMode, selectedDate, viewDays, focusDate, setSelectedDate, setFocusDate]);

  const monthLabel = viewMode === 'grid'
    ? format(selectedDate, 'LLLL yyyy', { locale: ru })
    : format(focusDate, 'LLLL yyyy', { locale: ru });

  const handleFocusDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val) setFocusDate(parseISO(val));
    },
    [setFocusDate],
  );

  const handlePeriodEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val) {
        setFocusPeriod(focusDate, parseISO(val));
      } else {
        setFocusPeriod(focusDate, null);
      }
    },
    [focusDate, setFocusPeriod],
  );

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* Top row: navigation + view toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === 'grid'
                  ? 'bg-white text-sardoba-blue shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              )}
              title="Шахматка"
            >
              <GridIcon />
              <span className="hidden md:inline">Шахматка</span>
            </button>
            <button
              onClick={() => setViewMode('floorplan')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === 'floorplan'
                  ? 'bg-white text-sardoba-blue shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              )}
              title="План этажей"
            >
              <FloorPlanIcon />
              <span className="hidden md:inline">Этажи</span>
            </button>
          </div>

          {/* Period selector (grid mode) */}
          {viewMode === 'grid' && (
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
          )}
        </div>
      </div>

      {/* Date picker row (floor plan mode only) */}
      {viewMode === 'floorplan' && (
        <div className="flex flex-wrap items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">
              Дата:
            </label>
            <input
              type="date"
              value={format(focusDate, 'yyyy-MM-dd')}
              onChange={handleFocusDateChange}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-sardoba-gold outline-none bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">
              до:
            </label>
            <input
              type="date"
              value={focusDateEnd ? format(focusDateEnd, 'yyyy-MM-dd') : ''}
              onChange={handlePeriodEndChange}
              min={format(addDays(focusDate, 1), 'yyyy-MM-dd')}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-sardoba-gold outline-none bg-white"
              placeholder="Выберите конец периода"
            />
            {focusDateEnd && (
              <button
                onClick={() => setFocusPeriod(focusDate, null)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                title="Сбросить период"
              >
                ✕
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 ml-auto">
            {focusDateEnd
              ? 'Показывает доступность за весь период'
              : 'Показывает доступность на выбранную дату'}
          </p>
        </div>
      )}
    </div>
  );
}
