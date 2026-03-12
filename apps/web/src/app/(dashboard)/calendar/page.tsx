'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { BookingSidebar } from '@/components/calendar/BookingSidebar';
import { FloorPlanAvailabilityView } from '@/components/floor-plan/FloorPlanAvailabilityView';
import { usePropertyId } from '@/lib/hooks/use-property-id';
import { useBookingStore } from '@/lib/store/use-booking-store';
import { useTodaySummary } from '@/lib/hooks/use-bookings';
import { PageSpinner } from '@/components/ui/Spinner';

function GuestStatsBar({ propertyId }: { propertyId: number }) {
  const { data } = useTodaySummary(propertyId);

  if (!data) return null;

  const { stats, guestCounts } = data;

  const cards = [
    {
      label: 'Гостей в отеле',
      value: guestCounts?.inHouseTotal ?? 0,
      sub: guestCounts
        ? `${guestCounts.inHouseAdults} взр. + ${guestCounts.inHouseChildren} дет.`
        : undefined,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Завтраков сегодня',
      value: guestCounts?.breakfastToday ?? 0,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      ),
    },
    {
      label: 'Завтраков завтра',
      value: guestCounts?.breakfastTomorrow ?? 0,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      ),
    },
    {
      label: 'Заезды сегодня',
      value: stats.arrivalsCount,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
      ),
    },
    {
      label: 'Выезды сегодня',
      value: stats.departuresCount,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      ),
    },
    {
      label: 'Загрузка',
      value: `${stats.occupancyPercent}%`,
      sub: `${stats.occupiedRooms} из ${stats.totalRooms} номеров`,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${card.color}`}
        >
          <div className="shrink-0 opacity-70">{card.icon}</div>
          <div className="min-w-0">
            <div className="text-2xl font-bold leading-tight">{card.value}</div>
            <div className="text-xs font-medium opacity-80 truncate">{card.label}</div>
            {card.sub && (
              <div className="text-[10px] opacity-60 truncate">{card.sub}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

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

      <GuestStatsBar propertyId={propertyId} />

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
