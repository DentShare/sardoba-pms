'use client';

import { useState, useEffect, useCallback } from 'react';
import { addDays, format } from 'date-fns';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { GuestSearch, type NewGuestData } from './GuestSearch';
import { useCreateBooking, useConfirmBooking, useCheckinBooking } from '@/lib/hooks/use-bookings';
import { useRooms } from '@/lib/hooks/use-rooms';
import { useGuest } from '@/lib/hooks/use-guests';
import { calculateRate } from '@/lib/api/rates';
import { formatMoney } from '@/lib/utils/money';
import { getNights } from '@/lib/utils/dates';
import type { RateCalculation } from '@sardoba/shared';

const SOURCE_OPTIONS = [
  { value: 'direct', label: 'Прямое бронирование' },
  { value: 'booking_com', label: 'Booking.com' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'expedia', label: 'Expedia' },
  { value: 'phone', label: 'Телефон' },
  { value: 'other', label: 'Другое' },
];

interface BookingFormProps {
  open: boolean;
  onClose: () => void;
  propertyId: number;
  /** Pre-fill room and date from calendar */
  defaultRoomId?: number;
  defaultCheckIn?: string;
  /** Walk-in mode: source='direct', auto confirm+checkin after creation */
  walkIn?: boolean;
}

export function BookingForm({
  open,
  onClose,
  propertyId,
  defaultRoomId,
  defaultCheckIn,
  walkIn,
}: BookingFormProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const [guestId, setGuestId] = useState<number | null>(null);
  const [newGuest, setNewGuest] = useState<NewGuestData | null>(null);
  const [guestLabel, setGuestLabel] = useState('');
  const [roomId, setRoomId] = useState(defaultRoomId?.toString() || '');
  const [checkIn, setCheckIn] = useState(defaultCheckIn || today);
  const [checkOut, setCheckOut] = useState(
    defaultCheckIn
      ? format(addDays(new Date(defaultCheckIn), 1), 'yyyy-MM-dd')
      : tomorrow,
  );
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [source, setSource] = useState('direct');
  const [notes, setNotes] = useState('');
  const [rateCalc, setRateCalc] = useState<RateCalculation | null>(null);

  const { data: rooms } = useRooms(propertyId || null);
  const { data: selectedGuest } = useGuest(guestId);
  const createBooking = useCreateBooking();
  const confirmMut = useConfirmBooking();
  const checkinMut = useCheckinBooking();

  const nights = getNights(checkIn, checkOut);

  // Calculate rate when room / dates change
  useEffect(() => {
    if (!roomId || !checkIn || !checkOut || nights <= 0) {
      setRateCalc(null);
      return;
    }

    let cancelled = false;
    calculateRate(propertyId, Number(roomId), checkIn, checkOut)
      .then((calc) => {
        if (!cancelled) setRateCalc(calc);
      })
      .catch(() => {
        if (!cancelled) setRateCalc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId, roomId, checkIn, checkOut, nights]);

  const roomOptions = (rooms || []).map((r) => ({
    value: r.id.toString(),
    label: `${r.name} (${r.roomType})`,
  }));

  const handleSubmit = useCallback(async () => {
    if (!guestId && !newGuest) {
      toast.error('Выберите или создайте гостя');
      return;
    }
    if (!roomId) {
      toast.error('Выберите номер');
      return;
    }
    if (nights <= 0) {
      toast.error('Некорректные даты');
      return;
    }

    try {
      const booking = await createBooking.mutateAsync({
        property_id: propertyId,
        room_id: Number(roomId),
        ...(guestId
          ? { guest_id: guestId }
          : { guest: newGuest! }),
        check_in: checkIn,
        check_out: checkOut,
        adults,
        children: children > 0 ? children : undefined,
        source: walkIn ? 'direct' : source,
        notes: notes || undefined,
      });

      if (walkIn && booking) {
        try {
          await confirmMut.mutateAsync(booking.id);
          await checkinMut.mutateAsync(booking.id);
          toast.success('Гость заселён');
        } catch {
          toast.error('Бронирование создано, но автозаселение не удалось. Заселите вручную.');
        }
      }

      onClose();
    } catch {
      // Error handled by mutation
    }
  }, [
    guestId, newGuest, roomId, checkIn, checkOut, adults, children, source, notes,
    propertyId, createBooking, onClose, nights, walkIn, confirmMut, checkinMut,
  ]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={walkIn ? 'Walk-in заселение' : 'Новое бронирование'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            loading={createBooking.isPending || confirmMut.isPending || checkinMut.isPending}
          >
            {walkIn ? 'Создать и заселить' : 'Создать бронирование'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <GuestSearch
          value={guestLabel}
          onSelect={(id, name) => {
            setGuestId(id);
            setNewGuest(null);
            setGuestLabel(name);
          }}
          onNewGuest={(guest) => {
            setNewGuest(guest);
            setGuestId(null);
            setGuestLabel(`${guest.first_name} ${guest.last_name}`);
          }}
          propertyId={propertyId}
        />

        {selectedGuest?.isBlacklisted && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            &#9888; Внимание: этот гость находится в чёрном списке. Причина: {selectedGuest.blacklistReason || 'не указана'}
          </div>
        )}

        <Select
          label="Номер"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          options={roomOptions}
          placeholder="Выберите номер"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Заезд"
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            min={today}
            required
          />
          <Input
            label="Выезд"
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            min={checkIn}
            required
          />
        </div>

        {nights > 0 && (
          <p className="text-sm text-gray-500">
            {nights} {nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей'}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Взрослых"
            type="number"
            min={1}
            max={10}
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
          />
          <Input
            label="Детей"
            type="number"
            min={0}
            max={10}
            value={children}
            onChange={(e) => setChildren(Number(e.target.value))}
          />
        </div>

        {!walkIn && (
          <Select
            label="Источник"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            options={SOURCE_OPTIONS}
          />
        )}

        <Input
          label="Примечание"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Особые пожелания..."
        />

        {/* Rate Preview */}
        {rateCalc && (
          <div className="p-4 bg-sardoba-sand-light rounded-lg">
            <div className="text-sm text-gray-600 mb-2">Расчёт стоимости</div>
            <div className="flex items-center justify-between">
              <span className="text-sm">
                Тариф: {rateCalc.rateApplied}
              </span>
              <span className="text-sm">
                {formatMoney(rateCalc.pricePerNight)} / ночь
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-sardoba-sand-dark/30">
              <span className="font-semibold">Итого:</span>
              <span className="font-bold text-lg text-sardoba-blue">
                {formatMoney(rateCalc.total)}
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
