'use client';

import { useMemo } from 'react';
import { FloorPlanCell } from './FloorPlanCell';
import { FloorPlanCompass } from './FloorPlanCompass';
import type { FloorPlan, FloorPlanCell as CellData } from '@sardoba/shared';

interface Props {
  plan: FloorPlan;
}

export function FloorPlanViewer({ plan }: Props) {
  const cellMap = useMemo(() => {
    const map = new Map<string, CellData>();
    for (const cell of plan.cells) {
      map.set(`${cell.row}-${cell.col}`, cell);
    }
    return map;
  }, [plan.cells]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {plan.cells.filter((c) => c.type === 'room').length} номеров на плане
        </span>
        <FloorPlanCompass direction={plan.compass} readOnly />
      </div>

      <div
        className="border border-gray-200 rounded-lg overflow-auto bg-white p-2"
        style={{ maxHeight: '60vh' }}
      >
        <div
          className="grid gap-px bg-gray-100 rounded"
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
                />
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
