'use client';

import { cn } from '@/lib/cn';
import { CELL_TYPE_CONFIG } from './constants';
import type { FloorPlanCell as CellData } from '@sardoba/shared';

export type RoomAvailability = 'free' | 'occupied' | 'partial' | 'blocked';

const AVAILABILITY_STYLES: Record<RoomAvailability, { bg: string; text: string; ring: string }> = {
  free:     { bg: 'bg-emerald-100', text: 'text-emerald-800', ring: 'ring-emerald-300' },
  occupied: { bg: 'bg-red-100',     text: 'text-red-800',     ring: 'ring-red-300' },
  partial:  { bg: 'bg-amber-100',   text: 'text-amber-800',   ring: 'ring-amber-300' },
  blocked:  { bg: 'bg-gray-300',    text: 'text-gray-600',    ring: 'ring-gray-400' },
};

interface Props {
  cell?: CellData;
  editable?: boolean;
  onClick?: () => void;
  highlight?: boolean;
  availability?: RoomAvailability;
  guestName?: string;
}

export function FloorPlanCell({ cell, editable, onClick, highlight, availability, guestName }: Props) {
  const type = cell?.type ?? 'empty';
  const config = CELL_TYPE_CONFIG[type];

  const isRoom = type === 'room';
  const avail = isRoom && availability ? AVAILABILITY_STYLES[availability] : null;

  const tooltipParts: string[] = [];
  if (cell?.label) tooltipParts.push(cell.label);
  if (availability === 'occupied' && guestName) tooltipParts.push(guestName);
  else if (availability === 'free') tooltipParts.push('Свободен');
  else if (availability === 'partial') tooltipParts.push('Частично занят');
  else if (availability === 'blocked') tooltipParts.push('Заблокирован');

  return (
    <div
      className={cn(
        'flex items-center justify-center text-[10px] font-medium select-none leading-tight text-center transition-colors',
        avail ? avail.bg : config.color,
        avail ? avail.text : config.textColor,
        editable && 'cursor-pointer hover:ring-2 hover:ring-sardoba-gold hover:z-10',
        highlight && 'ring-2 ring-blue-500 z-10',
        !editable && isRoom && onClick && 'cursor-pointer hover:ring-2 hover:ring-sardoba-blue/50 hover:z-10',
        availability && isRoom && 'ring-1 ' + (avail?.ring ?? ''),
      )}
      style={{
        gridColumn: cell?.colSpan ? `span ${cell.colSpan}` : undefined,
        gridRow: cell?.rowSpan ? `span ${cell.rowSpan}` : undefined,
        minHeight: '48px',
      }}
      onClick={onClick}
      title={tooltipParts.join(' — ') || config.labelRu}
    >
      {cell?.label || (type !== 'empty' ? config.labelRu : '')}
    </div>
  );
}
