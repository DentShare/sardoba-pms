'use client';

import { cn } from '@/lib/cn';
import { useBookingTheme } from '@/lib/themes';

export function BookingCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { isDark } = useBookingTheme();
  return (
    <div className={cn('booking-card p-6', isDark && 'backdrop-blur-xl', className)} {...props}>
      {children}
    </div>
  );
}
