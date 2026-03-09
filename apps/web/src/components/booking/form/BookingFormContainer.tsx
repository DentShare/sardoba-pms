'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getNights } from '@/lib/utils/dates';
import {
  publicBookingApi,
  type HotelPublicInfo,
  type HotelRoom,
  type PriceCalculation,
} from '@/lib/api/public-booking';
import { IconSpinner } from '../icons/booking-icons';
import { DateSelector } from './DateSelector';
import { RoomSelector } from './RoomSelector';
import { GuestCounter } from './GuestCounter';
import { ExtrasSelector } from './ExtrasSelector';
import { GuestInfoForm } from './GuestInfoForm';
import { PriceSummary } from './PriceSummary';
import { MobilePriceBar } from './MobilePriceBar';

interface BookingFormContainerProps {
  hotel: HotelPublicInfo;
  slug: string;
}

/**
 * The main booking form container.
 * Holds ALL booking state and logic extracted from the monolith page.
 * Renders DateSelector, RoomSelector, GuestCounter, ExtrasSelector,
 * GuestInfoForm, PriceSummary, and MobilePriceBar.
 */
export function BookingFormContainer({ hotel, slug }: BookingFormContainerProps) {
  const router = useRouter();

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

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <section id="booking" className="py-16 sm:py-20 bg-t-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-2xl sm:text-3xl font-bold text-t-primary mb-3"
              style={{ fontFamily: 'var(--t-font-heading)' }}
            >
              Забронировать номер
            </h2>
            <p className="text-t-text-muted max-w-lg mx-auto">
              Заполните форму ниже, и мы подтвердим ваше бронирование
            </p>
          </div>

          {/* Booking perks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-t-border-subtle bg-t-surface">
              <svg className="w-5 h-5 text-t-primary shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span className="text-sm text-t-text">Бесплатная отмена за 24 часа</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-t-border-subtle bg-t-surface">
              <svg className="w-5 h-5 text-t-primary shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
              <span className="text-sm text-t-text">Мгновенное подтверждение</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-t-border-subtle bg-t-surface">
              <svg className="w-5 h-5 text-t-primary shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <span className="text-sm text-t-text">Безопасная оплата</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="lg:grid lg:grid-cols-3 lg:gap-8">
            {/* ── Left: Form fields (2 columns on lg) ── */}
            <div className="lg:col-span-2 space-y-8">
              {/* Step 1: Dates */}
              <DateSelector
                checkIn={checkIn}
                checkOut={checkOut}
                onCheckInChange={setCheckIn}
                onCheckOutChange={setCheckOut}
                formErrors={formErrors}
                today={today}
              />

              {/* Step 2: Room selection */}
              <RoomSelector
                rooms={displayRooms}
                selectedRoom={selectedRoom}
                onSelectRoom={setSelectedRoom}
                formErrors={formErrors}
              />

              {/* Step 3: Guests */}
              <GuestCounter
                adults={adults}
                children={children}
                onAdultsChange={setAdults}
                onChildrenChange={setChildren}
                maxAdults={selectedRoomData?.capacity_adults || 6}
                maxChildren={selectedRoomData?.capacity_children || 4}
              />

              {/* Step 4: Extras */}
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

              {/* Step 5: Guest info */}
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

              {/* Submit error */}
              {formErrors.submit && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {formErrors.submit}
                </div>
              )}

              {/* Submit (mobile only, desktop submit is in sidebar) */}
              <div className="lg:hidden">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full booking-btn-primary text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <PriceSummary
              selectedRoom={selectedRoomData}
              nights={nights}
              adults={adults}
              children={children}
              checkIn={checkIn}
              checkOut={checkOut}
              priceCalc={priceCalc}
              calcLoading={calcLoading}
              submitting={submitting}
              formErrors={formErrors}
            />
          </form>
        </div>
      </section>

      {/* Mobile sticky price bar */}
      <MobilePriceBar priceCalc={priceCalc} visible={showMobilePrice} />
    </>
  );
}
