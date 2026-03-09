'use client';

import { AmenityIcon } from '../icons/booking-icons';
import { AMENITY_LABELS } from '../constants';

interface AmenityBadgeProps {
  amenity: string;
}

export function AmenityBadge({ amenity }: AmenityBadgeProps) {
  return (
    <span className="flex items-center gap-1 text-xs bg-t-bg-alt text-t-text-muted px-2 py-1 rounded-full">
      <AmenityIcon amenity={amenity} />
      {AMENITY_LABELS[amenity] || amenity}
    </span>
  );
}
