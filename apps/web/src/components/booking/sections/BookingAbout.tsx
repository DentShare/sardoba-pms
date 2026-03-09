'use client';

import type { HotelPublicInfo } from '@/lib/api/public-booking';
import { PhotoGallery } from '../shared/PhotoGallery';

interface BookingAboutProps {
  hotel: HotelPublicInfo;
}

export function BookingAbout({ hotel }: BookingAboutProps) {
  if (!hotel.description && (!hotel.photos || hotel.photos.length === 0)) {
    return null;
  }

  return (
    <section className="py-16 sm:py-20 bg-t-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {hotel.description && (
          <div className="max-w-3xl mb-12">
            <h2
              className="text-2xl sm:text-3xl font-bold text-t-primary mb-6"
              style={{ fontFamily: 'var(--t-font-heading)' }}
            >
              Об отеле
            </h2>
            <p className="text-t-text-muted leading-relaxed text-base sm:text-lg whitespace-pre-line">
              {hotel.description}
            </p>
          </div>
        )}

        {hotel.photos?.length > 0 && (
          <PhotoGallery photos={hotel.photos} />
        )}
      </div>
    </section>
  );
}
