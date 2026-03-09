'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { publicBookingApi, type HotelPublicInfo } from '@/lib/api/public-booking';
import { BookingThemeProvider, ThemeFonts } from '@/lib/themes';
import type { ThemePresetId } from '@/lib/themes/types';
import { BookingNavbar } from '@/components/booking/sections/BookingNavbar';
import { BookingHero } from '@/components/booking/sections/BookingHero';
import { BookingAbout } from '@/components/booking/sections/BookingAbout';
import { BookingRoomsShowcase } from '@/components/booking/sections/BookingRoomsShowcase';
import { BookingExtrasShowcase } from '@/components/booking/sections/BookingExtrasShowcase';
import { BookingFormContainer } from '@/components/booking/form/BookingFormContainer';
import { BookingContacts } from '@/components/booking/sections/BookingContacts';
import { BookingFooter } from '@/components/booking/sections/BookingFooter';
import { IconSpinner } from '@/components/booking/icons/booking-icons';

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════════════════════════════ */

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-t-bg">
      <div className="text-center">
        <IconSpinner className="w-10 h-10 text-t-primary mx-auto mb-4" />
        <p className="text-t-text-muted">Загрузка...</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR STATE
   ═══════════════════════════════════════════════════════════════════════════ */

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-t-bg">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-t-text mb-2">{message}</h1>
        <p className="text-t-text-muted">Проверьте правильность ссылки или обратитесь к администрации отеля.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

const VALID_THEMES: ThemePresetId[] = [
  'silk-road-luxury', 'cozy-guest-house', 'modern-clean', 'fresh-green', 'minimal-white',
];

export default function HotelBookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const [hotel, setHotel] = useState<HotelPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Load hotel data ─────────────────────────────────────────────────── */
  useEffect(() => {
    publicBookingApi
      .getHotel(slug)
      .then((data) => {
        setHotel(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Страница отеля не найдена');
        setLoading(false);
      });
  }, [slug]);

  /* ── Determine theme: ?theme= URL param overrides hotel config ─────── */
  const themeParam = searchParams.get('theme') as ThemePresetId | null;
  const isThemePreview = !!(themeParam && VALID_THEMES.includes(themeParam));
  const themePreset = isThemePreview
    ? themeParam
    : (hotel?.mini_site_config?.theme_preset as ThemePresetId) || 'modern-clean';
  // When previewing a different theme via ?theme=, use its native colors
  const primaryColor = isThemePreview ? undefined : hotel?.mini_site_config?.primary_color;

  /* ── Loading / Error states (wrapped in provider for CSS vars) ──────── */
  if (loading) {
    return (
      <BookingThemeProvider themeId={themePreset} primaryColorOverride={primaryColor}>
        <LoadingSkeleton />
      </BookingThemeProvider>
    );
  }

  if (error || !hotel) {
    return (
      <BookingThemeProvider themeId={themePreset} primaryColorOverride={primaryColor}>
        <ErrorState message={error || 'Страница не найдена'} />
      </BookingThemeProvider>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */
  const showPrices = hotel.mini_site_config?.show_prices !== false;

  return (
    <BookingThemeProvider themeId={themePreset} primaryColorOverride={primaryColor}>
      <ThemeFonts />
      <div className="min-h-screen bg-t-bg" style={{ fontFamily: 'var(--t-font-body)' }}>
        <BookingNavbar hotelName={hotel.name} logoUrl={hotel.mini_site_config?.logo_url} />
        <BookingHero hotel={hotel} />
        <BookingAbout hotel={hotel} />
        <BookingRoomsShowcase rooms={hotel.rooms} showPrices={showPrices} />
        {hotel.extras?.length > 0 && <BookingExtrasShowcase extras={hotel.extras} showPrices={showPrices} />}
        <BookingFormContainer hotel={hotel} slug={slug} />
        <BookingContacts hotel={hotel} />
        <BookingFooter hotel={hotel} />
      </div>
    </BookingThemeProvider>
  );
}
