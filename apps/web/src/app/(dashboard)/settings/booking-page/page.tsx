'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePropertyId } from '@/lib/hooks/use-property-id';
import { ThemePresetCard, THEME_PRESET_OPTIONS } from '@/components/booking/ThemePresetCard';
import toast from 'react-hot-toast';

/* ── Types ───────────────────────────────────────────────────────────────── */

interface BookingPageData {
  property_name: string;
  booking_enabled: boolean;
  slug: string;
  description: string | null;
  cover_photo: string | null;
  photos: string[];
}

interface MiniSiteConfig {
  display_name?: string;
  about?: string;
  logo_url?: string;
  cover_image_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  whatsapp?: string;
  telegram?: string;
  instagram?: string;
  facebook?: string;
  google_maps_link?: string;
  theme_preset?: string;
  primary_color?: string;
  show_prices?: boolean;
}

interface MiniSiteSettings {
  slug: string | null;
  booking_enabled: boolean;
  widget_enabled: boolean;
  mini_site_enabled: boolean;
  mini_site_url: string | null;
  embed_code: string | null;
  mini_site_config: MiniSiteConfig;
}

interface WidgetStats {
  total_views: number;
  total_searches: number;
  total_bookings_started: number;
  total_bookings_completed: number;
  conversion_rate: number;
}

/* ── Icons ───────────────────────────────────────────────────────────────── */

function IconGlobe({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function IconLink({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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
function IconExternalLink({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
function IconRefresh({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}
function IconTrash({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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
function IconCopy({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function IconBarChart({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}
function IconPhone({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function IconCheck({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconPalette({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="10.5" r="2.5" /><circle cx="8.5" cy="7.5" r="2.5" /><circle cx="6.5" cy="12.5" r="2.5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}
function IconShare({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
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

const ACCENT_PRESETS = [
  { value: '#D4A843', label: 'Sardoba Gold' },
  { value: '#1E3A5F', label: 'Sardoba Blue' },
  { value: '#059669', label: 'Emerald' },
  { value: '#DC2626', label: 'Red' },
  { value: '#7C3AED', label: 'Violet' },
  { value: '#EA580C', label: 'Orange' },
  { value: '#0891B2', label: 'Cyan' },
  { value: '#DB2777', label: 'Pink' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   UNIFIED BOOKING & MINI-SITE SETTINGS
   ═══════════════════════════════════════════════════════════════════════════ */

export default function BookingPageSettings() {
  const propertyId = usePropertyId();

  /* ── State ──────────────────────────────────────────────────────────────── */
  const [bookingData, setBookingData] = useState<BookingPageData>({
    property_name: '', booking_enabled: false, slug: '', description: null, cover_photo: null, photos: [],
  });
  const [miniSite, setMiniSite] = useState<MiniSiteSettings | null>(null);
  const [stats, setStats] = useState<WidgetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState('');
  const [copied, setCopied] = useState('');
  const [activeTab, setActiveTab] = useState<'main' | 'contacts' | 'appearance' | 'stats'>('main');

  const coverInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);

  /* ── Config helpers ─────────────────────────────────────────────────────── */
  function getConfig(): MiniSiteConfig {
    return miniSite?.mini_site_config ?? {};
  }

  function updateConfig(patch: Partial<MiniSiteConfig>) {
    if (!miniSite) return;
    setMiniSite({
      ...miniSite,
      mini_site_config: { ...miniSite.mini_site_config, ...patch },
    });
  }

  /* ── Load all data ──────────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    if (!propertyId) return;

    try {
      setLoading(true);
      const [bookingRes, miniSiteRes, statsRes] = await Promise.allSettled([
        api.get('/properties/booking-page'),
        api.get(`/properties/${propertyId}/mini-site`),
        api.get(`/properties/${propertyId}/mini-site/stats`),
      ]);

      if (bookingRes.status === 'fulfilled') {
        const d = bookingRes.value.data;
        setBookingData({
          property_name: d.property_name || '',
          booking_enabled: d.booking_enabled ?? false,
          slug: d.slug || '',
          description: d.description || null,
          cover_photo: d.cover_photo || null,
          photos: d.photos || [],
        });
      }
      if (miniSiteRes.status === 'fulfilled') {
        setMiniSite(miniSiteRes.value.data);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }
    } catch {
      toast.error('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Save all settings ─────────────────────────────────────────────────── */
  async function handleSave() {
    if (!bookingData.slug.trim()) {
      setSlugError('Адрес не может быть пустым');
      setActiveTab('main');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(bookingData.slug)) {
      setSlugError('Только латинские буквы, цифры и дефис');
      setActiveTab('main');
      return;
    }

    setSaving(true);
    setSlugError('');
    try {
      const savePromises: Promise<unknown>[] = [];

      // 1. Save booking page data (booking_enabled, slug, description)
      savePromises.push(
        api.patch('/properties/booking-page', {
          booking_enabled: bookingData.booking_enabled,
          slug: bookingData.slug,
          description: bookingData.description,
        }),
      );

      // 2. Save mini-site settings (contacts, theme, widget, etc.)
      if (propertyId && miniSite) {
        savePromises.push(
          api.put(`/properties/${propertyId}/mini-site`, {
            widget_enabled: miniSite.widget_enabled,
            mini_site_enabled: miniSite.mini_site_enabled,
            mini_site_config: {
              ...miniSite.mini_site_config,
              // Sync description and cover photo into mini-site config
              about: bookingData.description || miniSite.mini_site_config.about,
              cover_image_url: bookingData.cover_photo || miniSite.mini_site_config.cover_image_url,
            },
          }),
        );
      }

      await Promise.all(savePromises);
      toast.success('Настройки сохранены');
    } catch (err: any) {
      if (err?.response?.data?.message?.includes('slug')) {
        setSlugError('Этот адрес уже занят. Выберите другой.');
        setActiveTab('main');
      } else {
        toast.error('Ошибка сохранения');
      }
    } finally {
      setSaving(false);
    }
  }

  function generateSlug() {
    const name = getConfig().display_name || bookingData.property_name;
    if (name) {
      setBookingData((prev) => ({ ...prev, slug: slugify(name) }));
      setSlugError('');
    }
  }

  /* ── Upload photos ──────────────────────────────────────────────────────── */
  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post(`/properties/${propertyId}/photos?type=cover`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBookingData((prev) => ({ ...prev, cover_photo: data.url }));
    } catch { /* silent */ }
    if (coverInputRef.current) coverInputRef.current.value = '';
  }

  async function handlePhotosUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const { data } = await api.post(`/properties/${propertyId}/photos?type=gallery`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setBookingData((prev) => ({ ...prev, photos: [...prev.photos, data.url] }));
      } catch { /* silent */ }
    }
    if (photosInputRef.current) photosInputRef.current.value = '';
  }

  async function removePhoto(url: string, type: 'cover' | 'gallery') {
    try { await api.delete(`/properties/${propertyId}/photos`, { data: { url, type } }); } catch { /* silent */ }
    if (type === 'cover') {
      setBookingData((prev) => ({ ...prev, cover_photo: null }));
    } else {
      setBookingData((prev) => ({ ...prev, photos: prev.photos.filter((p) => p !== url) }));
    }
  }

  /* ── Clipboard ──────────────────────────────────────────────────────────── */
  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
    toast.success(`${label} скопирован`);
  }

  /* ── Derived values ─────────────────────────────────────────────────────── */
  const config = getConfig();
  const miniSiteUrl = miniSite?.mini_site_url ?? null;

  /* ── LOADING ────────────────────────────────────────────────────────────── */
  if (loading || !propertyId) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader title="Онлайн-бронирование" subtitle="Загрузка..." />
        <div className="animate-pulse space-y-4 mt-8">
          <div className="h-12 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-36 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  /* ═════════════════════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Онлайн-бронирование"
        subtitle="Публичная страница, оформление и виджет"
        actions={
          bookingData.slug && bookingData.booking_enabled ? (
            <a
              href={`/book/${bookingData.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-sardoba-blue border border-sardoba-blue/30 rounded-lg hover:bg-sardoba-blue/5 transition-colors"
            >
              <IconExternalLink className="w-4 h-4" />
              Открыть страницу
            </a>
          ) : undefined
        }
      />

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="mt-6 flex gap-1 bg-gray-100 p-1 rounded-xl">
        {([
          { key: 'main' as const, label: 'Основное' },
          { key: 'contacts' as const, label: 'Контакты' },
          { key: 'appearance' as const, label: 'Оформление' },
          { key: 'stats' as const, label: 'Статистика' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all',
              activeTab === tab.key
                ? 'bg-white text-sardoba-dark shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6 mt-6">
        {/* ═══ TAB: MAIN ═══════════════════════════════════════════════════ */}
        {activeTab === 'main' && (
          <>
            {/* Enable/Disable booking */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    bookingData.booking_enabled ? 'bg-green-100' : 'bg-gray-100',
                  )}>
                    <IconGlobe className={bookingData.booking_enabled ? 'text-green-600' : 'text-gray-400'} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sardoba-dark">Онлайн-бронирование</h3>
                    <p className="text-sm text-gray-500">
                      {bookingData.booking_enabled
                        ? 'Страница активна и доступна по ссылке'
                        : 'Страница отключена и недоступна для гостей'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setBookingData((prev) => ({ ...prev, booking_enabled: !prev.booking_enabled }))}
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors duration-200',
                    bookingData.booking_enabled ? 'bg-green-500' : 'bg-gray-300',
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                    bookingData.booking_enabled ? 'translate-x-6' : 'translate-x-0.5',
                  )} />
                </button>
              </div>
            </div>

            {/* Slug editor */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-sardoba-dark mb-4 flex items-center gap-2">
                <IconLink />
                Ссылка на страницу
              </h3>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    addon={BASE_URL.replace(/^https?:\/\//, '')}
                    value={bookingData.slug}
                    onChange={(e) => {
                      setBookingData((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
                      setSlugError('');
                    }}
                    placeholder="my-hotel"
                    error={slugError}
                  />
                </div>
                <Button variant="outline" size="md" onClick={generateSlug} title="Генерировать из названия отеля" icon={<IconRefresh />}>
                  Авто
                </Button>
              </div>
              {bookingData.slug && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-gray-500 truncate">{BASE_URL}{bookingData.slug}</span>
                  <button onClick={() => copyToClipboard(`${BASE_URL}${bookingData.slug}`, 'URL')} className="p-1 text-gray-400 hover:text-sardoba-gold transition-colors" title="Скопировать">
                    {copied === 'URL' ? <IconCheck /> : <IconCopy />}
                  </button>
                  {bookingData.booking_enabled && (
                    <a href={`/book/${bookingData.slug}`} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-sardoba-blue transition-colors" title="Открыть страницу">
                      <IconExternalLink />
                    </a>
                  )}
                </div>
              )}
              <p className="mt-2 text-xs text-gray-400">
                Этот адрес будет использоваться как ссылка на публичную страницу вашего отеля
              </p>
            </div>

            {/* Display name & Description */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-sardoba-dark mb-4 flex items-center gap-2">
                <IconBuilding className="text-gray-400" />
                Название и описание
              </h3>
              <div className="space-y-4">
                <Input
                  label="Отображаемое название"
                  value={config.display_name || ''}
                  onChange={(e) => updateConfig({ display_name: e.target.value })}
                  placeholder="Гостиница Sardoba Samarkand"
                  hint="Название, которое увидят гости на странице бронирования"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Описание / О нас</label>
                  <textarea
                    value={bookingData.description || ''}
                    onChange={(e) => setBookingData((prev) => ({ ...prev, description: e.target.value || null }))}
                    placeholder="Расскажите о вашем отеле: расположение, особенности, достопримечательности поблизости..."
                    rows={5}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold resize-y"
                  />
                  <p className="mt-1 text-xs text-gray-400">Этот текст будет отображаться на публичной странице</p>
                </div>
              </div>
            </div>

            {/* Logo */}
            {miniSite && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-sardoba-dark mb-4 flex items-center gap-2">
                  <IconImage className="text-gray-400" />
                  Логотип
                </h3>
                <Input
                  value={config.logo_url || ''}
                  onChange={(e) => updateConfig({ logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  hint="Прямая ссылка на изображение логотипа (PNG, SVG)"
                />
                {config.logo_url && (
                  <div className="mt-3 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                      <img src={config.logo_url} alt="Логотип" className="max-w-full max-h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <button onClick={() => updateConfig({ logo_url: '' })} className="text-sm text-red-500 hover:text-red-600 transition-colors">
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Cover Photo */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-sardoba-dark mb-4 flex items-center gap-2">
                <IconImage className="text-gray-400" />
                Обложка
              </h3>
              {bookingData.cover_photo ? (
                <div className="relative group rounded-xl overflow-hidden aspect-[21/9]">
                  <img src={bookingData.cover_photo} alt="Обложка" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button onClick={() => coverInputRef.current?.click()} className="px-3 py-1.5 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">Заменить</button>
                      <button onClick={() => removePhoto(bookingData.cover_photo!, 'cover')} className="px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors">Удалить</button>
                    </div>
                  </div>
                </div>
              ) : (
                <button onClick={() => coverInputRef.current?.click()} className="w-full aspect-[21/9] rounded-xl border-2 border-dashed border-gray-300 hover:border-sardoba-gold flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-sardoba-gold transition-colors">
                  <IconUpload />
                  <span className="text-sm">Загрузить обложку</span>
                  <span className="text-xs text-gray-300">Рекомендуемый размер: 1920x820</span>
                </button>
              )}
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
            </div>

            {/* Photo Gallery */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sardoba-dark flex items-center gap-2">
                  <IconImage className="text-gray-400" />
                  Галерея
                </h3>
                <Button variant="outline" size="sm" onClick={() => photosInputRef.current?.click()} icon={<IconUpload className="w-4 h-4" />}>
                  Загрузить
                </Button>
              </div>
              {bookingData.photos.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {bookingData.photos.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(url, 'gallery')} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                        <IconTrash />
                      </button>
                      <div className="absolute bottom-1 left-1 w-5 h-5 rounded bg-black/40 text-white text-xs flex items-center justify-center">{idx + 1}</div>
                    </div>
                  ))}
                  <button onClick={() => photosInputRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-sardoba-gold flex items-center justify-center text-gray-400 hover:text-sardoba-gold transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </button>
                </div>
              ) : (
                <button onClick={() => photosInputRef.current?.click()} className="w-full py-12 rounded-xl border-2 border-dashed border-gray-300 hover:border-sardoba-gold flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-sardoba-gold transition-colors">
                  <IconUpload />
                  <span className="text-sm">Загрузить фотографии</span>
                </button>
              )}
              <input ref={photosInputRef} type="file" accept="image/*" multiple onChange={handlePhotosUpload} className="hidden" />
            </div>
          </>
        )}

        {/* ═══ TAB: CONTACTS ═══════════════════════════════════════════════ */}
        {activeTab === 'contacts' && miniSite && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-sardoba-dark flex items-center gap-2">
                <IconPhone />
                Контактная информация
              </h3>
              <p className="text-sm text-gray-500">
                Эти данные будут отображаться на публичной странице для гостей
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Телефон"
                  type="tel"
                  value={config.phone || ''}
                  onChange={(e) => updateConfig({ phone: e.target.value })}
                  placeholder="+998 90 123 45 67"
                />
                <Input
                  label="Email"
                  type="email"
                  value={config.email || ''}
                  onChange={(e) => updateConfig({ email: e.target.value })}
                  placeholder="info@hotel.uz"
                />
              </div>

              <Input
                label="Адрес"
                value={config.address || ''}
                onChange={(e) => updateConfig({ address: e.target.value })}
                placeholder="г. Самарканд, ул. Регистан, 5"
              />

              <Input
                label="WhatsApp"
                value={config.whatsapp || ''}
                onChange={(e) => updateConfig({ whatsapp: e.target.value })}
                placeholder="+998 90 123 45 67"
                hint="Номер для кнопки WhatsApp на странице бронирования"
              />

              <Input
                label="Telegram"
                value={config.telegram || ''}
                onChange={(e) => updateConfig({ telegram: e.target.value })}
                placeholder="@hotel_samarkand"
                hint="Username или ссылка на Telegram"
              />
            </div>

            {/* Social media */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-sardoba-dark flex items-center gap-2">
                <IconShare />
                Социальные сети
              </h3>
              <p className="text-sm text-gray-500">
                Ссылки на ваши аккаунты в социальных сетях
              </p>

              <Input
                label="Instagram"
                value={config.instagram || ''}
                onChange={(e) => updateConfig({ instagram: e.target.value })}
                placeholder="hotel_samarkand"
                hint="Только имя аккаунта без @"
              />

              <Input
                label="Facebook"
                value={config.facebook || ''}
                onChange={(e) => updateConfig({ facebook: e.target.value })}
                placeholder="https://facebook.com/hotel.samarkand"
                hint="Полная ссылка на страницу Facebook"
              />

              <Input
                label="Google Maps"
                value={config.google_maps_link || ''}
                onChange={(e) => updateConfig({ google_maps_link: e.target.value })}
                placeholder="https://maps.google.com/..."
                hint="Ссылка на местоположение в Google Maps"
              />
            </div>
          </>
        )}

        {activeTab === 'contacts' && !miniSite && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500 text-sm">
            Настройки контактов станут доступны после сохранения основных настроек
          </div>
        )}

        {/* ═══ TAB: APPEARANCE ═════════════════════════════════════════════ */}
        {activeTab === 'appearance' && miniSite && (
          <>
            {/* Theme Preset Selection */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Тема оформления</h3>
              <p className="text-sm text-gray-500">
                Выберите визуальный стиль для вашей страницы бронирования
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {THEME_PRESET_OPTIONS.map((preset) => (
                  <ThemePresetCard
                    key={preset.id}
                    preset={preset}
                    selected={(config.theme_preset || 'modern-clean') === preset.id}
                    onSelect={() => updateConfig({ theme_preset: preset.id })}
                  />
                ))}
              </div>

              {/* Preview button */}
              {bookingData.slug && (
                <div className="flex items-center gap-3 pt-2">
                  <a
                    href={`${BASE_URL}${bookingData.slug}?theme=${config.theme_preset || 'modern-clean'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-sardoba-blue border border-sardoba-blue/30 rounded-lg hover:bg-sardoba-blue/5 transition-colors"
                  >
                    <IconExternalLink className="w-4 h-4" />
                    Предпросмотр темы
                  </a>
                  <span className="text-xs text-gray-400">
                    Откроется страница бронирования с выбранной темой
                  </span>
                </div>
              )}
            </div>

            {/* Accent color */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-sardoba-dark flex items-center gap-2">
                <IconPalette />
                Цветовая схема
              </h3>
              <p className="text-sm text-gray-500">
                Основной акцентный цвет для кнопок и элементов страницы.
                Этот цвет заменит основной акцент выбранной темы.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Основной цвет
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="color"
                    value={config.primary_color || '#D4A843'}
                    onChange={(e) => updateConfig({ primary_color: e.target.value })}
                    className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                  />
                  <div>
                    <Input
                      value={config.primary_color || '#D4A843'}
                      onChange={(e) => updateConfig({ primary_color: e.target.value })}
                      placeholder="#D4A843"
                      className="w-32 font-mono"
                    />
                  </div>
                </div>

                {/* Presets */}
                <div className="flex flex-wrap gap-2">
                  {ACCENT_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => updateConfig({ primary_color: preset.value })}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors',
                        (config.primary_color || '#D4A843') === preset.value
                          ? 'border-sardoba-dark bg-gray-50 font-medium'
                          : 'border-gray-200 hover:border-gray-300',
                      )}
                      title={preset.label}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-gray-200"
                        style={{ backgroundColor: preset.value }}
                      />
                      <span className="text-gray-700">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview swatch */}
              <div className="mt-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500 mb-2">Предпросмотр:</p>
                <div className="flex items-center gap-3">
                  <button
                    className="px-4 py-2 text-white text-sm font-medium rounded-lg"
                    style={{ backgroundColor: config.primary_color || '#D4A843' }}
                  >
                    Забронировать
                  </button>
                  <span
                    className="text-sm font-medium"
                    style={{ color: config.primary_color || '#D4A843' }}
                  >
                    Ссылка
                  </span>
                  <span
                    className="px-2 py-0.5 text-xs rounded-full text-white"
                    style={{ backgroundColor: config.primary_color || '#D4A843' }}
                  >
                    Акция
                  </span>
                </div>
              </div>
            </div>

            {/* Display options */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-sardoba-dark">Настройки отображения</h3>

              {/* Show prices toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">Показывать цены</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Отображать стоимость номеров на странице бронирования
                  </p>
                </div>
                <button
                  onClick={() => updateConfig({ show_prices: !(config.show_prices ?? true) })}
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors duration-200',
                    (config.show_prices ?? true) ? 'bg-green-500' : 'bg-gray-300',
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                    (config.show_prices ?? true) ? 'translate-x-6' : 'translate-x-0.5',
                  )} />
                </button>
              </div>

              {/* Widget enabled toggle */}
              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Виджет бронирования</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Встраиваемый виджет для внешнего сайта отеля
                  </p>
                </div>
                <button
                  onClick={() => setMiniSite({ ...miniSite, widget_enabled: !miniSite.widget_enabled })}
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors duration-200',
                    miniSite.widget_enabled ? 'bg-green-500' : 'bg-gray-300',
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                    miniSite.widget_enabled ? 'translate-x-6' : 'translate-x-0.5',
                  )} />
                </button>
              </div>
            </div>

            {/* Embed code */}
            {miniSite.embed_code && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
                <h3 className="font-semibold text-sardoba-dark">Код виджета для вставки</h3>
                <p className="text-xs text-gray-500">
                  Вставьте этот код перед &lt;/body&gt; на сайте отеля, чтобы добавить кнопку бронирования
                </p>
                <textarea
                  readOnly
                  value={miniSite.embed_code}
                  rows={4}
                  className="w-full text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-700"
                />
                <Button
                  onClick={() => copyToClipboard(miniSite.embed_code!, 'Код виджета')}
                  variant="outline"
                  size="sm"
                >
                  {copied === 'Код виджета' ? 'Скопировано!' : 'Скопировать код'}
                </Button>
              </div>
            )}
          </>
        )}

        {activeTab === 'appearance' && !miniSite && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500 text-sm">
            Настройки оформления станут доступны после сохранения основных настроек
          </div>
        )}

        {/* ═══ TAB: STATS ═══════════════════════════════════════════════════ */}
        {activeTab === 'stats' && (
          <>
            {/* Quick link */}
            {miniSiteUrl && (
              <div className="bg-gradient-to-r from-sardoba-blue/5 to-sardoba-gold/5 rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sardoba-dark">Ваша страница бронирования</h3>
                    <p className="text-sm text-gray-500 mt-1 break-all">{miniSiteUrl}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(miniSiteUrl, 'URL страницы')}
                      className="p-2 text-gray-400 hover:text-sardoba-gold rounded-lg hover:bg-white transition-colors"
                      title="Скопировать"
                    >
                      {copied === 'URL страницы' ? <IconCheck /> : <IconCopy />}
                    </button>
                    <a
                      href={miniSiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-sardoba-blue rounded-lg hover:bg-white transition-colors"
                      title="Открыть"
                    >
                      <IconExternalLink />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Stats cards */}
            {stats ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sardoba-dark flex items-center gap-2">
                    <IconBarChart />
                    Статистика посещений
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadData}
                    icon={<IconRefresh />}
                  >
                    Обновить
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">{stats.total_views}</p>
                    <p className="text-xs text-gray-500 mt-1">Просмотры</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">{stats.total_searches}</p>
                    <p className="text-xs text-gray-500 mt-1">Поиски</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">{stats.total_bookings_completed}</p>
                    <p className="text-xs text-gray-500 mt-1">Завершённые брони</p>
                  </div>
                  <div className="text-center p-4 bg-sardoba-gold/5 rounded-xl">
                    <p className="text-2xl font-bold text-sardoba-gold">{stats.conversion_rate}%</p>
                    <p className="text-xs text-gray-500 mt-1">Конверсия</p>
                  </div>
                </div>

                {/* Funnel visualization */}
                {stats.total_views > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-3">Воронка конверсии</p>
                    <div className="space-y-2">
                      <FunnelBar label="Просмотры" value={stats.total_views} max={stats.total_views} color="#6B7280" />
                      <FunnelBar label="Поиски номеров" value={stats.total_searches} max={stats.total_views} color="#3B82F6" />
                      <FunnelBar label="Начали бронирование" value={stats.total_bookings_started} max={stats.total_views} color="#F59E0B" />
                      <FunnelBar label="Завершили бронирование" value={stats.total_bookings_completed} max={stats.total_views} color="#22C55E" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <IconBarChart className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">
                  Статистика появится после первых посещений страницы бронирования
                </p>
              </div>
            )}
          </>
        )}

        {/* ── Save button (visible on all tabs except stats) ─────────────── */}
        {activeTab !== 'stats' && (
          <div className="flex items-center gap-4 pb-8">
            <Button onClick={handleSave} loading={saving} size="lg">
              Сохранить настройки
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Funnel bar component ─────────────────────────────────────────────────── */

function FunnelBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="w-36 text-xs text-gray-600 text-right shrink-0">{label}</div>
      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="w-20 text-xs text-gray-600 shrink-0">
        {value} ({pct}%)
      </div>
    </div>
  );
}
