'use client';

import { useMemo } from 'react';
import {
  differenceInDays,
  parseISO,
  format,
  isWithinInterval,
  startOfDay,
} from 'date-fns';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Badge';
import { BookingBar } from './BookingBar';
import { CalendarCell } from './CalendarCell';
import type { CalendarRoom as CalendarRoomType } from '@sardoba/shared';

const ROOM_TYPE_LABELS: Record<string, string> = {
  single: 'SGL',
  double: 'DBL',
  family: 'FAM',
  suite: 'STE',
  dorm: 'DRM',
};

const CELL_WIDTH = 40;

interface CalendarRoomRowProps {
  room: CalendarRoomType;
  dates: string[];
  startDate: Date;
  onCellClick: (roomId: number, date: string) => void;
  onBookingClick: (bookingId: number) => void;
}

export function CalendarRoomRow({
  room,
  dates,
  startDate,
  onCellClick,
  onBookingClick,
}: CalendarRoomRowProps) {
  const blockedDates = useMemo(() => {
    const set = new Set<string>();
    room.blocks.forEach((block) => {
      const from = parseISO(block.dateFrom);
      const to = parseISO(block.dateTo);
      dates.forEach((d) => {
        const date = parseISO(d);
        if (
          isWithinInterval(date, {
            start: startOfDay(from),
            end: startOfDay(to),
          })
        ) {
          set.add(d);
        }
      });
    });
    return set;
  }, [room.blocks, dates]);

  const bookingBars = useMemo(() => {
    return room.bookings.map((booking) => {
      const checkIn = parseISO(booking.checkIn);
      const checkOut = parseISO(booking.checkOut);
      const offsetDays = Math.max(
        0,
        differenceInDays(startOfDay(checkIn), startOfDay(startDate)),
      );
      const endOffset = differenceInDays(
        startOfDay(checkOut),
        startOfDay(startDate),
      );
      const visibleStart = Math.max(0, offsetDays);
      const visibleEnd = Math.min(dates.length, endOffset);
      const barDays = visibleEnd - visibleStart;

      if (barDays <= 0) return null;

      return {
        ...booking,
        left: visibleStart * CELL_WIDTH,
        width: barDays * CELL_WIDTH,
      };
    });
  }, [room.bookings, dates, startDate]);

  return (
    <div className="flex border-b border-gray-100">
      {/* Sticky room name column */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 bg-white border-r border-gray-200',
          'sticky left-0 z-20 min-w-[160px] max-w-[160px]',
        )}
      >
        <div className="truncate">
          <div className="text-sm font-medium text-gray-900 truncate">
            {room.name}
          </div>
          <Badge size="sm" variant="default">
            {ROOM_TYPE_LABELS[room.type] || room.type}
          </Badge>
        </div>
      </div>

      {/* Scrollable date cells area */}
      <div className="relative flex" style={{ minWidth: dates.length * CELL_WIDTH }}>
        {/* Background cells */}
        {dates.map((date) => (
          <CalendarCell
            key={date}
            date={date}
            isBlocked={blockedDates.has(date)}
            onClick={() => onCellClick(room.id, date)}
          />
        ))}

        {/* Booking bars overlaid */}
        {bookingBars.map(
          (bar) =>
            bar && (
              <BookingBar
                key={bar.id}
                id={bar.id}
                guestName={bar.guestName}
                status={bar.status}
                source={bar.source}
                totalAmount={bar.totalAmount}
                left={bar.left}
                width={bar.width}
                onClick={onBookingClick}
              />
            ),
        )}
      </div>
    </div>
  );
}
