'use client';

import type { CompassDirection } from '@sardoba/shared';

const DIRECTIONS: CompassDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const LABELS: Record<CompassDirection, string> = {
  N: 'С', NE: 'СВ', E: 'В', SE: 'ЮВ', S: 'Ю', SW: 'ЮЗ', W: 'З', NW: 'СЗ',
};
const ROTATION: Record<CompassDirection, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};

interface Props {
  direction: CompassDirection;
  onChange?: (dir: CompassDirection) => void;
  readOnly?: boolean;
}

export function FloorPlanCompass({ direction, onChange, readOnly }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Север ↑</span>
      <div
        className="w-8 h-8 flex items-center justify-center transition-transform"
        style={{ transform: `rotate(${ROTATION[direction]}deg)` }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <polygon points="12,2 16,14 12,11 8,14" fill="#EF4444" />
          <polygon points="12,22 8,10 12,13 16,10" fill="#94A3B8" />
        </svg>
      </div>
      {!readOnly && onChange && (
        <select
          value={direction}
          onChange={(e) => onChange(e.target.value as CompassDirection)}
          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
        >
          {DIRECTIONS.map((d) => (
            <option key={d} value={d}>
              {LABELS[d]} ({d})
            </option>
          ))}
        </select>
      )}
      {readOnly && (
        <span className="text-xs font-medium text-gray-700">{LABELS[direction]}</span>
      )}
    </div>
  );
}
