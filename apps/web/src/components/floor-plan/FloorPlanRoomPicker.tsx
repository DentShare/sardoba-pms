'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { Room } from '@sardoba/shared';

interface Props {
  rooms: Room[];
  usedRoomIds: number[];
  onSelect: (roomId: number, label: string) => void;
  onClose: () => void;
}

export function FloorPlanRoomPicker({ rooms, usedRoomIds, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');

  const filtered = rooms.filter((r) => {
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || String(r.id).includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Выберите номер</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
          </div>
          <input
            type="text"
            placeholder="Поиск номера..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-sardoba-gold focus:border-transparent outline-none"
            autoFocus
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-4">Номера не найдены</p>
          )}
          {filtered.map((room) => {
            const used = usedRoomIds.includes(room.id);
            return (
              <button
                key={room.id}
                disabled={used}
                onClick={() => onSelect(room.id, room.name)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                  used
                    ? 'opacity-40 cursor-not-allowed bg-gray-50'
                    : 'hover:bg-blue-50 cursor-pointer',
                )}
              >
                <span className="font-medium text-gray-900">{room.name}</span>
                <span className="flex items-center gap-2">
                  {room.floor != null && (
                    <span className="text-xs text-gray-400">этаж {room.floor}</span>
                  )}
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    room.status === 'active' ? 'bg-green-100 text-green-700' :
                    room.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500',
                  )}>
                    {room.roomType}
                  </span>
                  {used && <span className="text-xs text-red-400 font-medium">на плане</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
