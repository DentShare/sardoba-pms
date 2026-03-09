'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  format,
  parseISO,
  isWithinInterval,
  startOfDay,
  addDays,
  isSameDay,
  differenceInDays,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import { FloorPlanCell, type RoomAvailability } from './FloorPlanCell';
import { FloorPlanCompass } from './FloorPlanCompass';
import { useFloorPlans } from '@/lib/hooks/use-floor-plans';
import { useCalendar } from '@/lib/hooks/use-calendar';
import { useBookingStore } from '@/lib/store/use-booking-store';
import { PageSpinner } from '@/components/ui/Spinner';
import { QuickBookingModal } from '@/components/calendar/QuickBookingModal';
import type {
  FloorPlan,
  FloorPlanCell as CellData,
  CalendarRoom,
} from '@sardoba/shared';

interface RoomStatus {
  availability: RoomAvailability;
  guestName?: string;
  bookingCount: number;
}

function computeRoomStatuses(
  rooms: CalendarRoom[],
  focusFrom: Date,
  focusTo: Date,
): Map<number, RoomStatus> {
  const map = new Map<number, RoomStatus>();
  const totalDays = Math.max(1, differenceInDays(focusTo, focusFrom));

  for (const room of rooms) {
    let occupiedDays = 0;
    let blockedDays = 0;
    let lastGuestName = '';
    let bookingCount = 0;

    for (let d = 0; d < totalDays; d++) {
      const day = startOfDay(addDays(focusFrom, d));

      const hasBlock = room.blocks.some((block) => {
        const from = startOfDay(parseISO(block.dateFrom));
        const to = startOfDay(parseISO(block.dateTo));
        return isWithinInterval(day, { start: from, end: to });
      });

      if (hasBlock) {
        blockedDays++;
        continue;
      }

      const activeBooking = room.bookings.find((b) => {
        if (b.status === 'cancelled' || b.status === 'no_show') return false;
        const checkIn = startOfDay(parseISO(b.checkIn));
        const checkOut = startOfDay(parseISO(b.checkOut));
        return day >= checkIn && day < checkOut;
      });

      if (activeBooking) {
        occupiedDays++;
        lastGuestName = activeBooking.guestName;
        bookingCount++;
      }
    }

    let availability: RoomAvailability;
    if (blockedDays === totalDays) {
      availability = 'blocked';
    } else if (occupiedDays === 0 && blockedDays === 0) {
      availability = 'free';
    } else if (occupiedDays + blockedDays >= totalDays) {
      availability = 'occupied';
    } else {
      availability = 'partial';
    }

    map.set(room.id, {
      availability,
      guestName: lastGuestName || undefined,
      bookingCount,
    });
  }

  return map;
}

interface FloorPlanWithAvailabilityProps {
  plan: FloorPlan;
  roomStatuses: Map<number, RoomStatus>;
  onRoomClick?: (roomId: number, roomLabel?: string) => void;
}

function FloorPlanWithAvailability({
  plan,
  roomStatuses,
  onRoomClick,
}: FloorPlanWithAvailabilityProps) {
  const cellMap = useMemo(() => {
    const map = new Map<string, CellData>();
    for (const cell of plan.cells) {
      map.set(`${cell.row}-${cell.col}`, cell);
    }
    return map;
  }, [plan.cells]);

  const stats = useMemo(() => {
    const roomCells = plan.cells.filter((c) => c.type === 'room' && c.roomId);
    let free = 0;
    let occupied = 0;
    let partial = 0;
    let blocked = 0;
    for (const cell of roomCells) {
      const status = roomStatuses.get(cell.roomId!);
      if (!status || status.availability === 'free') free++;
      else if (status.availability === 'occupied') occupied++;
      else if (status.availability === 'partial') partial++;
      else if (status.availability === 'blocked') blocked++;
    }
    return { free, occupied, partial, blocked, total: roomCells.length };
  }, [plan.cells, roomStatuses]);

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-emerald-100 ring-1 ring-emerald-300" />
            <span className="text-gray-600">Свободно: <strong className="text-emerald-700">{stats.free}</strong></span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-100 ring-1 ring-red-300" />
            <span className="text-gray-600">Занято: <strong className="text-red-700">{stats.occupied}</strong></span>
          </span>
          {stats.partial > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-amber-100 ring-1 ring-amber-300" />
              <span className="text-gray-600">Частично: <strong className="text-amber-700">{stats.partial}</strong></span>
            </span>
          )}
          {stats.blocked > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-gray-300 ring-1 ring-gray-400" />
              <span className="text-gray-600">Заблок.: <strong className="text-gray-700">{stats.blocked}</strong></span>
            </span>
          )}
        </div>
        <FloorPlanCompass direction={plan.compass} readOnly />
      </div>

      {/* Grid */}
      <div
        className="border border-gray-200 rounded-lg overflow-auto bg-white p-2"
        style={{ maxHeight: '65vh' }}
      >
        <div
          className="grid gap-px bg-gray-100 rounded"
          style={{
            gridTemplateColumns: `repeat(${plan.cols}, minmax(56px, 1fr))`,
            gridTemplateRows: `repeat(${plan.rows}, 56px)`,
          }}
        >
          {Array.from({ length: plan.rows }, (_, row) =>
            Array.from({ length: plan.cols }, (_, col) => {
              const cell = cellMap.get(`${row}-${col}`);
              const roomId = cell?.roomId;
              const status = roomId ? roomStatuses.get(roomId) : undefined;

              return (
                <FloorPlanCell
                  key={`${row}-${col}`}
                  cell={cell}
                  availability={status?.availability}
                  guestName={status?.guestName}
                  onClick={
                    roomId && onRoomClick
                      ? () => onRoomClick(roomId, cell?.label)
                      : undefined
                  }
                />
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}

interface FloorPlanAvailabilityViewProps {
  propertyId: number;
}

export function FloorPlanAvailabilityView({
  propertyId,
}: FloorPlanAvailabilityViewProps) {
  const { focusDate, focusDateEnd, selectBooking } = useBookingStore();
  const { data: floorPlansConfig, isLoading: floorPlansLoading } =
    useFloorPlans();

  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [quickBooking, setQuickBooking] = useState<{
    roomId: number;
    roomLabel?: string;
    date: string;
  } | null>(null);

  const effectiveFrom = startOfDay(focusDate);
  const effectiveTo = focusDateEnd
    ? startOfDay(focusDateEnd)
    : addDays(effectiveFrom, 1);

  const dateFrom = format(effectiveFrom, 'yyyy-MM-dd');
  const dateTo = format(effectiveTo, 'yyyy-MM-dd');

  const { data: calendarData, isLoading: calendarLoading } = useCalendar(
    propertyId,
    dateFrom,
    dateTo,
  );

  // Auto-select first floor
  const floors = floorPlansConfig?.floors ?? [];
  if (floors.length > 0 && selectedFloor === null && !floorPlansLoading) {
    setSelectedFloor(floors[0].floor);
  }

  const currentPlan = floors.find((f) => f.floor === selectedFloor);

  const roomStatuses = useMemo(() => {
    if (!calendarData?.rooms) return new Map<number, RoomStatus>();
    return computeRoomStatuses(
      calendarData.rooms,
      effectiveFrom,
      effectiveTo,
    );
  }, [calendarData, effectiveFrom, effectiveTo]);

  const periodLabel = useMemo(() => {
    if (!focusDateEnd || isSameDay(focusDate, focusDateEnd)) {
      return format(focusDate, 'd MMMM yyyy', { locale: ru });
    }
    const from = format(focusDate, 'd MMM', { locale: ru });
    const to = format(focusDateEnd, 'd MMM yyyy', { locale: ru });
    return `${from} — ${to}`;
  }, [focusDate, focusDateEnd]);

  const handleRoomClick = useCallback(
    (roomId: number, roomLabel?: string) => {
      const status = roomStatuses.get(roomId);
      const room = calendarData?.rooms.find((r) => r.id === roomId);

      if (status?.availability === 'free' || status?.availability === 'partial') {
        setQuickBooking({
          roomId,
          roomLabel,
          date: dateFrom,
        });
        return;
      }

      if (!status || status.availability === undefined) {
        setQuickBooking({
          roomId,
          roomLabel,
          date: dateFrom,
        });
        return;
      }

      if (room && room.bookings.length > 0) {
        const active = room.bookings.find(
          (b) => b.status !== 'cancelled' && b.status !== 'no_show',
        );
        if (active) selectBooking(active.id);
      }
    },
    [calendarData, roomStatuses, selectBooking, dateFrom],
  );

  if (floorPlansLoading || calendarLoading) {
    return <PageSpinner />;
  }

  if (floors.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <div className="text-4xl mb-3">🏗️</div>
        <p className="text-gray-500 mb-2">Планы этажей не настроены</p>
        <p className="text-sm text-gray-400">
          Перейдите в Настройки → План этажей, чтобы создать планы
        </p>
      </div>
    );
  }

  const totalRooms = calendarData?.rooms.length ?? 0;
  const freeRooms = Array.from(roomStatuses.values()).filter(
    (s) => s.availability === 'free',
  ).length;
  const occupancyPercent =
    totalRooms > 0
      ? Math.round(((totalRooms - freeRooms) / totalRooms) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Period label & general stats */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">{periodLabel}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Загрузка: {occupancyPercent}% ({totalRooms - freeRooms} из {totalRooms} номеров)
          </p>
        </div>
      </div>

      {/* Floor tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {floors.map((f) => (
          <button
            key={f.floor}
            onClick={() => setSelectedFloor(f.floor)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              selectedFloor === f.floor
                ? 'bg-sardoba-blue text-white border-sardoba-blue'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
            )}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Floor plan */}
      {currentPlan && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentPlan.name}
            </h2>
            <span className="text-xs text-gray-400">
              {currentPlan.rows} &times; {currentPlan.cols} сетка
            </span>
          </div>
          <FloorPlanWithAvailability
            plan={currentPlan}
            roomStatuses={roomStatuses}
            onRoomClick={handleRoomClick}
          />
        </div>
      )}

      {quickBooking && (
        <QuickBookingModal
          open={true}
          onClose={() => setQuickBooking(null)}
          roomId={quickBooking.roomId}
          roomNumber={quickBooking.roomLabel}
          date={quickBooking.date}
          propertyId={propertyId}
        />
      )}
    </div>
  );
}
