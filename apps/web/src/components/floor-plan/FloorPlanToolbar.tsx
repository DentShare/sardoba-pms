'use client';

import { cn } from '@/lib/cn';
import { CELL_TYPE_CONFIG, TOOL_ORDER } from './constants';
import type { FloorCellType } from '@sardoba/shared';

interface Props {
  activeTool: FloorCellType;
  onToolChange: (tool: FloorCellType) => void;
}

export function FloorPlanToolbar({ activeTool, onToolChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TOOL_ORDER.map((tool) => {
        const config = CELL_TYPE_CONFIG[tool];
        const isEraser = tool === 'empty';
        const isActive = activeTool === tool;

        return (
          <button
            key={tool}
            onClick={() => onToolChange(tool)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              isActive
                ? 'border-sardoba-gold bg-sardoba-gold/10 text-sardoba-gold ring-1 ring-sardoba-gold'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
            )}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  'w-3 h-3 rounded-sm inline-block',
                  isEraser ? 'bg-white border border-gray-300' : config.color,
                )}
              />
              {isEraser ? 'Ластик' : config.labelRu}
            </span>
          </button>
        );
      })}
    </div>
  );
}
