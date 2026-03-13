'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getNights } from '@/lib/utils/dates';
import { useBookingTheme } from '@/lib/themes';
import {
  publicBookingApi,
  type HotelPublicInfo,
  type HotelRoom,
  type PriceCalculation,
} from '@/lib/api/public-booking';
import { formatMoney } from '@/lib/utils/money';
import { IconSpinner } from '../icons/booking-icons';
import { DateSelector } from './DateSelector';
import { RoomSelector } from './RoomSelector';
import { GuestCounter } from './GuestCounter';
import { ExtrasSelector } from './ExtrasSelector';
import { GuestInfoForm } from './GuestInfoForm';
import { MobilePriceBar } from './MobilePriceBar';

interface BookingFormContainerProps {
  hotel: HotelPublicInfo;
  slug: string;
}

/**
 * Booking form — 2-column layout matching HTML prototypes:
 * Left: perks/info, Right: compact form card with total.
 */
export function BookingFormContainer({ hotel, slug }: BookingFormContainerProps) {
  const router = useRouter();
  const { theme, isDark } = useBookingTheme();

  /* ── Booking form state ─────────────────────────────────────────────── */
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

  /* ── Calculation state ──────────────────────────────────────────────── */
  const [priceCalc, setPriceCalc] = useState<PriceCalculation | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  /* ── Submit state ───────────────────────────────────────────────────── */
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /* ── Mobile price bar visibility ────────────────────────────────────── */
  const [showMobilePrice, setShowMobilePrice] = useState(false);

  /* ── Today for min-date ─────────────────────────────────────────────── */
  const today = new Date().toISOString().split('T')[0];

  /* ── Derived state ──────────────────────────────────────────────────── */
  const nights = checkIn && checkOut ? getNights(checkIn, checkOut) : 0;
  const displayRooms = availableRooms || hotel.rooms || [];
  const selectedRoomData = displayRooms.find((r) => r.id === selectedRoom) || null;

  /* ── Load available rooms on date change ─────────────────────────────── */
  useEffect(() => {
    if (!checkIn || !checkOut) return;
    const n = getNights(checkIn, checkOut);
    if (n < 1) return;

    publicBookingApi
      .getAvailableRooms(slug, checkIn, checkOut)
      .then((rooms) => {
        setAvailableRooms(rooms);
        if (selectedRoom && !rooms.find((r) => r.id === selectedRoom)) {
          setSelectedRoom(null);
          setPriceCalc(null);
        }
      })
      .catch(() => {
        setAvailableRooms(hotel.rooms);
      });
  }, [checkIn, checkOut, slug, hotel, selectedRoom]);

  /* ── Calculate price ─────────────────────────────────────────────────── */
  const calculatePrice = useCallback(async () => {
    if (!selectedRoom || !checkIn || !checkOut) return;
    const n = getNights(checkIn, checkOut);
    if (n < 1) return;

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

  /* ── Scroll listener for mobile price bar ────────────────────────────── */
  useEffect(() => {
    const handler = () => {
      setShowMobilePrice(window.scrollY > 600);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  /* ── Form validation ─────────────────────────────────────────────────── */
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

  /* ── Submit booking ──────────────────────────────────────────────────── */
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
        first_name: guestFirstName.trim(),
        last_name: guestLastName.trim(),
        phone: guestPhone.replace(/\s/g, ''),
        email: guestEmail.trim() || undefined,
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

  /* ── Extras toggle ───────────────────────────────────────────────────── */
  function toggleExtra(id: number) {
    setSelectedExtras((prev) => {
      const copy = { ...prev };
      if (copy[id]) delete copy[id];
      else copy[id] = 1;
      return copy;
    });
  }

  function updateExtraQuantity(id: number, quantity: number) {
    setSelectedExtras((prev) => ({ ...prev, [id]: quantity }));
  }

  /* ── Step numbering ──────────────────────────────────────────────────── */
  const hasExtras = hotel.extras.length > 0;
  const extrasStepNumber = 4;
  const guestInfoStepNumber = hasExtras ? 5 : 4;

  /* ── Perks data ─────────────────────────────────────────────────────── */
  const perks = isDark ? [
    { icon: <><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>, label: 'Бронирование без комиссии' },
    { icon: <><path d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></>, label: 'Мгновенное подтверждение' },
    { icon: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>, label: 'Безопасная оплата при заезде' },
    { icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>, label: 'Гарантия лучшей цены' },
  ] : [
    { icon: <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />, label: 'Бесплатная отмена за 24 часа' },
    { icon: <path d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />, label: 'Мгновенное подтверждение' },
    { icon: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>, label: 'Безопасная оплата' },
  ];

  /* ── Total display ──────────────────────────────────────────────────── */
  const totalAmount = priceCalc
    ? formatMoney(priceCalc.total)
    : selectedRoomData && nights > 0
      ? formatMoney(selectedRoomData.base_price * nights)
      : null;

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <section
        id="booking"
        className="py-16 sm:py-24"
        style={{ background: isDark ? 'var(--t-bg)' : 'var(--t-surface)' }}
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-14">
          {/* Section header */}
          <div className="text-center mb-12">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{
                backgroundColor: `rgba(var(--t-primary-rgb), 0.1)`,
                color: 'var(--t-primary)',
              }}
            >
              Бронирование
            </span>
            <h2
              className="text-3xl sm:text-4xl lg:text-[46px] leading-[1.2]"
              style={{
                fontFamily: 'var(--t-font-heading)',
                fontWeight: isDark ? 300 : 600,
                letterSpacing: '-0.02em',
              }}
            >
              Забронируйте{' '}
              <em className="italic" style={{ color: 'var(--t-primary)' }}>без комиссии</em>
            </h2>
          </div>

          {/* 2-column layout: info left, form right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            {/* ── LEFT: Perks & info ── */}
            <div className="hidden lg:block">
              <p
                className="text-[15px] leading-relaxed mb-8"
                style={{ color: 'var(--t-text-muted)' }}
              >
                Бронируя напрямую, вы получаете лучшую цену без посредников
                и комиссий. Администратор свяжется с вами в течение 5 минут
                для подтверждения.
              </p>

              {/* Perks list */}
              <div className="space-y-4 mb-10">
                {perks.map((perk) => (
                  <div key={perk.label} className="flex items-center gap-4">
                    <div
                      className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0"
                      style={{
                        background: isDark ? 'transparent' : `rgba(var(--t-primary-rgb), 0.08)`,
                        border: isDark ? '1px solid rgba(201,169,110,.15)' : 'none',
                      }}
                    >
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        style={{ color: 'var(--t-primary)' }}
                      >
                        {perk.icon}
                      </svg>
                    </div>
                    <span className="text-[14px] font-medium" style={{ color: 'var(--t-text)' }}>
                      {perk.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Trust badge */}
              <div
                className="p-5 rounded-2xl"
                style={{
                  background: isDark ? 'rgba(201,169,110,.04)' : `rgba(var(--t-primary-rgb), 0.04)`,
                  border: isDark ? '1px solid rgba(201,169,110,.1)' : `1px solid rgba(var(--t-primary-rgb), 0.1)`,
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--t-primary)' }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span className="text-sm font-semibold" style={{ color: 'var(--t-text)' }}>
                    100% безопасно
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--t-text-subtle)' }}>
                  Оплата только при заезде. Никаких предоплат. Бесплатная отмена за 24 часа до заезда.
                </p>
              </div>
            </div>

            {/* ── RIGHT: Form card ── */}
            <div
              className="rounded-none lg:rounded-2xl overflow-hidden"
              style={{
                background: isDark ? 'rgba(20, 20, 16, 0.85)' : 'var(--t-bg)',
                border: isDark ? '1px solid rgba(201,169,110,.15)' : '1px solid var(--t-border-subtle)',
                borderRadius: isDark ? '0' : 'var(--t-card-radius, 16px)',
                boxShadow: isDark ? 'none' : '0 8px 40px rgba(0,0,0,0.08)',
              }}
            >
              {/* Form header */}
              <div
                className="px-6 sm:px-8 py-5"
                style={{
                  borderBottom: isDark ? '1px solid rgba(201,169,110,.1)' : '1px solid var(--t-border-subtle)',
                }}
              >
                <h3
                  className="text-lg font-semibold"
                  style={{
                    fontFamily: 'var(--t-font-heading)',
                    fontWeight: isDark ? 300 : 600,
                    color: 'var(--t-text)',
                  }}
                >
                  Оформить бронь
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--t-text-subtle)' }}>
                  Заполните форму — администратор свяжется в течение 5 минут
                </p>
              </div>

              <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6 space-y-5">
                {/* Dates */}
                <DateSelector
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onCheckInChange={setCheckIn}
                  onCheckOutChange={setCheckOut}
                  formErrors={formErrors}
                  today={today}
                />

                {/* Room selection */}
                <RoomSelector
                  rooms={displayRooms}
                  selectedRoom={selectedRoom}
                  onSelectRoom={setSelectedRoom}
                  formErrors={formErrors}
                />

                {/* Guests */}
                <GuestCounter
                  adults={adults}
                  children={children}
                  onAdultsChange={setAdults}
                  onChildrenChange={setChildren}
                  maxAdults={selectedRoomData?.capacity_adults || 6}
                  maxChildren={selectedRoomData?.capacity_children || 4}
                />

                {/* Extras */}
                {hasExtras && (
                  <ExtrasSelector
                    extras={hotel.extras}
                    selectedExtras={selectedExtras}
                    onToggleExtra={toggleExtra}
                    onUpdateExtraQuantity={updateExtraQuantity}
                    adults={adults}
                    children={children}
                    stepNumber={extrasStepNumber}
                  />
                )}

                {/* Guest info */}
                <GuestInfoForm
                  firstName={guestFirstName}
                  lastName={guestLastName}
                  phone={guestPhone}
                  email={guestEmail}
                  notes={notes}
                  onFirstNameChange={setGuestFirstName}
                  onLastNameChange={setGuestLastName}
                  onPhoneChange={setGuestPhone}
                  onEmailChange={setGuestEmail}
                  onNotesChange={setNotes}
                  formErrors={formErrors}
                  stepNumber={guestInfoStepNumber}
                />

                {/* ── Total block ── */}
                <div
                  className="pt-5 mt-2"
                  style={{ borderTop: isDark ? '1px solid rgba(201,169,110,.1)' : '1px solid var(--t-border-subtle)' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm" style={{ color: 'var(--t-text-muted)' }}>Итого к оплате</span>
                    <span
                      className="text-2xl font-bold"
                      style={{ color: 'var(--t-primary)', fontFamily: 'var(--t-font-heading)' }}
                    >
                      {calcLoading ? (
                        <IconSpinner className="w-5 h-5" />
                      ) : totalAmount ? (
                        totalAmount
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>

                  {/* Price breakdown (if calculated) */}
                  {priceCalc && !calcLoading && (
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-xs" style={{ color: 'var(--t-text-subtle)' }}>
                        <span>Номер ({priceCalc.nights} ноч.)</span>
                        <span>{formatMoney(priceCalc.room_price)}</span>
                      </div>
                      {priceCalc.extras_breakdown.map((ext, i) => (
                        <div key={i} className="flex justify-between text-xs" style={{ color: 'var(--t-text-subtle)' }}>
                          <span>{ext.name} x{ext.quantity}</span>
                          <span>{formatMoney(ext.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submit error */}
                  {formErrors.submit && (
                    <div
                      className="p-3 rounded-lg mb-4 text-sm"
                      style={{
                        background: isDark ? 'rgba(220,38,38,.1)' : '#FEF2F2',
                        border: isDark ? '1px solid rgba(220,38,38,.2)' : '1px solid #FECACA',
                        color: isDark ? '#FCA5A5' : '#DC2626',
                      }}
                    >
                      {formErrors.submit}
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 text-[14px] font-semibold uppercase tracking-[0.06em] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'var(--t-primary)',
                      color: isDark ? '#0A0A08' : '#fff',
                      borderRadius: isDark ? '0' : 'var(--t-card-radius, 12px)',
                    }}
                  >
                    {submitting ? (
                      <>
                        <IconSpinner className="w-5 h-5" />
                        Создание бронирования...
                      </>
                    ) : (
                      'Подтвердить бронирование'
                    )}
                  </button>

                  <p className="text-[11px] text-center mt-3 leading-relaxed" style={{ color: 'var(--t-text-subtle)' }}>
                    Нажимая кнопку, вы соглашаетесь с условиями бронирования.
                    Оплата производится при заезде.
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Mobile perks (shown below form on mobile) */}
          <div className="lg:hidden mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {perks.slice(0, 3).map((perk) => (
              <div
                key={perk.label}
                className="flex items-center gap-3 p-3"
                style={{
                  background: isDark ? 'rgba(201,169,110,.04)' : `rgba(var(--t-primary-rgb), 0.04)`,
                  border: isDark ? '1px solid rgba(201,169,110,.08)' : '1px solid var(--t-border-subtle)',
                  borderRadius: isDark ? '0' : 'var(--t-card-radius, 12px)',
                }}
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  style={{ color: 'var(--t-primary)' }}
                >
                  {perk.icon}
                </svg>
                <span className="text-xs" style={{ color: 'var(--t-text)' }}>{perk.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile sticky price bar */}
      <MobilePriceBar priceCalc={priceCalc} visible={showMobilePrice} />
    </>
  );
}
