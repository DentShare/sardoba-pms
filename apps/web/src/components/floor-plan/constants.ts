import type { FloorCellType } from '@sardoba/shared';

export interface CellTypeConfig {
  label: string;
  labelRu: string;
  color: string;
  textColor: string;
}

export const CELL_TYPE_CONFIG: Record<FloorCellType, CellTypeConfig> = {
  empty:     { label: 'empty',     labelRu: '',          color: 'bg-gray-50',    textColor: 'text-gray-300' },
  room:      { label: 'room',      labelRu: 'Номер',    color: 'bg-blue-100',   textColor: 'text-blue-800' },
  stairs:    { label: 'stairs',    labelRu: 'Лестница',  color: 'bg-amber-100',  textColor: 'text-amber-800' },
  elevator:  { label: 'elevator',  labelRu: 'Лифт',     color: 'bg-purple-100', textColor: 'text-purple-800' },
  corridor:  { label: 'corridor',  labelRu: 'Коридор',  color: 'bg-gray-200',   textColor: 'text-gray-600' },
  reception: { label: 'reception', labelRu: 'Ресепшн',  color: 'bg-green-100',  textColor: 'text-green-800' },
  wall:      { label: 'wall',      labelRu: 'Стена',    color: 'bg-gray-700',   textColor: 'text-white' },
  restroom:  { label: 'restroom',  labelRu: 'Санузел',  color: 'bg-cyan-100',   textColor: 'text-cyan-800' },
  storage:   { label: 'storage',   labelRu: 'Подсобка', color: 'bg-orange-100', textColor: 'text-orange-800' },
  other:     { label: 'other',     labelRu: 'Другое',   color: 'bg-pink-100',   textColor: 'text-pink-800' },
};

export const TOOL_ORDER: FloorCellType[] = [
  'room', 'corridor', 'stairs', 'elevator', 'reception',
  'wall', 'restroom', 'storage', 'other', 'empty',
];
