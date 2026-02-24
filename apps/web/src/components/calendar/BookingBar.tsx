'use client';

import { cn } from '@/lib/cn';
import { BOOKING_COLORS } from '@/lib/utils/booking-colors';
import { formatMoney } from '@/lib/utils/money';
import type { BookingStatus, BookingSource } from '@sardoba/shared';

interface BookingBarProps {
  id: number;
  guestName: string;
  status: BookingStatus;
  source: BookingSource;
  totalAmount: number;
  /** Offset in px from the left of the row */
  left: number;
  /** Width in px */
  width: number;
  onClick: (id: number) => void;
}

const STATUS_BAR_COLORS: Record<BookingStatus, string> = {
  new: 'bg-blue-400',
  confirmed: 'bg-green-500',
  checked_in: 'bg-sardoba-gold',
  checked_out: 'bg-gray-400',
  cancelled: 'bg-red-400',
  no_show: 'bg-orange-400',
};

export function BookingBar({
  id,
  guestName,
  status,
  totalAmount,
  left,
  width,
  onClick,
}: BookingBarProps) {
  const colors = BOOKING_COLORS[status];
  const barColor = STATUS_BAR_COLORS[status];

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(id);
      }}
      className={cn(
        'absolute top-1 h-[calc(100%-8px)] rounded-md px-2 flex items-center gap-1',
        'text-xs font-medium overflow-hidden whitespace-nowrap cursor-pointer',
        'hover:brightness-95 transition-all z-10 shadow-sm border border-white/50',
        barColor,
        'text-white',
      )}
      style={{ left: `${left}px`, width: `${Math.max(width, 24)}px` }}
      title={`${guestName} - ${formatMoney(totalAmount)} - ${colors.label}`}
    >
      {width > 60 && (
        <span className="truncate">{guestName}</span>
      )}
    </button>
  );
}
