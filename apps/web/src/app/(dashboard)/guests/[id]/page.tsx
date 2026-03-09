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
import { Modal } from '@/components/ui/Modal';
import { Table, type Column } from '@/components/ui/Table';
import { PageSpinner } from '@/components/ui/Spinner';
import {
  useGuest,
  useUpdateGuest,
  useAddGuestTags,
  useRemoveGuestTags,
  useBlacklistGuest,
  useUnblacklistGuest,
  useGuestTips,
  usePassportOcr,
} from '@/lib/hooks/use-guests';
import { useBookings } from '@/lib/hooks/use-bookings';
import { uploadGuestDocument } from '@/lib/api/guests';
import type { PassportOcrResult } from '@/lib/api/guests';
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
  const addTagsMut = useAddGuestTags();
  const removeTagsMut = useRemoveGuestTags();
  const blacklistMut = useBlacklistGuest();
  const unblacklistMut = useUnblacklistGuest();
  const { data: tipsData, isLoading: tipsLoading } = useGuestTips(id);
  const ocrMut = usePassportOcr();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nationality, setNationality] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [isVip, setIsVip] = useState(false);
  const [documentPhotos, setDocumentPhotos] = useState<string[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docPhotoRef = useRef<HTMLInputElement>(null);

  // Tags state
  const [newTag, setNewTag] = useState('');

  // Blacklist state
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');

  // Passport OCR state
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrResult, setOcrResult] = useState<PassportOcrResult | null>(null);
  const ocrFileRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback(() => {
    if (!guest) return;
    setFirstName(guest.firstName);
    setLastName(guest.lastName);
    setPhone(guest.phone);
    setEmail(guest.email || '');
    setNationality(guest.nationality || '');
    setDateOfBirth(guest.dateOfBirth || '');
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
          date_of_birth: dateOfBirth || undefined,
          is_vip: isVip,
        },
      });
      setIsEditing(false);
    } catch {
      // Handled by mutation
    }
  }, [guest, firstName, lastName, phone, email, nationality, dateOfBirth, isVip, updateGuest]);

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

  // Tags handlers
  const handleAddTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed || !guest) return;
      if (guest.tags?.includes(trimmed)) {
        toast.error('Тег уже добавлен');
        return;
      }
      addTagsMut.mutate({ guestId: guest.id, tags: [trimmed] });
      setNewTag('');
    },
    [guest, addTagsMut],
  );

  const handleRemoveTag = useCallback(
    (tag: string) => {
      if (!guest) return;
      removeTagsMut.mutate({ guestId: guest.id, tags: [tag] });
    },
    [guest, removeTagsMut],
  );

  // Blacklist handlers
  const handleBlacklist = useCallback(async () => {
    if (!guest || !blacklistReason.trim()) {
      toast.error('Укажите причину');
      return;
    }
    try {
      await blacklistMut.mutateAsync({ guestId: guest.id, reason: blacklistReason.trim() });
      setShowBlacklistModal(false);
      setBlacklistReason('');
    } catch {
      // Handled by mutation
    }
  }, [guest, blacklistReason, blacklistMut]);

  const handleUnblacklist = useCallback(async () => {
    if (!guest) return;
    try {
      await unblacklistMut.mutateAsync(guest.id);
    } catch {
      // Handled by mutation
    }
  }, [guest, unblacklistMut]);

  // Passport OCR handler
  const handleOcrFile = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      try {
        const result = await ocrMut.mutateAsync(files[0]);
        setOcrResult(result);
        setShowOcrModal(true);
      } catch {
        // Handled by mutation
      }
      if (ocrFileRef.current) ocrFileRef.current.value = '';
    },
    [ocrMut],
  );

  const handleFillOcrData = useCallback(() => {
    if (!ocrResult) return;
    const d = ocrResult.data;
    if (d.first_name) setFirstName(d.first_name);
    if (d.last_name) setLastName(d.last_name);
    if (d.nationality) setNationality(d.nationality);
    if (d.birth_date) setDateOfBirth(d.birth_date);
    if (!isEditing) {
      // Switch to edit mode so user can review and save
      startEditing();
      // Override with OCR data after startEditing resets from guest
      setTimeout(() => {
        if (d.first_name) setFirstName(d.first_name);
        if (d.last_name) setLastName(d.last_name);
        if (d.nationality) setNationality(d.nationality);
        if (d.birth_date) setDateOfBirth(d.birth_date);
      }, 0);
    }
    setShowOcrModal(false);
    toast.success('Данные заполнены из паспорта');
  }, [ocrResult, isEditing, startEditing]);

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

  const tips = tipsData?.tips ?? [];

  const tipStyles: Record<string, string> = {
    upsell: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    preference: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-red-50 border-red-200 text-red-800',
    general: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  const tipIcons: Record<string, JSX.Element> = {
    upsell: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" />
      </svg>
    ),
    preference: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    warning: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
      </svg>
    ),
    general: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
      </svg>
    ),
  };

  const QUICK_TAGS = ['VIP', 'постоянный', 'корпоративный'];

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title={`${guest.firstName} ${guest.lastName}`}
        actions={
          <div className="flex items-center gap-2">
            {guest.isVip && <Badge variant="gold">VIP</Badge>}
            {guest.isBlacklisted && (
              <Badge variant="danger">В чёрном списке</Badge>
            )}
            {guest.isBlacklisted ? (
              <Button
                variant="outline"
                onClick={handleUnblacklist}
                loading={unblacklistMut.isPending}
              >
                Убрать из ЧС
              </Button>
            ) : (
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowBlacklistModal(true)}
              >
                В чёрный список
              </Button>
            )}
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
              <Input
                label="Дата рождения"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
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

          {/* Tags section */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              Теги
            </h3>
            {guest.tags && guest.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {guest.tags.map((tag) => (
                  <Badge key={tag} variant="info" size="sm" className="gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-0.5 hover:text-blue-900 transition-colors"
                      aria-label={`Удалить тег ${tag}`}
                    >
                      &times;
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Новый тег..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(newTag);
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddTag(newTag)}
                disabled={!newTag.trim() || addTagsMut.isPending}
              >
                Добавить
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.filter((t) => !guest.tags?.includes(t)).map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleAddTag(tag)}
                  className="px-2 py-0.5 text-xs rounded-full border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

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
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => docPhotoRef.current?.click()}
                disabled={uploadingDoc}
                className="flex-1 flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 cursor-pointer hover:border-sardoba-gold hover:text-sardoba-gold-dark transition-colors disabled:opacity-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {uploadingDoc ? 'Загрузка...' : 'Загрузить фото'}
              </button>
              <button
                onClick={() => ocrFileRef.current?.click()}
                disabled={ocrMut.isPending}
                className="flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-blue-200 rounded-lg text-sm text-blue-500 cursor-pointer hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
                </svg>
                {ocrMut.isPending ? 'Распознавание...' : 'Сканировать паспорт'}
              </button>
            </div>
            <input
              ref={docPhotoRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleDocPhotoUpload(e.target.files)}
            />
            <input
              ref={ocrFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleOcrFile(e.target.files)}
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

          {/* AI Tips card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
                <path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
              </svg>
              AI-рекомендации
            </h2>
            {tipsLoading ? (
              <div className="flex items-center justify-center py-6">
                <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : tips.length > 0 ? (
              <div className="space-y-2">
                {tips.map((tip, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-start gap-2 p-3 rounded-lg border text-sm',
                      tipStyles[tip.type] || tipStyles.general,
                    )}
                  >
                    <span className="mt-0.5 shrink-0">
                      {tipIcons[tip.type] || tipIcons.general}
                    </span>
                    <span>{tip.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Нет рекомендаций
              </p>
            )}
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

      {/* Blacklist Modal */}
      <Modal
        open={showBlacklistModal}
        onClose={() => setShowBlacklistModal(false)}
        title="Добавить в чёрный список"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowBlacklistModal(false)}>
              Отмена
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleBlacklist}
              loading={blacklistMut.isPending}
            >
              Подтвердить
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Гость <strong>{guest.firstName} {guest.lastName}</strong> будет добавлен в чёрный список.
            Укажите причину:
          </p>
          <Input
            label="Причина"
            value={blacklistReason}
            onChange={(e) => setBlacklistReason(e.target.value)}
            placeholder="Причина добавления в ЧС..."
            required
          />
        </div>
      </Modal>

      {/* Passport OCR Result Modal */}
      <Modal
        open={showOcrModal}
        onClose={() => setShowOcrModal(false)}
        title="Результат распознавания паспорта"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowOcrModal(false)}>
              Закрыть
            </Button>
            <Button onClick={handleFillOcrData}>
              Заполнить данные
            </Button>
          </>
        }
      >
        {ocrResult && (
          <div className="space-y-3">
            <div className="text-xs text-gray-500 mb-2">
              Точность: {Math.round(ocrResult.confidence * 100)}%
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {ocrResult.data.first_name && (
                <div>
                  <span className="text-gray-500">Имя:</span>{' '}
                  <span className="font-medium text-gray-900">{ocrResult.data.first_name}</span>
                </div>
              )}
              {ocrResult.data.last_name && (
                <div>
                  <span className="text-gray-500">Фамилия:</span>{' '}
                  <span className="font-medium text-gray-900">{ocrResult.data.last_name}</span>
                </div>
              )}
              {ocrResult.data.middle_name && (
                <div>
                  <span className="text-gray-500">Отчество:</span>{' '}
                  <span className="font-medium text-gray-900">{ocrResult.data.middle_name}</span>
                </div>
              )}
              {ocrResult.data.birth_date && (
                <div>
                  <span className="text-gray-500">Дата рождения:</span>{' '}
                  <span className="font-medium text-gray-900">{ocrResult.data.birth_date}</span>
                </div>
              )}
              {ocrResult.data.passport_number && (
                <div>
                  <span className="text-gray-500">Номер паспорта:</span>{' '}
                  <span className="font-medium text-gray-900">{ocrResult.data.passport_number}</span>
                </div>
              )}
              {ocrResult.data.nationality && (
                <div>
                  <span className="text-gray-500">Гражданство:</span>{' '}
                  <span className="font-medium text-gray-900">{ocrResult.data.nationality}</span>
                </div>
              )}
              {ocrResult.data.expiry_date && (
                <div>
                  <span className="text-gray-500">Действ. до:</span>{' '}
                  <span className="font-medium text-gray-900">{ocrResult.data.expiry_date}</span>
                </div>
              )}
              {ocrResult.data.gender && (
                <div>
                  <span className="text-gray-500">Пол:</span>{' '}
                  <span className="font-medium text-gray-900">{ocrResult.data.gender}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
