'use client';

import { cn } from '@/lib/cn';
import { isToday } from '@/lib/utils/dates';

interface CalendarCellProps {
  date: string;
  isBlocked: boolean;
  onClick: () => void;
}

export function CalendarCell({ date, isBlocked, onClick }: CalendarCellProps) {
  const today = isToday(date);

  return (
    <div
      onClick={isBlocked ? undefined : onClick}
      className={cn(
        'h-10 border-r border-gray-100 relative',
        isBlocked
          ? 'bg-gray-200 cursor-not-allowed'
          : 'bg-white hover:bg-green-50 cursor-pointer',
        today && 'ring-1 ring-inset ring-sardoba-gold/40',
      )}
      style={{ minWidth: '40px' }}
    >
      {isBlocked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </div>
      )}
    </div>
  );
}
