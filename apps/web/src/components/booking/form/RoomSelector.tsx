'use client';

import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/utils/money';
import type { HotelRoom } from '@/lib/api/public-booking';
import { IconUsers, IconChild } from '../icons/booking-icons';
import { ROOM_TYPE_LABELS, AMENITY_LABELS } from '../constants';

interface RoomSelectorProps {
  rooms: HotelRoom[];
  selectedRoom: number | null;
  onSelectRoom: (roomId: number) => void;
  formErrors: Record<string, string>;
}

/**
 * Step 2: Available room radio cards.
 */
export function RoomSelector({
  rooms,
  selectedRoom,
  onSelectRoom,
  formErrors,
}: RoomSelectorProps) {
  return (
    <div className="booking-card p-6">
      <h3
        className="flex items-center gap-2 text-lg font-semibold text-t-text mb-4"
        style={{ fontFamily: 'var(--t-font-heading)' }}
      >
        <span className="w-7 h-7 rounded-full bg-t-primary text-white text-sm flex items-center justify-center font-bold">2</span>
        Выберите номер
      </h3>
      {formErrors.room && <p className="mb-3 text-xs text-red-600">{formErrors.room}</p>}

      <div className="space-y-3">
        {rooms.map((room) => (
          <label
            key={room.id}
            className={cn(
              'flex items-start gap-4 p-4 border-2 cursor-pointer transition-all duration-300',
              selectedRoom === room.id
                ? 'border-t-primary bg-t-primary/5'
                : 'border-t-border-subtle bg-t-surface hover:border-t-primary/40',
            )}
            style={{
              borderRadius: 'var(--t-card-radius)',
              ...(selectedRoom === room.id ? { boxShadow: '0 0 0 1px var(--t-primary)' } : {}),
            }}
          >
            <input
              type="radio"
              name="room"
              value={room.id}
              checked={selectedRoom === room.id}
              onChange={() => onSelectRoom(room.id)}
              className="mt-1 w-4 h-4 border-t-border-subtle"
              style={{ accentColor: 'var(--t-primary)' }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-semibold text-t-text">{room.name}</span>
                  <span
                    className="ml-2 text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--t-primary-light)', color: 'var(--t-primary)' }}
                  >
                    {ROOM_TYPE_LABELS[room.room_type] || room.room_type}
                  </span>
                </div>
                <span className="font-bold text-t-primary whitespace-nowrap">
                  {formatMoney(room.base_price)}
                  <span className="text-xs font-normal text-t-text-subtle">/ночь</span>
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-t-text-muted">
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
                  <span key={a} className="text-t-text-subtle">{AMENITY_LABELS[a] || a}</span>
                ))}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
