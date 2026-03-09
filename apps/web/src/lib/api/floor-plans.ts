import { api } from '@/lib/api';
import type { FloorPlansConfig, FloorPlan, FloorPlanCell } from '@sardoba/shared';

interface FloorPlanCellRaw {
  row: number;
  col: number;
  type: FloorPlanCell['type'];
  room_id?: number;
  roomId?: number;
  label?: string;
  col_span?: number;
  colSpan?: number;
  row_span?: number;
  rowSpan?: number;
}

interface FloorPlanRaw {
  floor: number;
  name: string;
  rows: number;
  cols: number;
  compass: FloorPlan['compass'];
  cells: FloorPlanCellRaw[];
  updated_at?: string;
  updatedAt?: string;
}

interface FloorPlansConfigRaw {
  version: 1;
  floors: FloorPlanRaw[];
}

function normalizeResponse(raw: FloorPlansConfigRaw): FloorPlansConfig {
  return {
    version: raw.version,
    floors: (raw.floors || []).map((f) => ({
      floor: f.floor,
      name: f.name,
      rows: f.rows,
      cols: f.cols,
      compass: f.compass,
      updatedAt: f.updatedAt ?? f.updated_at ?? new Date().toISOString(),
      cells: (f.cells || []).map((c) => ({
        row: c.row,
        col: c.col,
        type: c.type,
        roomId: c.roomId ?? c.room_id,
        label: c.label,
        colSpan: c.colSpan ?? c.col_span,
        rowSpan: c.rowSpan ?? c.row_span,
      })),
    })),
  };
}

export async function getFloorPlans(): Promise<FloorPlansConfig> {
  try {
    const { data } = await api.get<FloorPlansConfigRaw>('/properties/floor-plans');
    return normalizeResponse(data);
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      return { version: 1, floors: [] };
    }
    throw err;
  }
}

export async function saveFloorPlans(config: FloorPlansConfig): Promise<FloorPlansConfig> {
  const payload = {
    version: config.version,
    floors: config.floors.map((f) => {
      const floor: Record<string, unknown> = {
        floor: f.floor,
        name: f.name,
        rows: f.rows,
        cols: f.cols,
        compass: f.compass,
        cells: f.cells.map((c) => {
          const cell: Record<string, unknown> = {
            row: c.row,
            col: c.col,
            type: c.type,
          };
          if (c.roomId != null) cell.room_id = c.roomId;
          if (c.label != null) cell.label = c.label;
          if (c.colSpan != null && c.colSpan > 1) cell.col_span = c.colSpan;
          if (c.rowSpan != null && c.rowSpan > 1) cell.row_span = c.rowSpan;
          return cell;
        }),
      };
      if (f.updatedAt) floor.updated_at = f.updatedAt;
      return floor;
    }),
  };
  const { data } = await api.put<FloorPlansConfigRaw>('/properties/floor-plans', payload);
  return normalizeResponse(data);
}
