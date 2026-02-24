'use client';

import { useState, useCallback } from 'react';
import { addDays, format } from 'date-fns';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GuestSearch } from '@/components/forms/GuestSearch';
import { useCreateBooking } from '@/lib/hooks/use-bookings';

interface QuickBookingModalProps {
  open: boolean;
  onClose: () => void;
  roomId: number;
  date: string;
  propertyId: number;
}

export function QuickBookingModal({
  open,
  onClose,
  roomId,
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

  const handleSubmit = useCallback(async () => {
    if (!guestId) {
      toast.error('Выберите гостя');
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
        total_amount: 0,
        notes: notes || undefined,
      });
      onClose();
    } catch {
      // Error handled by the mutation hook
    }
  }, [guestId, propertyId, roomId, date, checkOut, adults, notes, createBooking, onClose]);

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
            loading={createBooking.isPending}
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
            <span className="ml-2 font-medium">#{roomId}</span>
          </div>
        </div>

        <GuestSearch
          value={guestLabel}
          onSelect={(id, name) => {
            setGuestId(id);
            setGuestLabel(name);
          }}
          propertyId={propertyId}
        />

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
