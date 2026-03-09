'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { BookingSidebar } from '@/components/calendar/BookingSidebar';
import { FloorPlanAvailabilityView } from '@/components/floor-plan/FloorPlanAvailabilityView';
import { usePropertyId } from '@/lib/hooks/use-property-id';
import { useBookingStore } from '@/lib/store/use-booking-store';
import { PageSpinner } from '@/components/ui/Spinner';

export default function CalendarPage() {
  const propertyId = usePropertyId();
  const viewMode = useBookingStore((s) => s.viewMode);

  if (!propertyId) return <PageSpinner />;

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title={viewMode === 'grid' ? 'Шахматка' : 'План этажей'}
        subtitle={
          viewMode === 'grid'
            ? 'Календарь бронирований по номерам'
            : 'Доступность номеров по этажам'
        }
      />

      <CalendarHeader />

      {viewMode === 'grid' ? (
        <CalendarGrid propertyId={propertyId} />
      ) : (
        <FloorPlanAvailabilityView propertyId={propertyId} />
      )}

      <BookingSidebar />
    </div>
  );
}
