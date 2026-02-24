'use client';

import { useMemo, useRef, useState, useCallback } from 'react';
import { addDays, format, parseISO, isToday as checkIsToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import { useCalendar } from '@/lib/hooks/use-calendar';
import { useBookingStore } from '@/lib/store/use-booking-store';
import { PageSpinner } from '@/components/ui/Spinner';
import { CalendarRoomRow } from './CalendarRoom';
import { QuickBookingModal } from './QuickBookingModal';

const CELL_WIDTH = 40;

interface CalendarGridProps {
  propertyId: number;
}

export function CalendarGrid({ propertyId }: CalendarGridProps) {
  const { selectedDate, viewDays, selectBooking } = useBookingStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [quickBooking, setQuickBooking] = useState<{
    roomId: number;
    date: string;
  } | null>(null);

  // Build date range
  const { dateFrom, dateTo, dates } = useMemo(() => {
    const from = selectedDate;
    const to = addDays(from, viewDays);
    const dateStrings: string[] = [];
    for (let i = 0; i < viewDays; i++) {
      dateStrings.push(format(addDays(from, i), 'yyyy-MM-dd'));
    }
    return {
      dateFrom: format(from, 'yyyy-MM-dd'),
      dateTo: format(to, 'yyyy-MM-dd'),
      dates: dateStrings,
    };
  }, [selectedDate, viewDays]);

  const { data, isLoading, error } = useCalendar(propertyId, dateFrom, dateTo);

  const handleCellClick = useCallback(
    (roomId: number, date: string) => {
      setQuickBooking({ roomId, date });
    },
    [],
  );

  const handleBookingClick = useCallback(
    (bookingId: number) => {
      selectBooking(bookingId);
    },
    [selectBooking],
  );

  if (isLoading) {
    return <PageSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-500">
        <div className="text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-gray-400">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
          </svg>
          <p className="text-sm">Ошибка загрузки данных календаря</p>
        </div>
      </div>
    );
  }

  const rooms = data?.rooms ?? [];

  return (
    <>
      <div
        ref={scrollRef}
        className="border border-gray-200 rounded-lg overflow-x-auto bg-white"
      >
        {/* Date headers */}
        <div className="flex sticky top-0 z-30 bg-white border-b border-gray-200">
          {/* Room label header cell */}
          <div className="min-w-[160px] max-w-[160px] px-3 py-2 bg-gray-50 border-r border-gray-200 sticky left-0 z-30 text-xs font-medium text-gray-500">
            Номер
          </div>

          {/* Date cells */}
          <div className="flex">
            {dates.map((dateStr) => {
              const d = parseISO(dateStr);
              const today = checkIsToday(d);
              const dayName = format(d, 'EEE', { locale: ru });
              const dayNum = format(d, 'd');
              const monthName = format(d, 'MMM', { locale: ru });
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;

              return (
                <div
                  key={dateStr}
                  className={cn(
                    'flex flex-col items-center justify-center py-1 border-r border-gray-100 text-xs',
                    today && 'bg-sardoba-gold/10',
                    isWeekend && !today && 'bg-gray-50',
                  )}
                  style={{ minWidth: `${CELL_WIDTH}px`, maxWidth: `${CELL_WIDTH}px` }}
                >
                  <span className={cn('text-[10px]', isWeekend ? 'text-red-400' : 'text-gray-400')}>
                    {dayName}
                  </span>
                  <span className={cn('font-semibold', today ? 'text-sardoba-gold-dark' : 'text-gray-700')}>
                    {dayNum}
                  </span>
                  {(parseInt(dayNum) === 1 || dateStr === dates[0]) && (
                    <span className="text-[9px] text-gray-400 uppercase">{monthName}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Room rows */}
        {rooms.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
            Нет номеров. Добавьте номера в настройках.
          </div>
        ) : (
          rooms.map((room) => (
            <CalendarRoomRow
              key={room.id}
              room={room}
              dates={dates}
              startDate={selectedDate}
              onCellClick={handleCellClick}
              onBookingClick={handleBookingClick}
            />
          ))
        )}
      </div>

      {/* Quick Booking Modal */}
      {quickBooking && (
        <QuickBookingModal
          open={true}
          onClose={() => setQuickBooking(null)}
          roomId={quickBooking.roomId}
          date={quickBooking.date}
          propertyId={propertyId}
        />
      )}
    </>
  );
}
