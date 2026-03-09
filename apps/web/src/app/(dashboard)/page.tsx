'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { BookingForm } from '@/components/forms/BookingForm';
import { useTodaySummary, useConfirmBooking, useCheckinBooking, useCheckoutBooking } from '@/lib/hooks/use-bookings';
import { usePropertyId } from '@/lib/hooks/use-property-id';
import { formatMoney } from '@/lib/utils/money';
import type { TodaySummaryBooking } from '@/lib/api/bookings';
import type { BookingStatus } from '@sardoba/shared';

export default function DashboardPage() {
  const propertyId = usePropertyId();
  const { data, isLoading } = useTodaySummary(propertyId);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isWalkIn, setIsWalkIn] = useState(false);

  const confirmMut = useConfirmBooking();
  const checkinMut = useCheckinBooking();
  const checkoutMut = useCheckoutBooking();

  if (isLoading || !data) {
    return <PageSpinner />;
  }

  const { stats, arrivals, departures, inHouse } = data;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <PageHeader
        title="Сегодня"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setIsWalkIn(false); setShowBookingForm(true); }}>
              + Бронирование
            </Button>
            <Button variant="primary" onClick={() => { setIsWalkIn(true); setShowBookingForm(true); }}>
              Walk-in
            </Button>
            <Link href="/calendar">
              <Button variant="secondary">Шахматка</Button>
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Загрузка"
          value={`${stats.occupancyPercent}%`}
          sub={`${stats.occupiedRooms} из ${stats.totalRooms} номеров`}
          color="blue"
        />
        <KpiCard
          label="Заезды сегодня"
          value={stats.arrivalsCount}
          sub="ожидают заселения"
          color="green"
        />
        <KpiCard
          label="Выезды сегодня"
          value={stats.departuresCount}
          sub="ожидают выселения"
          color="orange"
        />
        <KpiCard
          label="Выручка сегодня"
          value={formatMoney(stats.todayRevenue)}
          sub={`${stats.inHouseCount} гостей в отеле`}
          color="gold"
        />
      </div>

      {/* Arrivals */}
      {arrivals.length > 0 && (
        <Section title={`Заезды (${arrivals.length})`} icon="arrive">
          <div className="divide-y divide-gray-100">
            {arrivals.map((b) => (
              <ArrivalRow
                key={b.id}
                booking={b}
                onConfirm={() => confirmMut.mutateAsync(b.id)}
                onCheckin={() => checkinMut.mutateAsync(b.id)}
                isConfirming={confirmMut.isPending}
                isCheckingIn={checkinMut.isPending}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Departures */}
      {departures.length > 0 && (
        <Section title={`Выезды (${departures.length})`} icon="depart">
          <div className="divide-y divide-gray-100">
            {departures.map((b) => (
              <DepartureRow
                key={b.id}
                booking={b}
                onCheckout={() => checkoutMut.mutateAsync(b.id)}
                isCheckingOut={checkoutMut.isPending}
              />
            ))}
          </div>
        </Section>
      )}

      {/* In-House */}
      {inHouse.length > 0 && (
        <Section title={`В отеле (${inHouse.length})`} icon="house">
          <div className="divide-y divide-gray-100">
            {inHouse.map((b) => (
              <InHouseRow key={b.id} booking={b} />
            ))}
          </div>
        </Section>
      )}

      {/* Empty state */}
      {arrivals.length === 0 && departures.length === 0 && inHouse.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">Сегодня нет активных бронирований</p>
          <p className="text-sm mt-1">Создайте новое бронирование или откройте шахматку</p>
        </div>
      )}

      {/* Booking Form Modal */}
      {propertyId && (
        <BookingForm
          open={showBookingForm}
          onClose={() => setShowBookingForm(false)}
          propertyId={propertyId}
          walkIn={isWalkIn}
        />
      )}
    </div>
  );
}

// ── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub: string;
  color: 'blue' | 'green' | 'orange' | 'gold';
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    orange: 'bg-orange-50 border-orange-200',
    gold: 'bg-amber-50 border-amber-200',
  };
  const valueColors = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    orange: 'text-orange-700',
    gold: 'text-amber-700',
  };

  return (
    <div className={cn('rounded-xl border p-4', colors[color])}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', valueColors[color])}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

// ── Section ─────────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: 'arrive' | 'depart' | 'house';
  children: React.ReactNode;
}) {
  const icons = {
    arrive: '↓',
    depart: '↑',
    house: '●',
  };
  const colors = {
    arrive: 'text-green-600',
    depart: 'text-orange-600',
    house: 'text-blue-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className={cn('text-lg font-bold', colors[icon])}>{icons[icon]}</span>
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Arrival Row ─────────────────────────────────────────────────────────────

function ArrivalRow({
  booking,
  onConfirm,
  onCheckin,
  isConfirming,
  isCheckingIn,
}: {
  booking: TodaySummaryBooking;
  onConfirm: () => void;
  onCheckin: () => void;
  isConfirming: boolean;
  isCheckingIn: boolean;
}) {
  const balance = booking.totalAmount - booking.paidAmount;

  return (
    <div className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link href={`/bookings/${booking.id}`} className="font-medium text-gray-900 hover:text-blue-600 truncate">
            {booking.guestName || 'Без имени'}
          </Link>
          <StatusBadge status={booking.status as BookingStatus} />
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
          <span>{booking.roomName || `#${booking.roomId}`}</span>
          <span>·</span>
          <span>{booking.nights} ноч.</span>
          <span>·</span>
          <span>{formatMoney(booking.totalAmount)}</span>
          {balance > 0 && (
            <>
              <span>·</span>
              <span className="text-orange-600 font-medium">долг {formatMoney(balance)}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {booking.status === 'new' && (
          <Button size="sm" variant="outline" onClick={onConfirm} loading={isConfirming}>
            Подтвердить
          </Button>
        )}
        <Button size="sm" variant="primary" onClick={onCheckin} loading={isCheckingIn}>
          Заселить
        </Button>
      </div>
    </div>
  );
}

// ── Departure Row ───────────────────────────────────────────────────────────

function DepartureRow({
  booking,
  onCheckout,
  isCheckingOut,
}: {
  booking: TodaySummaryBooking;
  onCheckout: () => void;
  isCheckingOut: boolean;
}) {
  const balance = booking.totalAmount - booking.paidAmount;
  const isPaid = balance <= 0;

  return (
    <div className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link href={`/bookings/${booking.id}`} className="font-medium text-gray-900 hover:text-blue-600 truncate">
            {booking.guestName || 'Без имени'}
          </Link>
          {isPaid ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Оплачено</span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
              Долг {formatMoney(balance)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
          <span>{booking.roomName || `#${booking.roomId}`}</span>
          <span>·</span>
          <span>{booking.nights} ноч.</span>
          <span>·</span>
          <span>{formatMoney(booking.totalAmount)}</span>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link href={`/bookings/${booking.id}`}>
          <Button size="sm" variant="outline">Детали</Button>
        </Link>
        <Button size="sm" variant="primary" onClick={onCheckout} loading={isCheckingOut}>
          Выселить
        </Button>
      </div>
    </div>
  );
}

// ── In-House Row ────────────────────────────────────────────────────────────

function InHouseRow({ booking }: { booking: TodaySummaryBooking }) {
  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors block"
    >
      <div className="flex-1 min-w-0">
        <span className="font-medium text-gray-900">{booking.guestName || 'Без имени'}</span>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
          <span>{booking.roomName || `#${booking.roomId}`}</span>
          <span>·</span>
          <span>Выезд: {new Date(booking.checkOut).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
          <span>·</span>
          <span>{booking.adults} гост.{booking.children > 0 ? ` + ${booking.children} дет.` : ''}</span>
        </div>
      </div>
      <span className="text-sm text-gray-400 shrink-0">→</span>
    </Link>
  );
}
