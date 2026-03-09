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
 * Step 4: Extras checkboxes with prices.
 */
export function ExtrasSelector({
  extras,
  selectedExtras,
  onToggleExtra,
  onUpdateExtraQuantity,
  adults,
  children,
  stepNumber,
}: ExtrasSelectorProps) {
  if (extras.length === 0) return null;

  return (
    <div className="booking-card p-6">
      <h3
        className="flex items-center gap-2 text-lg font-semibold text-t-text mb-4"
        style={{ fontFamily: 'var(--t-font-heading)' }}
      >
        <span className="w-7 h-7 rounded-full bg-t-primary text-white text-sm flex items-center justify-center font-bold">
          {stepNumber}
        </span>
        Дополнительные услуги
      </h3>
      <div className="space-y-3">
        {extras.map((extra) => (
          <label
            key={extra.id}
            className={cn(
              'flex items-center gap-4 p-3 border cursor-pointer transition-all duration-200',
              selectedExtras[extra.id]
                ? 'border-t-primary bg-t-primary/5'
                : 'border-t-border-subtle bg-t-surface hover:border-t-border-subtle/80',
            )}
            style={{ borderRadius: 'var(--t-card-radius)' }}
          >
            <input
              type="checkbox"
              checked={!!selectedExtras[extra.id]}
              onChange={() => onToggleExtra(extra.id)}
              className="w-4 h-4 rounded border-t-border-subtle"
              style={{ accentColor: 'var(--t-primary)' }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-t-text">{extra.name}</span>
              {extra.description && (
                <p className="text-xs text-t-text-subtle mt-0.5">{extra.description}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-bold text-t-primary">
                {formatMoney(extra.price)}
              </span>
              <span className="block text-xs text-t-text-subtle">
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
