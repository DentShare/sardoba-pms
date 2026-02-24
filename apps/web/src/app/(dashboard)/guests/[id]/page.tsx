'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Table, type Column } from '@/components/ui/Table';
import { PageSpinner } from '@/components/ui/Spinner';
import { useGuest, useUpdateGuest } from '@/lib/hooks/use-guests';
import { useBookings } from '@/lib/hooks/use-bookings';
import { formatMoney } from '@/lib/utils/money';
import { formatDate } from '@/lib/utils/dates';
import type { Booking } from '@sardoba/shared';

export default function GuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const { data: guest, isLoading } = useGuest(id);
  const { data: bookingsData } = useBookings({ guestId: id, perPage: 50 });
  const updateGuest = useUpdateGuest();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nationality, setNationality] = useState('');
  const [isVip, setIsVip] = useState(false);

  const startEditing = useCallback(() => {
    if (!guest) return;
    setFirstName(guest.firstName);
    setLastName(guest.lastName);
    setPhone(guest.phone);
    setEmail(guest.email || '');
    setNationality(guest.nationality || '');
    setIsVip(guest.isVip);
    setIsEditing(true);
  }, [guest]);

  const handleSave = useCallback(async () => {
    if (!guest) return;
    try {
      await updateGuest.mutateAsync({
        id: guest.id,
        dto: {
          first_name: firstName,
          last_name: lastName,
          phone,
          email: email || undefined,
          nationality: nationality || undefined,
          is_vip: isVip,
        },
      });
      setIsEditing(false);
    } catch {
      // Handled by mutation
    }
  }, [guest, firstName, lastName, phone, email, nationality, isVip, updateGuest]);

  const bookings = bookingsData?.data ?? [];

  const bookingColumns: Column<Booking>[] = [
    {
      key: 'number',
      header: 'Номер',
      render: (b) => (
        <span className="font-mono text-sm text-gray-700">{b.bookingNumber}</span>
      ),
    },
    {
      key: 'checkIn',
      header: 'Заезд',
      render: (b) => <span className="text-gray-700">{formatDate(b.checkIn)}</span>,
    },
    {
      key: 'checkOut',
      header: 'Выезд',
      render: (b) => <span className="text-gray-700">{formatDate(b.checkOut)}</span>,
      hideOnMobile: true,
    },
    {
      key: 'room',
      header: 'Комната',
      render: (b) => <span className="text-gray-600">#{b.roomId}</span>,
      hideOnMobile: true,
    },
    {
      key: 'amount',
      header: 'Сумма',
      render: (b) => (
        <span className="font-medium">{formatMoney(b.totalAmount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      render: (b) => <StatusBadge status={b.status} size="sm" />,
    },
  ];

  if (isLoading) return <PageSpinner />;

  if (!guest) {
    return (
      <div className="p-4 lg:p-6">
        <div className="text-center py-20 text-gray-500">
          Гость не найден
        </div>
      </div>
    );
  }

  const avgStay =
    bookings.length > 0
      ? Math.round(bookings.reduce((sum, b) => sum + b.nights, 0) / bookings.length)
      : 0;

  const lastVisit =
    bookings.length > 0
      ? bookings.sort(
          (a, b) =>
            new Date(b.checkOut).getTime() - new Date(a.checkOut).getTime(),
        )[0]?.checkOut
      : null;

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title={`${guest.firstName} ${guest.lastName}`}
        actions={
          <div className="flex items-center gap-2">
            {guest.isVip && <Badge variant="gold">VIP</Badge>}
            {!isEditing ? (
              <Button variant="outline" onClick={startEditing}>
                Редактировать
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Отмена
                </Button>
                <Button onClick={handleSave} loading={updateGuest.isPending}>
                  Сохранить
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guest Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Информация
          </h2>

          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Имя"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <Input
                  label="Фамилия"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <Input
                label="Телефон"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Select
                label="Национальность"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                options={[
                  { value: '', label: 'Не указана' },
                  { value: 'UZ', label: 'Узбекистан' },
                  { value: 'RU', label: 'Россия' },
                  { value: 'KZ', label: 'Казахстан' },
                  { value: 'DE', label: 'Германия' },
                  { value: 'FR', label: 'Франция' },
                  { value: 'US', label: 'США' },
                  { value: 'OTHER', label: 'Другое' },
                ]}
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVip}
                  onChange={(e) => setIsVip(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-sardoba-gold focus:ring-sardoba-gold"
                />
                <span className="text-sm font-medium text-gray-700">VIP-статус</span>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Телефон</span>
                <span className="font-medium text-gray-900">{guest.phone}</span>
              </div>
              {guest.email && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-gray-900">{guest.email}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Национальность</span>
                <span className="font-medium text-gray-900">
                  {guest.nationality || '---'}
                </span>
              </div>
              {guest.documentType && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Документ</span>
                  <span className="font-medium text-gray-900">
                    {guest.documentType}: {guest.documentNumber}
                  </span>
                </div>
              )}
              {guest.dateOfBirth && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Дата рождения</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(guest.dateOfBirth)}
                  </span>
                </div>
              )}
              {guest.notes && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Заметки</div>
                  <p className="text-sm text-gray-700">{guest.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats & Bookings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-sardoba-blue">{guest.visitCount}</div>
              <div className="text-xs text-gray-500 mt-1">Визитов</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-sardoba-gold-dark">
                {formatMoney(guest.totalRevenue)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Выручка</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{avgStay}</div>
              <div className="text-xs text-gray-500 mt-1">Ср. ночей</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-sm font-bold text-gray-900">
                {lastVisit ? formatDate(lastVisit) : '---'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Последний визит</div>
            </div>
          </div>

          {/* Booking history table */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              История бронирований
            </h2>
            <Table<Booking>
              columns={bookingColumns}
              data={bookings}
              rowKey={(b) => b.id}
              onRowClick={(b) => router.push(`/bookings/${b.id}`)}
              emptyMessage="Нет бронирований"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
