'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { BookingSidebar } from '@/components/calendar/BookingSidebar';

// TODO: Get from auth context / user store
const PROPERTY_ID = 1;

export default function CalendarPage() {
  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Шахматка"
        subtitle="Календарь бронирований по номерам"
      />

      <CalendarHeader />
      <CalendarGrid propertyId={PROPERTY_ID} />
      <BookingSidebar />
    </div>
  );
}
