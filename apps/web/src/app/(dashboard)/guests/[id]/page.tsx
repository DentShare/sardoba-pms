'use client';

import { useState, useCallback, useRef } from 'react';
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
import { uploadGuestDocument } from '@/lib/api/guests';
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
  const [documentPhotos, setDocumentPhotos] = useState<string[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docPhotoRef = useRef<HTMLInputElement>(null);

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

  const handleDocPhotoUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !guest) return;
    setUploadingDoc(true);
    for (const file of Array.from(files)) {
      try {
        const { url } = await uploadGuestDocument(guest.id, file);
        setDocumentPhotos((prev) => [...prev, url]);
      } catch {
        const localUrl = URL.createObjectURL(file);
        setDocumentPhotos((prev) => [...prev, localUrl]);
      }
    }
    setUploadingDoc(false);
    toast.success('Документ загружен');
    if (docPhotoRef.current) docPhotoRef.current.value = '';
  }, [guest]);

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

          {/* Document photos */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Документы / Паспорт
            </h3>
            {documentPhotos.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {documentPhotos.map((url, idx) => (
                  <div key={idx} className="relative group aspect-[3/2] rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setDocumentPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => docPhotoRef.current?.click()}
              disabled={uploadingDoc}
              className="w-full flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 cursor-pointer hover:border-sardoba-gold hover:text-sardoba-gold-dark transition-colors disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {uploadingDoc ? 'Загрузка...' : 'Загрузить фото документа'}
            </button>
            <input
              ref={docPhotoRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleDocPhotoUpload(e.target.files)}
            />
          </div>
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
