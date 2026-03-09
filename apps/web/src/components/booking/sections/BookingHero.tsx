'use client';

import { useBookingTheme } from '@/lib/themes';
import type { HotelPublicInfo } from '@/lib/api/public-booking';
import { BookingHeroCentered } from './BookingHeroCentered';
import { BookingHeroSplit } from './BookingHeroSplit';
import { BookingHeroMinimal } from './BookingHeroMinimal';

interface BookingHeroProps {
  hotel: HotelPublicInfo;
}

/**
 * Dispatcher component that renders the right hero variant
 * based on the current theme's layout.hero setting.
 */
export function BookingHero({ hotel }: BookingHeroProps) {
  const { theme } = useBookingTheme();
  const heroLayout = theme.layout.hero;

  switch (heroLayout) {
    case 'split-grid':
      return <BookingHeroSplit hotel={hotel} />;
    case 'minimal-bar':
      return <BookingHeroMinimal hotel={hotel} />;
    case 'centered':
    default:
      return <BookingHeroCentered hotel={hotel} />;
  }
}
