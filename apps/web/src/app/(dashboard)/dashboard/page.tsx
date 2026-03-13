'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { BookingForm } from '@/components/forms/BookingForm';
import { useTodaySummary, useCheckinBooking, useCheckoutBooking } from '@/lib/hooks/use-bookings';
import { usePropertyId } from '@/lib/hooks/use-property-id';
import { formatMoney } from '@/lib/utils/money';
import { formatDate } from '@/lib/utils/dates';
import type { BookingStatus } from '@sardoba/shared';
import type { TodaySummaryBooking } from '@/lib/api/bookings';

// ─── Icons ────────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color = 'blue',
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: 'blue' | 'gold' | 'green' | 'purple';
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700',
    gold: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={cn('text-2xl font-bold', colorMap[color].split(' ')[1])}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

// ─── Booking row component ─────────────────────────────────────────────────────

function ArrivalRow({
  booking,
  onCheckin,
  loading,
}: {
  booking: TodaySummaryBooking;
  onCheckin: (id: number) => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">
            {booking.guestName || `Гость #${booking.id}`}
          </span>
          <StatusBadge status={booking.status as BookingStatus} />
        </div>
        <div className="text-sm text-gray-500 mt-0.5">
          {booking.roomName || `Комната #${booking.roomId}`} · {booking.adults} взр.
          {booking.children > 0 ? ` + ${booking.children} дет.` : ''}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="text-sm font-medium">{formatMoney(booking.totalAmount)}</div>
          {booking.paidAmount < booking.totalAmount && (
            <div className="text-xs text-orange-600">
              Остаток: {formatMoney(booking.totalAmount - booking.paidAmount)}
            </div>
          )}
          {booking.paidAmount >= booking.totalAmount && (
            <div className="text-xs text-green-600">Оплачено</div>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/bookings/${booking.id}`}>
            <Button variant="outline" size="sm">Карточка</Button>
          </Link>
          {(booking.status === 'confirmed' || booking.status === 'new') && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => onCheckin(booking.id)}
              loading={loading}
            >
              Заезд
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function DepartureRow({
  booking,
  onCheckout,
  loading,
}: {
  booking: TodaySummaryBooking;
  onCheckout: (id: number) => void;
  loading: boolean;
}) {
  const balance = booking.totalAmount - booking.paidAmount;
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">
            {booking.guestName || `Гость #${booking.id}`}
          </span>
          <StatusBadge status={booking.status as BookingStatus} />
        </div>
        <div className="text-sm text-gray-500 mt-0.5">
          {booking.roomName || `Комната #${booking.roomId}`} ·{' '}
          {booking.checkIn} → {booking.checkOut}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          {balance > 0 ? (
            <div className="text-sm font-medium text-orange-600">
              Долг: {formatMoney(balance)}
            </div>
          ) : balance < 0 ? (
            <div className="text-sm font-medium text-blue-600">
              Переплата: {formatMoney(Math.abs(balance))}
            </div>
          ) : (
            <div className="text-sm font-medium text-green-600">Оплачено</div>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/bookings/${booking.id}`}>
            <Button variant="outline" size="sm">Карточка</Button>
          </Link>
          {booking.status === 'checked_in' && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => onCheckout(booking.id)}
              loading={loading}
            >
              Выезд
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const propertyId = usePropertyId();
  const { data, isLoading, refetch } = useTodaySummary(propertyId);

  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isWalkIn, setIsWalkIn] = useState(false);

  const checkinMut = useCheckinBooking();
  const checkoutMut = useCheckoutBooking();

  const handleCheckin = (id: number) => {
    checkinMut.mutate(id, {
      onSuccess: () => {
        toast.success('Гость заселён');
        refetch();
      },
      onError: () => toast.error('Ошибка при заселении'),
    });
  };

  const handleCheckout = (id: number) => {
    checkoutMut.mutate(id, {
      onSuccess: () => {
        toast.success('Гость выселен');
        refetch();
      },
      onError: () => toast.error('Ошибка при выселении'),
    });
  };

  if (isLoading) return <PageSpinner />;

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Сегодня"
        subtitle={today}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsWalkIn(false);
                setShowBookingForm(true);
              }}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              }
            >
              Бронирование
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsWalkIn(true);
                setShowBookingForm(true);
              }}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            >
              Walk-in
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Загрузка"
          value={`${data?.stats.occupancyPercent ?? 0}%`}
          sub={`${data?.stats.occupiedRooms ?? 0} из ${data?.stats.totalRooms ?? 0} номеров`}
          color="blue"
        />
        <KpiCard
          label="В отеле сейчас"
          value={data?.stats.inHouseCount ?? 0}
          sub={`${data?.guestCounts.inHouseAdults ?? 0} взр. + ${data?.guestCounts.inHouseChildren ?? 0} дет.`}
          color="green"
        />
        <KpiCard
          label="Заезды сегодня"
          value={data?.stats.arrivalsCount ?? 0}
          sub={`${data?.arrivals.filter((b) => b.status === 'checked_in').length ?? 0} уже заселено`}
          color="gold"
        />
        <KpiCard
          label="Выезды сегодня"
          value={data?.stats.departuresCount ?? 0}
          sub={`Выручка: ${formatMoney(data?.stats.todayRevenue ?? 0)}`}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Arrivals */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Заезды сегодня
              {data && data.arrivals.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({data.arrivals.length})
                </span>
              )}
            </h2>
          </div>
          {!data || data.arrivals.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Нет заездов сегодня
            </div>
          ) : (
            <div>
              {data.arrivals.map((booking) => (
                <ArrivalRow
                  key={booking.id}
                  booking={booking}
                  onCheckin={handleCheckin}
                  loading={checkinMut.isPending}
                />
              ))}
            </div>
          )}
        </div>

        {/* Departures */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Выезды сегодня
              {data && data.departures.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({data.departures.length})
                </span>
              )}
            </h2>
          </div>
          {!data || data.departures.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Нет выездов сегодня
            </div>
          ) : (
            <div>
              {data.departures.map((booking) => (
                <DepartureRow
                  key={booking.id}
                  booking={booking}
                  onCheckout={handleCheckout}
                  loading={checkoutMut.isPending}
                />
              ))}
            </div>
          )}
        </div>

        {/* In-house guests */}
        {data && data.inHouse.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                В отеле сейчас
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({data.inHouse.length})
                </span>
              </h2>
              <div className="text-sm text-gray-500">
                Завтрак завтра: {data.guestCounts.breakfastTomorrow} чел.
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.inHouse.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/bookings/${booking.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-sardoba-gold/40 hover:bg-amber-50/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-sardoba-blue/10 flex items-center justify-center text-sardoba-blue font-semibold text-sm shrink-0">
                    {(booking.guestName || 'G').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate text-sm">
                      {booking.guestName || `Гость #${booking.id}`}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {booking.roomName} · выезд {formatDate(booking.checkOut)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Booking Form Modal */}
      {propertyId && (
        <BookingForm
          open={showBookingForm}
          onClose={() => {
            setShowBookingForm(false);
            refetch();
          }}
          propertyId={propertyId}
          walkIn={isWalkIn}
        />
      )}
    </div>
  );
}
