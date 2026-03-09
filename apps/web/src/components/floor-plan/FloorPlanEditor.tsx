'use client';

import { useState, useCallback, useMemo } from 'react';
import { FloorPlanCell } from './FloorPlanCell';
import { FloorPlanToolbar } from './FloorPlanToolbar';
import { FloorPlanCompass } from './FloorPlanCompass';
import { FloorPlanRoomPicker } from './FloorPlanRoomPicker';
import type { FloorPlan, FloorPlanCell as CellData, FloorCellType, Room } from '@sardoba/shared';

interface Props {
  plan: FloorPlan;
  rooms: Room[];
  /** Room IDs already placed on OTHER floors (not the current one) */
  otherFloorsRoomIds?: number[];
  onChange: (plan: FloorPlan) => void;
}

export function FloorPlanEditor({ plan, rooms, otherFloorsRoomIds = [], onChange }: Props) {
  const [activeTool, setActiveTool] = useState<FloorCellType>('room');
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [targetCell, setTargetCell] = useState<{ row: number; col: number } | null>(null);

  const cellMap = useMemo(() => {
    const map = new Map<string, CellData>();
    for (const cell of plan.cells) {
      map.set(`${cell.row}-${cell.col}`, cell);
    }
    return map;
  }, [plan.cells]);

  const usedRoomIds = useMemo(() => {
    const currentFloorIds = plan.cells
      .filter((c) => c.roomId)
      .map((c) => c.roomId!);
    return [...new Set([...currentFloorIds, ...otherFloorsRoomIds])];
  }, [plan.cells, otherFloorsRoomIds]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (activeTool === 'room') {
        setTargetCell({ row, col });
        setShowRoomPicker(true);
        return;
      }

      if (activeTool === 'empty') {
        const newCells = plan.cells.filter((c) => !(c.row === row && c.col === col));
        onChange({ ...plan, cells: newCells });
        return;
      }

      // Place structural element
      const newCells = plan.cells.filter((c) => !(c.row === row && c.col === col));
      newCells.push({ row, col, type: activeTool });
      onChange({ ...plan, cells: newCells });
    },
    [activeTool, plan, onChange],
  );

  const handleRoomSelect = useCallback(
    (roomId: number, label: string) => {
      if (!targetCell) return;
      const newCells = plan.cells.filter(
        (c) => !(c.row === targetCell.row && c.col === targetCell.col),
      );
      newCells.push({
        row: targetCell.row,
        col: targetCell.col,
        type: 'room',
        roomId,
        label,
      });
      onChange({ ...plan, cells: newCells });
      setShowRoomPicker(false);
      setTargetCell(null);
    },
    [targetCell, plan, onChange],
  );

  return (
    <div className="space-y-4">
      {/* Toolbar + Compass */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <FloorPlanToolbar activeTool={activeTool} onToolChange={setActiveTool} />
        <FloorPlanCompass
          direction={plan.compass}
          onChange={(dir) => onChange({ ...plan, compass: dir })}
        />
      </div>

      {/* Grid */}
      <div
        className="border border-gray-300 rounded-lg overflow-auto bg-white p-2"
        style={{ maxHeight: '70vh' }}
      >
        <div
          className="grid gap-px bg-gray-200 rounded"
          style={{
            gridTemplateColumns: `repeat(${plan.cols}, minmax(48px, 1fr))`,
            gridTemplateRows: `repeat(${plan.rows}, 48px)`,
          }}
        >
          {Array.from({ length: plan.rows }, (_, row) =>
            Array.from({ length: plan.cols }, (_, col) => {
              const cell = cellMap.get(`${row}-${col}`);
              return (
                <FloorPlanCell
                  key={`${row}-${col}`}
                  cell={cell}
                  editable
                  onClick={() => handleCellClick(row, col)}
                />
              );
            }),
          )}
        </div>
      </div>

      {/* Room picker modal */}
      {showRoomPicker && (
        <FloorPlanRoomPicker
          rooms={rooms}
          usedRoomIds={usedRoomIds}
          onSelect={handleRoomSelect}
          onClose={() => {
            setShowRoomPicker(false);
            setTargetCell(null);
          }}
        />
      )}
    </div>
  );
}
