'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T, index: number) => ReactNode;
  className?: string;
  sortable?: boolean;
  hideOnMobile?: boolean;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
  rowKey: (item: T) => string | number;
  isLoading?: boolean;
  skeletonRows?: number;
  onSort?: (key: string) => void;
  sortConfig?: SortConfig | null;
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─── Sort icon ──────────────────────────────────────────────────────────────

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction?: 'asc' | 'desc';
}) {
  return (
    <span className="ml-1 inline-flex flex-col leading-none">
      <svg
        width="8"
        height="5"
        viewBox="0 0 8 5"
        className={cn(
          active && direction === 'asc' ? 'text-sardoba-gold' : 'text-gray-300',
        )}
      >
        <path d="M4 0L8 5H0L4 0Z" fill="currentColor" />
      </svg>
      <svg
        width="8"
        height="5"
        viewBox="0 0 8 5"
        className={cn(
          'mt-0.5',
          active && direction === 'desc' ? 'text-sardoba-gold' : 'text-gray-300',
        )}
      >
        <path d="M4 5L0 0H8L4 5Z" fill="currentColor" />
      </svg>
    </span>
  );
}

// ─── Table ──────────────────────────────────────────────────────────────────

export function Table<T>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'Нет данных',
  className,
  rowKey,
  isLoading = false,
  skeletonRows = 5,
  onSort,
  sortConfig,
}: TableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-gray-200', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap',
                  col.className,
                  col.hideOnMobile && 'hidden md:table-cell',
                  col.sortable && 'cursor-pointer select-none hover:text-gray-700',
                )}
                onClick={() => {
                  if (col.sortable && onSort) {
                    onSort(col.key);
                  }
                }}
              >
                <div className="flex items-center">
                  {col.header}
                  {col.sortable && (
                    <SortIcon
                      active={sortConfig?.key === col.key}
                      direction={sortConfig?.key === col.key ? sortConfig.direction : undefined}
                    />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <SkeletonRow key={i} columns={columns.length} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={rowKey(item)}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'border-b border-gray-100 last:border-0',
                  'hover:bg-gray-50 transition-colors',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 whitespace-nowrap',
                      col.className,
                      col.hideOnMobile && 'hidden md:table-cell',
                    )}
                  >
                    {col.render(item, index)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
