'use client';

import { useState, useCallback } from 'react';
import { addDays, format } from 'date-fns';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GuestSearch, type NewGuestData } from '@/components/forms/GuestSearch';
import { useCreateBooking } from '@/lib/hooks/use-bookings';
import { useCreateGuest } from '@/lib/hooks/use-guests';
import { normalizePhone } from '@/lib/utils/phone';

interface QuickBookingModalProps {
  open: boolean;
  onClose: () => void;
  roomId: number;
  roomNumber?: string;
  date: string;
  propertyId: number;
}

export function QuickBookingModal({
  open,
  onClose,
  roomId,
  roomNumber,
  date,
  propertyId,
}: QuickBookingModalProps) {
  const [guestId, setGuestId] = useState<number | null>(null);
  const [guestLabel, setGuestLabel] = useState('');
  const [checkOut, setCheckOut] = useState(
    format(addDays(new Date(date), 1), 'yyyy-MM-dd'),
  );
  const [adults, setAdults] = useState(2);
  const [notes, setNotes] = useState('');

  const createBooking = useCreateBooking();
  const createGuest = useCreateGuest();

  const handleNewGuest = useCallback(
    async (guest: NewGuestData) => {
      const phone = normalizePhone(guest.phone);
      if (!phone) {
        toast.error('Введите корректный номер телефона (+998XXXXXXXXX)');
        return;
      }
      try {
        const created = await createGuest.mutateAsync({
          first_name: guest.first_name,
          last_name: guest.last_name,
          phone,
        });
        const fullName = `${created.firstName} ${created.lastName}`;
        setGuestId(created.id);
        setGuestLabel(fullName);
      } catch {
        // Error handled by the mutation hook
      }
    },
    [createGuest],
  );

  const handleSubmit = useCallback(async () => {
    if (!guestId) {
      toast.error('Выберите или создайте гостя');
      return;
    }

    try {
      await createBooking.mutateAsync({
        property_id: propertyId,
        room_id: roomId,
        guest_id: guestId,
        check_in: date,
        check_out: checkOut,
        adults,
        source: 'direct',
        notes: notes || undefined,
      });
      onClose();
    } catch {
      // Error handled by the mutation hook
    }
  }, [guestId, propertyId, roomId, date, checkOut, adults, notes, createBooking, onClose]);

  const isBusy = createBooking.isPending || createGuest.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Быстрая бронь"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isBusy}
            disabled={!guestId}
          >
            Создать
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg text-sm">
          <div>
            <span className="text-gray-500">Заезд:</span>
            <span className="ml-2 font-medium">{date}</span>
          </div>
          <div>
            <span className="text-gray-500">Комната:</span>
            <span className="ml-2 font-medium">{roomNumber ?? `#${roomId}`}</span>
          </div>
        </div>

        <GuestSearch
          value={guestLabel}
          onSelect={(id, name) => {
            setGuestId(id);
            setGuestLabel(name);
          }}
          onNewGuest={handleNewGuest}
          propertyId={propertyId}
        />

        {guestId && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span>Гость: <strong>{guestLabel}</strong></span>
            <button
              onClick={() => { setGuestId(null); setGuestLabel(''); }}
              className="ml-auto text-emerald-500 hover:text-emerald-700 transition-colors"
              title="Сменить гостя"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        )}

        <Input
          label="Дата выезда"
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          min={date}
          required
        />

        <Input
          label="Взрослых"
          type="number"
          min={1}
          max={10}
          value={adults}
          onChange={(e) => setAdults(Number(e.target.value))}
        />

        <Input
          label="Примечание"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Особые пожелания..."
        />
      </div>
    </Modal>
  );
}
