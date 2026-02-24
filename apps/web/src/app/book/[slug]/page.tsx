'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/utils/money';
import { getNights } from '@/lib/utils/dates';
import {
  publicBookingApi,
  type HotelPublicInfo,
  type HotelRoom,
  type HotelExtra,
  type PriceCalculation,
} from '@/lib/api/public-booking';

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS & LABELS
   ═══════════════════════════════════════════════════════════════════════════ */

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  ac: 'Кондиционер',
  tv: 'ТВ',
  fridge: 'Холодильник',
  balcony: 'Балкон',
  view: 'Вид',
  bathtub: 'Ванна',
  shower: 'Душ',
  safe: 'Сейф',
  minibar: 'Мини-бар',
  kettle: 'Чайник',
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  single: 'Одноместный',
  double: 'Двухместный',
  family: 'Семейный',
  suite: 'Люкс',
  dorm: 'Общий',
};

const PRICE_TYPE_LABELS: Record<string, string> = {
  per_booking: 'за бронь',
  per_night: 'за ночь',
  per_person: 'за гостя',
};

/* ═══════════════════════════════════════════════════════════════════════════
   SVG ICONS (inline, no emojis)
   ═══════════════════════════════════════════════════════════════════════════ */

function IconMapPin({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
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

function IconPhone({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconUsers({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconChild({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3" />
      <path d="M12 8v13" />
      <path d="M8 21h8" />
      <path d="M7 13l5 3 5-3" />
    </svg>
  );
}

function IconCheck({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconMinus({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconPlus({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconCalendar({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconMail({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IconUser({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconNotes({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconStar({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconBed({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" />
    </svg>
  );
}

function IconService({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconChevronDown({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconSpinner({ className = '' }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AMENITY ICON COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function AmenityIcon({ amenity }: { amenity: string }) {
  const common = 'w-4 h-4';
  switch (amenity) {
    case 'wifi':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      );
    case 'ac':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v10" /><path d="M18.4 6.6L12 12" /><path d="M5.6 6.6L12 12" /><path d="M12 12v10" /><path d="M18.4 17.4L12 12" /><path d="M5.6 17.4L12 12" />
        </svg>
      );
    case 'tv':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="15" rx="2" ry="2" /><polyline points="17 2 12 7 7 2" />
        </svg>
      );
    default:
      return <IconCheck className={common} />;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   useInView HOOK (scroll reveal)
   ═══════════════════════════════════════════════════════════════════════════ */

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ═══════════════════════════════════════════════════════════════════════════
   COUNTER COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

function Counter({
  value,
  onChange,
  min = 0,
  max = 10,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-sardoba-gold hover:text-sardoba-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <IconMinus />
        </button>
        <span className="w-6 text-center font-semibold text-sardoba-dark">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-sardoba-gold hover:text-sardoba-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <IconPlus />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PHOTO GALLERY (lightbox)
   ═══════════════════════════════════════════════════════════════════════════ */

function PhotoGallery({ photos }: { photos: string[] }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((url, i) => (
          <button
            key={i}
            onClick={() => { setIdx(i); setOpen(true); }}
            className="aspect-[4/3] rounded-xl overflow-hidden group relative"
          >
            <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={() => setOpen(false)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); setIdx((idx - 1 + photos.length) % photos.length); }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); setIdx((idx + 1) % photos.length); }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </>
          )}
          <img
            src={photos[idx]}
            alt=""
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {idx + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function HotelBookingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  /* ── State ─────────────────────────────────────────────────────────────── */
  const [hotel, setHotel] = useState<HotelPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking form state
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [availableRooms, setAvailableRooms] = useState<HotelRoom[] | null>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [selectedExtras, setSelectedExtras] = useState<Record<number, number>>({});
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Calculation
  const [priceCalc, setPriceCalc] = useState<PriceCalculation | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Scroll visibility
  const roomsSection = useInView(0.1);
  const extrasSection = useInView(0.1);
  const bookingSection = useInView(0.1);

  // Mobile price bar
  const [showMobilePrice, setShowMobilePrice] = useState(false);

  /* ── Load hotel data ───────────────────────────────────────────────────── */
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

  /* ── Load available rooms on date change ───────────────────────────────── */
  useEffect(() => {
    if (!checkIn || !checkOut || !hotel) return;
    const nights = getNights(checkIn, checkOut);
    if (nights < 1) return;

    publicBookingApi
      .getAvailableRooms(slug, checkIn, checkOut)
      .then((rooms) => {
        setAvailableRooms(rooms);
        // Reset selection if current room is unavailable
        if (selectedRoom && !rooms.find((r) => r.id === selectedRoom)) {
          setSelectedRoom(null);
          setPriceCalc(null);
        }
      })
      .catch(() => {
        setAvailableRooms(hotel.rooms);
      });
  }, [checkIn, checkOut, slug, hotel, selectedRoom]);

  /* ── Calculate price ───────────────────────────────────────────────────── */
  const calculatePrice = useCallback(async () => {
    if (!selectedRoom || !checkIn || !checkOut) return;
    const nights = getNights(checkIn, checkOut);
    if (nights < 1) return;

    setCalcLoading(true);
    try {
      const extrasArr = Object.entries(selectedExtras)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ extra_id: Number(id), quantity: qty }));

      const result = await publicBookingApi.calculatePrice(slug, {
        room_id: selectedRoom,
        check_in: checkIn,
        check_out: checkOut,
        adults,
        children,
        extras: extrasArr.length > 0 ? extrasArr : undefined,
      });
      setPriceCalc(result);
    } catch {
      // silent
    } finally {
      setCalcLoading(false);
    }
  }, [selectedRoom, checkIn, checkOut, adults, children, selectedExtras, slug]);

  useEffect(() => {
    const timer = setTimeout(calculatePrice, 400);
    return () => clearTimeout(timer);
  }, [calculatePrice]);

  /* ── Scroll listener for mobile price bar ──────────────────────────────── */
  useEffect(() => {
    const handler = () => {
      setShowMobilePrice(window.scrollY > 600);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  /* ── Form validation ───────────────────────────────────────────────────── */
  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!checkIn) errors.checkIn = 'Выберите дату заезда';
    if (!checkOut) errors.checkOut = 'Выберите дату выезда';
    if (checkIn && checkOut && getNights(checkIn, checkOut) < 1) errors.checkOut = 'Дата выезда должна быть позже заезда';
    if (!selectedRoom) errors.room = 'Выберите номер';
    if (!guestFirstName.trim()) errors.firstName = 'Введите имя';
    if (!guestLastName.trim()) errors.lastName = 'Введите фамилию';
    if (!guestPhone.trim()) errors.phone = 'Введите номер телефона';
    else if (!/^\+998\d{9}$/.test(guestPhone.replace(/\s/g, ''))) errors.phone = 'Формат: +998XXXXXXXXX';
    if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) errors.email = 'Некорректный email';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /* ── Submit booking ────────────────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const extrasArr = Object.entries(selectedExtras)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ extra_id: Number(id), quantity: qty }));

      const result = await publicBookingApi.createBooking(slug, {
        room_id: selectedRoom!,
        check_in: checkIn,
        check_out: checkOut,
        adults,
        children,
        guest_first_name: guestFirstName.trim(),
        guest_last_name: guestLastName.trim(),
        guest_phone: guestPhone.replace(/\s/g, ''),
        guest_email: guestEmail.trim() || undefined,
        notes: notes.trim() || undefined,
        extras: extrasArr.length > 0 ? extrasArr : undefined,
      });
      router.push(`/book/${slug}/confirmation/${result.booking_number}`);
    } catch {
      setFormErrors({ submit: 'Не удалось создать бронирование. Попробуйте ещё раз.' });
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Today for min-date ────────────────────────────────────────────────── */
  const today = new Date().toISOString().split('T')[0];

  /* ── Extras toggle ─────────────────────────────────────────────────────── */
  function toggleExtra(id: number) {
    setSelectedExtras((prev) => {
      const copy = { ...prev };
      if (copy[id]) delete copy[id];
      else copy[id] = 1;
      return copy;
    });
  }

  const nights = checkIn && checkOut ? getNights(checkIn, checkOut) : 0;
  const displayRooms = availableRooms || hotel?.rooms || [];
  const selectedRoomData = displayRooms.find((r) => r.id === selectedRoom);

  /* ── LOADING STATE ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sardoba-cream">
        <div className="text-center">
          <IconSpinner className="w-10 h-10 text-sardoba-gold mx-auto mb-4" />
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  /* ── ERROR STATE ───────────────────────────────────────────────────────── */
  if (error || !hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sardoba-cream">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
          <h1 className="text-xl font-bold text-sardoba-dark mb-2">{error || 'Страница не найдена'}</h1>
          <p className="text-gray-500">Проверьте правильность ссылки или обратитесь к администрации отеля.</p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-sardoba-cream">
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-40 nav-glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconBed className="text-sardoba-gold" />
            <span className="font-bold text-white text-lg truncate max-w-[200px] sm:max-w-none">
              {hotel.name}
            </span>
          </div>
          <a
            href="#booking"
            className="px-5 py-2 bg-sardoba-gold text-sardoba-dark font-semibold text-sm rounded-lg hover:bg-sardoba-gold-light transition-all duration-300 hover:-translate-y-0.5"
          >
            Забронировать
          </a>
        </div>
      </nav>

      {/* ── HERO SECTION ───────────────────────────────────────────────────── */}
      <section className="relative h-[70vh] min-h-[500px] flex items-end">
        {/* Background */}
        {hotel.cover_photo ? (
          <img
            src={hotel.cover_photo}
            alt={hotel.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-hero-pattern" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-sardoba-dark via-sardoba-dark/40 to-transparent" />
        {/* Decorative pattern */}
        <div className="absolute inset-0 uzbek-pattern opacity-10" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-20">
          <div className="animate-slide-up">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              {hotel.name}
            </h1>

            <div className="flex flex-wrap gap-4 text-white/80 text-sm sm:text-base mb-6">
              <span className="flex items-center gap-1.5">
                <IconMapPin className="text-sardoba-gold shrink-0" />
                {hotel.city}, {hotel.address}
              </span>
              <span className="flex items-center gap-1.5">
                <IconPhone className="text-sardoba-gold shrink-0" />
                {hotel.phone}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-white/70 text-sm">
              <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5">
                <IconClock className="text-sardoba-gold" />
                Заезд с {hotel.checkin_time}
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5">
                <IconClock className="text-sardoba-gold" />
                Выезд до {hotel.checkout_time}
              </span>
            </div>
          </div>

          {/* CTA */}
          <a
            href="#booking"
            className="mt-8 inline-flex items-center gap-2 btn-gold text-base"
          >
            Забронировать номер
            <IconChevronDown />
          </a>
        </div>
      </section>

      {/* ── ABOUT SECTION ──────────────────────────────────────────────────── */}
      {(hotel.description || hotel.photos.length > 0) && (
        <section className="py-16 sm:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {hotel.description && (
              <div className="max-w-3xl mb-12">
                <h2 className="text-2xl sm:text-3xl font-bold text-sardoba-blue mb-6">
                  Об отеле
                </h2>
                <p className="text-gray-600 leading-relaxed text-base sm:text-lg whitespace-pre-line">
                  {hotel.description}
                </p>
              </div>
            )}

            {hotel.photos.length > 0 && (
              <PhotoGallery photos={hotel.photos} />
            )}
          </div>
        </section>
      )}

      {/* ── ROOMS SHOWCASE ─────────────────────────────────────────────────── */}
      <section
        ref={roomsSection.ref}
        className={cn(
          'py-16 sm:py-20 bg-sardoba-cream transition-all duration-700',
          roomsSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-sardoba-blue mb-3">
              Наши номера
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Выберите номер, идеально подходящий для вашего отдыха
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {hotel.rooms.map((room) => (
              <div
                key={room.id}
                className="glass-card-light overflow-hidden group hover:shadow-card-hover transition-all duration-500 hover:-translate-y-1"
              >
                {/* Room photo */}
                <div className="aspect-[16/10] relative overflow-hidden">
                  {room.photos.length > 0 ? (
                    <img
                      src={room.photos[0]}
                      alt={room.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sardoba-blue to-sardoba-blue-dark flex items-center justify-center">
                      <IconBed className="w-12 h-12 text-white/40" />
                    </div>
                  )}
                  {/* Type badge */}
                  <span className="absolute top-3 left-3 px-3 py-1 bg-sardoba-dark/80 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                    {ROOM_TYPE_LABELS[room.room_type] || room.room_type}
                  </span>
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-sardoba-dark mb-2">{room.name}</h3>

                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <IconUsers className="w-4 h-4" />
                      {room.capacity_adults} {room.capacity_adults === 1 ? 'взрослый' : room.capacity_adults < 5 ? 'взрослых' : 'взрослых'}
                    </span>
                    {room.capacity_children > 0 && (
                      <span className="flex items-center gap-1">
                        <IconChild className="w-3.5 h-3.5" />
                        {room.capacity_children} {room.capacity_children === 1 ? 'ребёнок' : 'детей'}
                      </span>
                    )}
                  </div>

                  {room.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{room.description}</p>
                  )}

                  {/* Amenities */}
                  {room.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {room.amenities.slice(0, 5).map((a) => (
                        <span
                          key={a}
                          className="flex items-center gap-1 text-xs bg-sardoba-sand/60 text-sardoba-blue px-2 py-1 rounded-full"
                        >
                          <AmenityIcon amenity={a} />
                          {AMENITY_LABELS[a] || a}
                        </span>
                      ))}
                      {room.amenities.length > 5 && (
                        <span className="text-xs text-gray-400 px-2 py-1">
                          +{room.amenities.length - 5}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Price + CTA */}
                  <div className="flex items-end justify-between pt-3 border-t border-gray-100">
                    <div>
                      <span className="text-xs text-gray-400">от</span>
                      <p className="text-xl font-bold text-sardoba-gold">
                        {formatMoney(room.base_price)}
                        <span className="text-sm font-normal text-gray-400">/ночь</span>
                      </p>
                    </div>
                    <a
                      href="#booking"
                      onClick={() => setSelectedRoom(room.id)}
                      className="px-4 py-2 bg-sardoba-blue text-white text-sm font-medium rounded-lg hover:bg-sardoba-blue-light transition-colors"
                    >
                      Выбрать
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXTRAS SECTION ─────────────────────────────────────────────────── */}
      {hotel.extras.length > 0 && (
        <section
          ref={extrasSection.ref}
          className={cn(
            'py-16 sm:py-20 bg-white transition-all duration-700',
            extrasSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
          )}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-sardoba-blue mb-3">
                Дополнительные услуги
              </h2>
              <p className="text-gray-500 max-w-lg mx-auto">
                Сделайте ваше пребывание ещё комфортнее
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hotel.extras.map((extra) => (
                <div
                  key={extra.id}
                  className="glass-card-light p-5 flex gap-4 items-start hover:shadow-card-hover transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-sardoba-gold/10 flex items-center justify-center shrink-0">
                    <IconService className="text-sardoba-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sardoba-dark text-sm">{extra.name}</h3>
                    {extra.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{extra.description}</p>
                    )}
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="font-bold text-sardoba-gold text-sm">
                        {formatMoney(extra.price)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {PRICE_TYPE_LABELS[extra.price_type]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── BOOKING FORM SECTION ───────────────────────────────────────────── */}
      <section
        id="booking"
        ref={bookingSection.ref}
        className={cn(
          'py-16 sm:py-20 bg-sardoba-cream transition-all duration-700',
          bookingSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-sardoba-blue mb-3">
              Забронировать номер
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Заполните форму ниже, и мы подтвердим ваше бронирование
            </p>
          </div>

          <form onSubmit={handleSubmit} className="lg:grid lg:grid-cols-3 lg:gap-8">
            {/* ── Left: Form fields (2 columns on lg) ── */}
            <div className="lg:col-span-2 space-y-8">

              {/* Step 1: Dates */}
              <div className="glass-card-light p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-sardoba-dark mb-4">
                  <span className="w-7 h-7 rounded-full bg-sardoba-gold text-white text-sm flex items-center justify-center font-bold">1</span>
                  Даты проживания
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <IconCalendar className="inline w-4 h-4 mr-1 text-gray-400" />
                      Дата заезда <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      min={today}
                      value={checkIn}
                      onChange={(e) => {
                        setCheckIn(e.target.value);
                        if (checkOut && e.target.value >= checkOut) setCheckOut('');
                      }}
                      className={cn(
                        'w-full rounded-lg border bg-white px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold',
                        formErrors.checkIn ? 'border-red-500' : 'border-gray-300',
                      )}
                    />
                    {formErrors.checkIn && <p className="mt-1 text-xs text-red-600">{formErrors.checkIn}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <IconCalendar className="inline w-4 h-4 mr-1 text-gray-400" />
                      Дата выезда <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      min={checkIn || today}
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className={cn(
                        'w-full rounded-lg border bg-white px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold',
                        formErrors.checkOut ? 'border-red-500' : 'border-gray-300',
                      )}
                    />
                    {formErrors.checkOut && <p className="mt-1 text-xs text-red-600">{formErrors.checkOut}</p>}
                  </div>
                </div>
                {nights > 0 && (
                  <p className="mt-3 text-sm text-sardoba-gold font-medium">
                    {nights} {nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей'}
                  </p>
                )}
              </div>

              {/* Step 2: Room selection */}
              <div className="glass-card-light p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-sardoba-dark mb-4">
                  <span className="w-7 h-7 rounded-full bg-sardoba-gold text-white text-sm flex items-center justify-center font-bold">2</span>
                  Выберите номер
                </h3>
                {formErrors.room && <p className="mb-3 text-xs text-red-600">{formErrors.room}</p>}

                <div className="space-y-3">
                  {displayRooms.map((room) => (
                    <label
                      key={room.id}
                      className={cn(
                        'flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300',
                        selectedRoom === room.id
                          ? 'border-sardoba-gold bg-sardoba-gold/5 shadow-glow-gold'
                          : 'border-gray-200 bg-white hover:border-sardoba-gold/40',
                      )}
                    >
                      <input
                        type="radio"
                        name="room"
                        value={room.id}
                        checked={selectedRoom === room.id}
                        onChange={() => setSelectedRoom(room.id)}
                        className="mt-1 w-4 h-4 text-sardoba-gold focus:ring-sardoba-gold/50 border-gray-300"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold text-sardoba-dark">{room.name}</span>
                            <span className="ml-2 text-xs bg-sardoba-blue/10 text-sardoba-blue px-2 py-0.5 rounded-full">
                              {ROOM_TYPE_LABELS[room.room_type] || room.room_type}
                            </span>
                          </div>
                          <span className="font-bold text-sardoba-gold whitespace-nowrap">
                            {formatMoney(room.base_price)}
                            <span className="text-xs font-normal text-gray-400">/ночь</span>
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center gap-0.5">
                            <IconUsers className="w-3.5 h-3.5" />
                            {room.capacity_adults}
                          </span>
                          {room.capacity_children > 0 && (
                            <span className="flex items-center gap-0.5">
                              <IconChild className="w-3 h-3" />
                              +{room.capacity_children}
                            </span>
                          )}
                          {room.amenities.slice(0, 4).map((a) => (
                            <span key={a} className="text-gray-400">{AMENITY_LABELS[a] || a}</span>
                          ))}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Step 3: Guests */}
              <div className="glass-card-light p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-sardoba-dark mb-4">
                  <span className="w-7 h-7 rounded-full bg-sardoba-gold text-white text-sm flex items-center justify-center font-bold">3</span>
                  Гости
                </h3>
                <div className="space-y-4 max-w-sm">
                  <Counter
                    label="Взрослые"
                    value={adults}
                    onChange={setAdults}
                    min={1}
                    max={selectedRoomData?.capacity_adults || 6}
                  />
                  <Counter
                    label="Дети"
                    value={children}
                    onChange={setChildren}
                    min={0}
                    max={selectedRoomData?.capacity_children || 4}
                  />
                </div>
              </div>

              {/* Step 4: Extras */}
              {hotel.extras.length > 0 && (
                <div className="glass-card-light p-6">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-sardoba-dark mb-4">
                    <span className="w-7 h-7 rounded-full bg-sardoba-gold text-white text-sm flex items-center justify-center font-bold">4</span>
                    Дополнительные услуги
                  </h3>
                  <div className="space-y-3">
                    {hotel.extras.map((extra) => (
                      <label
                        key={extra.id}
                        className={cn(
                          'flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all duration-200',
                          selectedExtras[extra.id]
                            ? 'border-sardoba-gold bg-sardoba-gold/5'
                            : 'border-gray-200 bg-white hover:border-gray-300',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={!!selectedExtras[extra.id]}
                          onChange={() => toggleExtra(extra.id)}
                          className="w-4 h-4 text-sardoba-gold focus:ring-sardoba-gold/50 border-gray-300 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-sardoba-dark">{extra.name}</span>
                          {extra.description && (
                            <p className="text-xs text-gray-400 mt-0.5">{extra.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-sardoba-gold">
                            {formatMoney(extra.price)}
                          </span>
                          <span className="block text-xs text-gray-400">
                            {PRICE_TYPE_LABELS[extra.price_type]}
                          </span>
                        </div>
                        {selectedExtras[extra.id] && extra.price_type === 'per_person' && (
                          <div className="shrink-0" onClick={(e) => e.preventDefault()}>
                            <Counter
                              label=""
                              value={selectedExtras[extra.id] || 1}
                              onChange={(v) =>
                                setSelectedExtras((prev) => ({ ...prev, [extra.id]: v }))
                              }
                              min={1}
                              max={adults + children}
                            />
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Guest info */}
              <div className="glass-card-light p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-sardoba-dark mb-4">
                  <span className="w-7 h-7 rounded-full bg-sardoba-gold text-white text-sm flex items-center justify-center font-bold">
                    {hotel.extras.length > 0 ? '5' : '4'}
                  </span>
                  Данные гостя
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <IconUser className="inline w-4 h-4 mr-1 text-gray-400" />
                      Имя <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={guestFirstName}
                      onChange={(e) => setGuestFirstName(e.target.value)}
                      placeholder="Иван"
                      className={cn(
                        'w-full rounded-lg border bg-white px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold',
                        formErrors.firstName ? 'border-red-500' : 'border-gray-300',
                      )}
                    />
                    {formErrors.firstName && <p className="mt-1 text-xs text-red-600">{formErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <IconUser className="inline w-4 h-4 mr-1 text-gray-400" />
                      Фамилия <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={guestLastName}
                      onChange={(e) => setGuestLastName(e.target.value)}
                      placeholder="Петров"
                      className={cn(
                        'w-full rounded-lg border bg-white px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold',
                        formErrors.lastName ? 'border-red-500' : 'border-gray-300',
                      )}
                    />
                    {formErrors.lastName && <p className="mt-1 text-xs text-red-600">{formErrors.lastName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <IconPhone className="inline w-4 h-4 mr-1 text-gray-400" />
                      Телефон <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (!val.startsWith('+998')) val = '+998' + val.replace(/^\+?998?/, '');
                        setGuestPhone(val);
                      }}
                      placeholder="+998 90 123 45 67"
                      className={cn(
                        'w-full rounded-lg border bg-white px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold',
                        formErrors.phone ? 'border-red-500' : 'border-gray-300',
                      )}
                    />
                    {formErrors.phone && <p className="mt-1 text-xs text-red-600">{formErrors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <IconMail className="inline w-4 h-4 mr-1 text-gray-400" />
                      Email <span className="text-gray-400 text-xs font-normal">(необязательно)</span>
                    </label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="ivan@example.com"
                      className={cn(
                        'w-full rounded-lg border bg-white px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold',
                        formErrors.email ? 'border-red-500' : 'border-gray-300',
                      )}
                    />
                    {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <IconNotes className="inline w-4 h-4 mr-1 text-gray-400" />
                    Примечание <span className="text-gray-400 text-xs font-normal">(необязательно)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Особые пожелания, время прибытия и т.д."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold resize-none"
                  />
                </div>
              </div>

              {/* Submit (mobile only, desktop submit is in sidebar) */}
              {formErrors.submit && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {formErrors.submit}
                </div>
              )}

              <div className="lg:hidden">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-gold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <IconSpinner className="w-5 h-5" />
                      Создание бронирования...
                    </>
                  ) : (
                    'Забронировать'
                  )}
                </button>
              </div>
            </div>

            {/* ── Right: Sticky price summary ── */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <div className="glass-card-light p-6">
                  <h3 className="text-lg font-semibold text-sardoba-dark mb-4 flex items-center gap-2">
                    <IconStar className="text-sardoba-gold" />
                    Ваше бронирование
                  </h3>

                  {/* Summary details */}
                  {selectedRoomData ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Номер</span>
                        <span className="font-medium text-sardoba-dark">{selectedRoomData.name}</span>
                      </div>
                      {nights > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Ночей</span>
                          <span className="font-medium text-sardoba-dark">{nights}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Гости</span>
                        <span className="font-medium text-sardoba-dark">
                          {adults} взр.{children > 0 ? `, ${children} дет.` : ''}
                        </span>
                      </div>
                      {checkIn && checkOut && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Заезд</span>
                            <span className="font-medium text-sardoba-dark">{checkIn}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Выезд</span>
                            <span className="font-medium text-sardoba-dark">{checkOut}</span>
                          </div>
                        </>
                      )}

                      <div className="border-t border-gray-200 pt-3 mt-3" />

                      {/* Price breakdown */}
                      {calcLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <IconSpinner className="w-5 h-5 text-sardoba-gold" />
                        </div>
                      ) : priceCalc ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Номер ({priceCalc.nights} ноч.)</span>
                            <span className="font-medium">{formatMoney(priceCalc.room_price)}</span>
                          </div>
                          {priceCalc.extras_breakdown.map((ext, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="text-gray-500 text-xs">{ext.name} x{ext.quantity}</span>
                              <span className="font-medium text-xs">{formatMoney(ext.total)}</span>
                            </div>
                          ))}
                          <div className="border-t border-gray-200 pt-3 mt-3" />
                          <div className="flex justify-between items-baseline">
                            <span className="text-base font-semibold text-sardoba-dark">Итого</span>
                            <span className="text-2xl font-bold text-sardoba-gold">
                              {formatMoney(priceCalc.total)}
                            </span>
                          </div>
                        </>
                      ) : nights > 0 ? (
                        <div className="flex justify-between items-baseline">
                          <span className="text-gray-500">Примерно</span>
                          <span className="text-xl font-bold text-sardoba-gold">
                            {formatMoney(selectedRoomData.base_price * nights)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-6">
                      Выберите номер и даты для расчёта стоимости
                    </p>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-6 w-full btn-gold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <IconSpinner className="w-5 h-5" />
                        Создание...
                      </>
                    ) : (
                      'Забронировать'
                    )}
                  </button>

                  {formErrors.submit && (
                    <p className="mt-3 text-xs text-red-600 text-center">{formErrors.submit}</p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* ── MOBILE STICKY PRICE BAR ────────────────────────────────────────── */}
      {showMobilePrice && priceCalc && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-lg border-t border-gray-200 px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500">Итого</span>
            <p className="text-lg font-bold text-sardoba-gold">{formatMoney(priceCalc.total)}</p>
          </div>
          <a
            href="#booking"
            className="px-6 py-2.5 bg-sardoba-gold text-sardoba-dark font-semibold text-sm rounded-lg"
          >
            Забронировать
          </a>
        </div>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="bg-sardoba-dark py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold text-white mb-3">{hotel.name}</h3>
              <p className="text-gray-400 text-sm">{hotel.city}, {hotel.address}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Контакты</h4>
              <p className="text-gray-400 text-sm flex items-center gap-2 mb-1">
                <IconPhone className="text-sardoba-gold w-4 h-4" />
                {hotel.phone}
              </p>
              <p className="text-gray-400 text-sm flex items-center gap-2">
                <IconClock className="text-sardoba-gold w-4 h-4" />
                Заезд {hotel.checkin_time} / Выезд {hotel.checkout_time}
              </p>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <p className="text-gray-500 text-xs">
                Работает на
              </p>
              <p className="text-sm font-bold text-white mt-1">
                Sardoba <span className="text-sardoba-gold">PMS</span>
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Современная система управления отелем
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-gray-500">
            Powered by Sardoba PMS
          </div>
        </div>
      </footer>
    </div>
  );
}
