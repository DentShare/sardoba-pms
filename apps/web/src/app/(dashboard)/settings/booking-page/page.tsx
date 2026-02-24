'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/layout/PageHeader';

/* ── Types ───────────────────────────────────────────────────────────────── */

interface BookingPageConfig {
  booking_enabled: boolean;
  slug: string;
  description: string | null;
  cover_photo: string | null;
  photos: string[];
}

/* ── Icons ───────────────────────────────────────────────────────────────── */

function IconGlobe({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconLink({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function IconUpload({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconExternalLink({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconRefresh({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function IconTrash({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconImage({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconCopy({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[а-яА-ЯёЁ]/g, (ch) => {
      const map: Record<string, string> = {
        а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo',
        ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
        н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
        ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
        ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
      };
      return map[ch.toLowerCase()] || '';
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const BASE_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/book/`
  : 'https://app.sardoba.uz/book/';

/* ═══════════════════════════════════════════════════════════════════════════
   BOOKING PAGE SETTINGS
   ═══════════════════════════════════════════════════════════════════════════ */

export default function BookingPageSettings() {
  const [config, setConfig] = useState<BookingPageConfig>({
    booking_enabled: false,
    slug: '',
    description: null,
    cover_photo: null,
    photos: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [slugError, setSlugError] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [copied, setCopied] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);

  /* ── Load config ───────────────────────────────────────────────────────── */
  const loadConfig = useCallback(async () => {
    try {
      const { data } = await api.get('/properties/booking-page');
      setConfig({
        booking_enabled: data.booking_enabled ?? false,
        slug: data.slug || '',
        description: data.description || null,
        cover_photo: data.cover_photo || null,
        photos: data.photos || [],
      });
      setHotelName(data.property_name || '');
    } catch {
      // Property might not have booking config yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  /* ── Save config ───────────────────────────────────────────────────────── */
  async function handleSave() {
    if (!config.slug.trim()) {
      setSlugError('Slug не может быть пустым');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(config.slug)) {
      setSlugError('Только латинские буквы, цифры и дефис');
      return;
    }

    setSaving(true);
    setSlugError('');
    try {
      await api.patch('/properties/booking-page', {
        booking_enabled: config.booking_enabled,
        slug: config.slug,
        description: config.description,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      if (err?.response?.data?.message?.includes('slug')) {
        setSlugError('Этот slug уже занят. Выберите другой.');
      }
    } finally {
      setSaving(false);
    }
  }

  /* ── Auto-generate slug ────────────────────────────────────────────────── */
  function generateSlug() {
    if (hotelName) {
      setConfig((prev) => ({ ...prev, slug: slugify(hotelName) }));
      setSlugError('');
    }
  }

  /* ── Upload cover photo ────────────────────────────────────────────────── */
  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'cover');

    try {
      const { data } = await api.post('/properties/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setConfig((prev) => ({ ...prev, cover_photo: data.url }));
    } catch {
      // silent
    }
    // Reset input
    if (coverInputRef.current) coverInputRef.current.value = '';
  }

  /* ── Upload gallery photos ─────────────────────────────────────────────── */
  async function handlePhotosUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'gallery');

      try {
        const { data } = await api.post('/properties/photos', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setConfig((prev) => ({ ...prev, photos: [...prev.photos, data.url] }));
      } catch {
        // silent
      }
    }
    if (photosInputRef.current) photosInputRef.current.value = '';
  }

  /* ── Remove photo ──────────────────────────────────────────────────────── */
  async function removePhoto(url: string, type: 'cover' | 'gallery') {
    try {
      await api.delete('/properties/photos', { data: { url, type } });
      if (type === 'cover') {
        setConfig((prev) => ({ ...prev, cover_photo: null }));
      } else {
        setConfig((prev) => ({
          ...prev,
          photos: prev.photos.filter((p) => p !== url),
        }));
      }
    } catch {
      // Optimistic removal anyway
      if (type === 'cover') {
        setConfig((prev) => ({ ...prev, cover_photo: null }));
      } else {
        setConfig((prev) => ({
          ...prev,
          photos: prev.photos.filter((p) => p !== url),
        }));
      }
    }
  }

  /* ── Copy URL ──────────────────────────────────────────────────────────── */
  function copyUrl() {
    navigator.clipboard.writeText(`${BASE_URL}${config.slug}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader title="Страница бронирования" subtitle="Загрузка..." />
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
        title="Страница бронирования"
        subtitle="Настройте публичную страницу вашего отеля для приёма бронирований"
      />

      <div className="space-y-6 mt-8">
        {/* ── Enable/Disable ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                config.booking_enabled ? 'bg-green-100' : 'bg-gray-100',
              )}>
                <IconGlobe className={config.booking_enabled ? 'text-green-600' : 'text-gray-400'} />
              </div>
              <div>
                <h3 className="font-semibold text-sardoba-dark">Онлайн-бронирование</h3>
                <p className="text-sm text-gray-500">
                  {config.booking_enabled
                    ? 'Страница активна и доступна по ссылке'
                    : 'Страница отключена и недоступна для гостей'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setConfig((prev) => ({ ...prev, booking_enabled: !prev.booking_enabled }))}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors duration-200',
                config.booking_enabled ? 'bg-green-500' : 'bg-gray-300',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                  config.booking_enabled ? 'translate-x-6' : 'translate-x-0.5',
                )}
              />
            </button>
          </div>
        </div>

        {/* ── Slug editor ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-sardoba-dark mb-4 flex items-center gap-2">
            <IconLink />
            Ссылка на страницу
          </h3>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                addon={BASE_URL.replace(/^https?:\/\//, '')}
                value={config.slug}
                onChange={(e) => {
                  setConfig((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
                  setSlugError('');
                }}
                placeholder="my-hotel"
                error={slugError}
              />
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={generateSlug}
              title="Генерировать из названия отеля"
              icon={<IconRefresh />}
            >
              Авто
            </Button>
          </div>

          {/* Preview URL */}
          {config.slug && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-500 truncate">
                {BASE_URL}{config.slug}
              </span>
              <button
                onClick={copyUrl}
                className="p-1 text-gray-400 hover:text-sardoba-gold transition-colors"
                title="Скопировать"
              >
                {copied ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                  <IconCopy />
                )}
              </button>
              {config.booking_enabled && (
                <a
                  href={`/book/${config.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-gray-400 hover:text-sardoba-blue transition-colors"
                  title="Открыть страницу"
                >
                  <IconExternalLink />
                </a>
              )}
            </div>
          )}
        </div>

        {/* ── Description ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-sardoba-dark mb-4">Описание отеля</h3>
          <textarea
            value={config.description || ''}
            onChange={(e) => setConfig((prev) => ({ ...prev, description: e.target.value || null }))}
            placeholder="Расскажите о вашем отеле: расположение, особенности, достопримечательности поблизости..."
            rows={5}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold resize-y"
          />
          <p className="mt-1 text-xs text-gray-400">
            Этот текст будет отображаться на публичной странице вашего отеля
          </p>
        </div>

        {/* ── Cover Photo ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-sardoba-dark mb-4 flex items-center gap-2">
            <IconImage className="text-gray-400" />
            Обложка
          </h3>

          {config.cover_photo ? (
            <div className="relative group rounded-xl overflow-hidden aspect-[21/9]">
              <img
                src={config.cover_photo}
                alt="Обложка"
                className="w-full h-full object-cover"
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
                    onClick={() => removePhoto(config.cover_photo!, 'cover')}
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

        {/* ── Photo Gallery ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sardoba-dark flex items-center gap-2">
              <IconImage className="text-gray-400" />
              Галерея
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => photosInputRef.current?.click()}
              icon={<IconUpload className="w-4 h-4" />}
            >
              Загрузить
            </Button>
          </div>

          {config.photos.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {config.photos.map((url, idx) => (
                <div
                  key={idx}
                  className="relative group aspect-square rounded-lg overflow-hidden"
                >
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removePhoto(url, 'gallery')}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <IconTrash />
                  </button>
                  <div className="absolute bottom-1 left-1 w-5 h-5 rounded bg-black/40 text-white text-xs flex items-center justify-center">
                    {idx + 1}
                  </div>
                </div>
              ))}

              {/* Add more button */}
              <button
                onClick={() => photosInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-sardoba-gold flex items-center justify-center text-gray-400 hover:text-sardoba-gold transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => photosInputRef.current?.click()}
              className="w-full py-12 rounded-xl border-2 border-dashed border-gray-300 hover:border-sardoba-gold flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-sardoba-gold transition-colors"
            >
              <IconUpload />
              <span className="text-sm">Загрузить фотографии</span>
            </button>
          )}

          <input
            ref={photosInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotosUpload}
            className="hidden"
          />
        </div>

        {/* ── Save button ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <Button onClick={handleSave} loading={saving} size="lg">
            Сохранить настройки
          </Button>
          {saved && (
            <span className="text-sm text-green-600 animate-fade-in flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Сохранено
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
