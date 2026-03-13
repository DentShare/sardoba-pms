'use client';

import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/utils/money';
import type { HotelExtra } from '@/lib/api/public-booking';
import { Counter } from '../shared/Counter';
import { PRICE_TYPE_LABELS } from '../constants';

interface ExtrasSelectorProps {
  extras: HotelExtra[];
  selectedExtras: Record<number, number>;
  onToggleExtra: (id: number) => void;
  onUpdateExtraQuantity: (id: number, quantity: number) => void;
  adults: number;
  children: number;
  stepNumber: number;
}

/**
 * Extras checkboxes — compact layout for form card.
 */
export function ExtrasSelector({
  extras,
  selectedExtras,
  onToggleExtra,
  onUpdateExtraQuantity,
  adults,
  children,
}: ExtrasSelectorProps) {
  if (extras.length === 0) return null;

  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.08em] font-medium mb-3" style={{ color: 'var(--t-text-subtle)' }}>
        Дополнительные услуги
      </label>
      <div className="space-y-2">
        {extras.map((extra) => (
          <label
            key={extra.id}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 border cursor-pointer transition-all duration-200',
              selectedExtras[extra.id]
                ? 'border-t-primary bg-t-primary/5'
                : 'border-t-border-subtle hover:border-t-primary/30',
            )}
            style={{ borderRadius: 'var(--t-card-radius, 8px)' }}
          >
            <input
              type="checkbox"
              checked={!!selectedExtras[extra.id]}
              onChange={() => onToggleExtra(extra.id)}
              className="w-4 h-4 rounded border-t-border-subtle shrink-0"
              style={{ accentColor: 'var(--t-primary)' }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>{extra.name}</span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-bold" style={{ color: 'var(--t-primary)' }}>
                {formatMoney(extra.price)}
              </span>
              <span className="block text-[10px]" style={{ color: 'var(--t-text-subtle)' }}>
                {PRICE_TYPE_LABELS[extra.price_type]}
              </span>
            </div>
            {selectedExtras[extra.id] && extra.price_type === 'per_person' && (
              <div className="shrink-0" onClick={(e) => e.preventDefault()}>
                <Counter
                  label=""
                  value={selectedExtras[extra.id] || 1}
                  onChange={(v) => onUpdateExtraQuantity(extra.id, v)}
                  min={1}
                  max={adults + children}
                />
              </div>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
