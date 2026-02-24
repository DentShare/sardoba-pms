'use client';

import { cn } from '@/lib/cn';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface PaginationProps {
  /** Can pass PaginatedResponse.meta directly */
  meta?: PaginationMeta;
  /** Or pass individual page/totalPages */
  page?: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  meta,
  page: pageProp,
  totalPages: totalPagesProp,
  onPageChange,
  className,
}: PaginationProps) {
  // Support both meta and individual props for backward compatibility
  const page = meta?.page ?? pageProp ?? 1;
  const totalPages = meta?.lastPage ?? totalPagesProp ?? 1;
  const total = meta?.total;
  const perPage = meta?.perPage;

  if (totalPages <= 1) return null;

  const from = total && perPage ? (page - 1) * perPage + 1 : undefined;
  const to = total && perPage ? Math.min(page * perPage, total) : undefined;

  // Generate page numbers
  const pages: (number | '...')[] = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className={cn('flex flex-col items-center gap-3 sm:flex-row sm:justify-between', className)}>
      {from !== undefined && to !== undefined && total !== undefined && (
        <p className="text-sm text-gray-500">
          Показано {from}–{to} из {total}
        </p>
      )}

      <nav className="flex items-center gap-1" aria-label="Пагинация">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Предыдущая страница"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`dots-${idx}`} className="px-2 text-gray-400 text-sm">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors',
                p === page
                  ? 'bg-sardoba-gold text-sardoba-dark'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Следующая страница"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </nav>
    </div>
  );
}
