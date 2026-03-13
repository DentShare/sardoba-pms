'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePropertyId } from '@/lib/hooks/use-property-id';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  getProperty,
  updateProperty,
  uploadPropertyPhoto,
  deletePropertyPhoto,
  type Property,
  type UpdatePropertyDto,
} from '@/lib/api/property';

/* ── Constants ──────────────────────────────────────────────────────────── */

const CURRENCY_OPTIONS = [
  { value: 'UZS', label: 'UZS — Узбекский сум' },
  { value: 'USD', label: 'USD — Доллар США' },
  { value: 'EUR', label: 'EUR — Евро' },
  { value: 'RUB', label: 'RUB — Российский рубль' },
];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Tashkent', label: 'Asia/Tashkent (UTC+5)' },
  { value: 'Asia/Samarkand', label: 'Asia/Samarkand (UTC+5)' },
  { value: 'Asia/Almaty', label: 'Asia/Almaty (UTC+6)' },
  { value: 'Europe/Moscow', label: 'Europe/Moscow (UTC+3)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC+4)' },
  { value: 'Asia/Istanbul', label: 'Europe/Istanbul (UTC+3)' },
];

/* ── Icons ───────────────────────────────────────────────────────────────── */

function IconBuilding({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" /><path d="M16 6h.01" />
      <path d="M8 10h.01" /><path d="M16 10h.01" />
      <path d="M8 14h.01" /><path d="M16 14h.01" />
    </svg>
  );
}

function IconClock({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconGlobe({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconSave({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function IconUpload({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconImage({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

/* ── Form state interface ────────────────────────────────────────────────── */

interface FormState {
  name: string;
  slug: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  check_in_time: string;
  check_out_time: string;
  currency: string;
  timezone: string;
  cover_photo: string;
  booking_enabled: boolean;
  google_review_url: string;
  tripadvisor_url: string;
  booking_com_review_url: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  city: '',
  address: '',
  phone: '',
  email: '',
  description: '',
  check_in_time: '14:00',
  check_out_time: '12:00',
  currency: 'UZS',
  timezone: 'Asia/Tashkent',
  cover_photo: '',
  booking_enabled: false,
  google_review_url: '',
  tripadvisor_url: '',
  booking_com_review_url: '',
};

/* ═══════════════════════════════════════════════════════════════════════════
   GENERAL SETTINGS PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function SettingsGeneralPage() {
  const propertyId = usePropertyId() ?? 1;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  /* ── Load property ─────────────────────────────────────────────────────── */
  const loadProperty = useCallback(async () => {
    try {
      const property = await getProperty(propertyId);
      setForm({
        name: property.name || '',
        slug: property.slug || '',
        city: property.city || '',
        address: property.address || '',
        phone: property.phone || '',
        email: property.email || '',
        description: property.description || '',
        check_in_time: property.check_in_time || '14:00',
        check_out_time: property.check_out_time || '12:00',
        currency: property.currency || 'UZS',
        timezone: property.timezone || 'Asia/Tashkent',
        cover_photo: property.cover_photo || '',
        booking_enabled: property.booking_enabled ?? false,
        google_review_url: property.google_review_url || '',
        tripadvisor_url: property.tripadvisor_url || '',
        booking_com_review_url: property.booking_com_review_url || '',
      });
    } catch {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (propertyId) loadProperty();
  }, [loadProperty, propertyId]);

  /* ── Update form field ─────────────────────────────────────────────────── */
  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /* ── Cover photo upload ──────────────────────────────────────────────── */
  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadPropertyPhoto(propertyId, file, 'cover');
      setForm((prev) => ({ ...prev, cover_photo: url }));
      toast.success('Фото загружено');
    } catch {
      toast.error('Ошибка загрузки фото');
    }
    if (coverInputRef.current) coverInputRef.current.value = '';
  }

  async function handleCoverRemove() {
    if (!form.cover_photo) return;
    try {
      await deletePropertyPhoto(propertyId, form.cover_photo, 'cover');
    } catch { /* silent */ }
    setForm((prev) => ({ ...prev, cover_photo: '' }));
  }

  /* ── Save ───────────────────────────────────────────────────────────────── */
  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Укажите название объекта');
      return;
    }

    setSaving(true);
    try {
      const dto: UpdatePropertyDto = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        description: form.description.trim() || null,
        check_in_time: form.check_in_time || null,
        check_out_time: form.check_out_time || null,
        currency: form.currency,
        timezone: form.timezone,
        cover_photo: form.cover_photo.trim() || null,
        booking_enabled: form.booking_enabled,
        google_review_url: form.google_review_url.trim() || null,
        tripadvisor_url: form.tripadvisor_url.trim() || null,
        booking_com_review_url: form.booking_com_review_url.trim() || null,
      };

      await updateProperty(propertyId, dto);
      toast.success('Настройки сохранены');
    } catch {
      toast.error('Ошибка сохранения. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader title="Основные настройки" subtitle="Загрузка..." />
        <div className="animate-pulse space-y-4 mt-8">
          <div className="h-12 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-36 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Основные настройки"
        subtitle="Информация об объекте размещения"
      />

      <div className="space-y-6 mt-8">
        {/* ── Property info ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-sardoba-dark mb-4 flex items-center gap-2">
            <IconBuilding className="text-gray-400" />
            Информация об объекте
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Название"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Гостиница Sardoba"
                required
              />
              <Input
                label="Slug (URL)"
                value={form.slug}
                onChange={(e) =>
                  updateField(
                    'slug',
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                  )
                }
                placeholder="sardoba-hotel"
                hint="Латинские буквы, цифры и дефис"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Город"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="Ташкент"
              />
              <Input
                label="Адрес"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="ул. Амира Темура, 12"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Телефон"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+998 90 123 45 67"
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="info@hotel.uz"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Расскажите о вашем объекте: расположение, особенности, удобства..."
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold resize-y"
              />
            </div>
          </div>
        </div>

        {/* ── Check-in / Check-out ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-sardoba-dark mb-4 flex items-center gap-2">
            <IconClock className="text-gray-400" />
            Время заезда / выезда
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Заезд (Check-in)"
              type="time"
              value={form.check_in_time}
              onChange={(e) => updateField('check_in_time', e.target.value)}
            />
            <Input
              label="Выезд (Check-out)"
              type="time"
              value={form.check_out_time}
              onChange={(e) => updateField('check_out_time', e.target.value)}
            />
          </div>

          <p className="mt-2 text-xs text-gray-400">
            Стандартное время для информирования гостей
          </p>
        </div>

        {/* ── Regional settings ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-sardoba-dark mb-4 flex items-center gap-2">
            <IconGlobe className="text-gray-400" />
            Региональные настройки
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Валюта"
              value={form.currency}
              onChange={(e) => updateField('currency', e.target.value)}
              options={CURRENCY_OPTIONS}
            />
            <Select
              label="Часовой пояс"
              value={form.timezone}
              onChange={(e) => updateField('timezone', e.target.value)}
              options={TIMEZONE_OPTIONS}
            />
          </div>
        </div>

        {/* ── Cover photo ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-sardoba-dark mb-4 flex items-center gap-2">
            <IconImage className="text-gray-400" />
            Обложка
          </h3>

          {form.cover_photo ? (
            <div className="relative group rounded-xl overflow-hidden aspect-[21/9]">
              <img
                src={form.cover_photo}
                alt="Обложка"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={() => coverInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Заменить
                  </button>
                  <button
                    onClick={handleCoverRemove}
                    className="px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => coverInputRef.current?.click()}
              className="w-full aspect-[21/9] rounded-xl border-2 border-dashed border-gray-300 hover:border-sardoba-gold flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-sardoba-gold transition-colors"
            >
              <IconUpload />
              <span className="text-sm">Загрузить обложку</span>
              <span className="text-xs text-gray-300">Рекомендуемый размер: 1920x820</span>
            </button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverUpload}
            className="hidden"
          />
        </div>

        {/* ── Booking toggle ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sardoba-dark">
                Онлайн-бронирование
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {form.booking_enabled
                  ? 'Публичная страница бронирования активна'
                  : 'Публичная страница бронирования отключена'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateField('booking_enabled', !form.booking_enabled)}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors duration-200',
                form.booking_enabled ? 'bg-green-500' : 'bg-gray-300',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                  form.booking_enabled ? 'translate-x-6' : 'translate-x-0.5',
                )}
              />
            </button>
          </div>
        </div>

        {/* ── Review URLs ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ссылки на отзывы</h3>
          <p className="text-sm text-gray-500 mb-4">Ссылки будут отправлены гостям после выезда для сбора отзывов</p>
          <div className="space-y-4">
            <Input
              label="Google Reviews URL"
              value={form.google_review_url}
              onChange={(e) => updateField('google_review_url', e.target.value)}
              placeholder="https://g.page/..."
            />
            <Input
              label="TripAdvisor URL"
              value={form.tripadvisor_url}
              onChange={(e) => updateField('tripadvisor_url', e.target.value)}
              placeholder="https://tripadvisor.com/..."
            />
            <Input
              label="Booking.com Reviews URL"
              value={form.booking_com_review_url}
              onChange={(e) => updateField('booking_com_review_url', e.target.value)}
              placeholder="https://booking.com/..."
            />
          </div>
        </div>

        {/* ── Save button ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 pb-8">
          <Button
            onClick={handleSave}
            loading={saving}
            size="lg"
            icon={<IconSave />}
          >
            Сохранить настройки
          </Button>
        </div>
      </div>
    </div>
  );
}
