'use client';

import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/utils/money';
import type { HotelRoom } from '@/lib/api/public-booking';
import { ROOM_TYPE_LABELS } from '../constants';

interface RoomSelectorProps {
  rooms: HotelRoom[];
  selectedRoom: number | null;
  onSelectRoom: (roomId: number) => void;
  formErrors: Record<string, string>;
}

/**
 * Step 2: Room selection as styled select or compact radio list.
 */
export function RoomSelector({
  rooms,
  selectedRoom,
  onSelectRoom,
  formErrors,
}: RoomSelectorProps) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.08em] font-medium mb-2" style={{ color: 'var(--t-text-subtle)' }}>
        Выберите номер
      </label>
      {formErrors.room && <p className="mb-2 text-[11px] text-red-500">{formErrors.room}</p>}

      <select
        value={selectedRoom || ''}
        onChange={(e) => onSelectRoom(Number(e.target.value))}
        className={cn(
          'booking-input w-full cursor-pointer',
          formErrors.room && 'border-red-500',
        )}
      >
        <option value="">— Выберите номер —</option>
        {rooms.map((room) => (
          <option key={room.id} value={room.id}>
            {room.name} ({ROOM_TYPE_LABELS[room.room_type] || room.room_type}) — {formatMoney(room.base_price)}/ночь
          </option>
        ))}
      </select>
    </div>
  );
}
