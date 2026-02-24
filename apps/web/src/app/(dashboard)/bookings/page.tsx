'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, type Column } from '@/components/ui/Table';
import { StatusBadge, SourceBadge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { BookingForm } from '@/components/forms/BookingForm';
import { useBookings } from '@/lib/hooks/use-bookings';
import { formatMoney } from '@/lib/utils/money';
import { formatDate } from '@/lib/utils/dates';
import type { Booking, BookingStatus } from '@sardoba/shared';

const PROPERTY_ID = 1;

const STATUS_TABS: { value: BookingStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'new', label: 'Новые' },
  { value: 'confirmed', label: 'Подтверждённые' },
  { value: 'checked_in', label: 'Заехали' },
  { value: 'checked_out', label: 'Выехали' },
  { value: 'cancelled', label: 'Отменённые' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'Все источники' },
  { value: 'direct', label: 'Прямое' },
  { value: 'booking_com', label: 'Booking.com' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'expedia', label: 'Expedia' },
  { value: 'phone', label: 'Телефон' },
  { value: 'other', label: 'Другое' },
];

export default function BookingsPage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<BookingStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      propertyId: PROPERTY_ID,
      status: activeTab === 'all' ? undefined : activeTab,
      source: source || undefined,
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      perPage: 20,
    }),
    [activeTab, source, search, dateFrom, dateTo, page],
  );

  const { data, isLoading } = useBookings(filters);

  const handleRowClick = useCallback(
    (booking: Booking) => {
      router.push(`/bookings/${booking.id}`);
    },
    [router],
  );

  const handleTabChange = useCallback((tab: BookingStatus | 'all') => {
    setActiveTab(tab);
    setPage(1);
  }, []);

  const columns: Column<Booking>[] = useMemo(
    () => [
      {
        key: 'number',
        header: 'Номер',
        render: (b) => (
          <span className="font-mono text-sm text-gray-700">{b.bookingNumber}</span>
        ),
      },
      {
        key: 'guest',
        header: 'Гость',
        render: (b) => (
          <span className="font-medium text-gray-900">Гость #{b.guestId}</span>
        ),
      },
      {
        key: 'room',
        header: 'Комната',
        render: (b) => (
          <span className="text-gray-600">#{b.roomId}</span>
        ),
        hideOnMobile: true,
      },
      {
        key: 'checkIn',
        header: 'Заезд',
        render: (b) => (
          <span className="text-gray-700">{formatDate(b.checkIn)}</span>
        ),
      },
      {
        key: 'checkOut',
        header: 'Выезд',
        render: (b) => (
          <span className="text-gray-700">{formatDate(b.checkOut)}</span>
        ),
        hideOnMobile: true,
      },
      {
        key: 'amount',
        header: 'Сумма',
        render: (b) => (
          <span className="font-medium text-gray-900">
            {formatMoney(b.totalAmount)}
          </span>
        ),
        hideOnMobile: true,
      },
      {
        key: 'status',
        header: 'Статус',
        render: (b) => <StatusBadge status={b.status} size="sm" />,
      },
      {
        key: 'source',
        header: 'Источник',
        render: (b) => <SourceBadge source={b.source} size="sm" />,
        hideOnMobile: true,
      },
    ],
    [],
  );

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Бронирования"
        actions={
          <Button
            onClick={() => setShowForm(true)}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" /><path d="M5 12h14" />
              </svg>
            }
          >
            Новая бронь
          </Button>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              activeTab === tab.value
                ? 'bg-sardoba-blue text-white'
                : 'text-gray-600 hover:bg-gray-100',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Поиск по гостю или номеру бронирования..."
            leftIcon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            }
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(1);
            }}
            options={SOURCE_OPTIONS}
          />
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            placeholder="С"
            className="w-36"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            placeholder="По"
            className="w-36"
          />
        </div>
      </div>

      {/* Table */}
      <Table<Booking>
        columns={columns}
        data={data?.data ?? []}
        rowKey={(b) => b.id}
        onRowClick={handleRowClick}
        isLoading={isLoading}
        emptyMessage="Нет бронирований"
      />

      {/* Pagination */}
      {data?.meta && (
        <div className="mt-4">
          <Pagination meta={data.meta} onPageChange={setPage} />
        </div>
      )}

      {/* Booking Form Modal */}
      <BookingForm
        open={showForm}
        onClose={() => setShowForm(false)}
        propertyId={PROPERTY_ID}
      />
    </div>
  );
}
