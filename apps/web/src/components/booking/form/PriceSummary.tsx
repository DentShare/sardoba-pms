'use client';

import { formatMoney } from '@/lib/utils/money';
import type { HotelRoom, PriceCalculation } from '@/lib/api/public-booking';
import { BookingCard } from '../shared/BookingCard';
import { IconStar, IconSpinner } from '../icons/booking-icons';

interface PriceSummaryProps {
  selectedRoom: HotelRoom | null;
  nights: number;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  priceCalc: PriceCalculation | null;
  calcLoading: boolean;
  submitting: boolean;
  formErrors: Record<string, string>;
}

/**
 * Sidebar price breakdown: room price, extras, total.
 * Desktop only (hidden on mobile); includes submit button.
 */
export function PriceSummary({
  selectedRoom,
  nights,
  adults,
  children,
  checkIn,
  checkOut,
  priceCalc,
  calcLoading,
  submitting,
  formErrors,
}: PriceSummaryProps) {
  return (
    <div className="hidden lg:block">
      <div className="sticky top-24">
        <BookingCard>
          <h3
            className="text-lg font-semibold text-t-text mb-4 flex items-center gap-2"
            style={{ fontFamily: 'var(--t-font-heading)' }}
          >
            <IconStar className="text-t-primary" />
            Ваше бронирование
          </h3>

          {/* Summary details */}
          {selectedRoom ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-t-text-muted">Номер</span>
                <span className="font-medium text-t-text">{selectedRoom.name}</span>
              </div>
              {nights > 0 && (
                <div className="flex justify-between">
                  <span className="text-t-text-muted">Ночей</span>
                  <span className="font-medium text-t-text">{nights}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-t-text-muted">Гости</span>
                <span className="font-medium text-t-text">
                  {adults} взр.{children > 0 ? `, ${children} дет.` : ''}
                </span>
              </div>
              {checkIn && checkOut && (
                <>
                  <div className="flex justify-between">
                    <span className="text-t-text-muted">Заезд</span>
                    <span className="font-medium text-t-text">{checkIn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-t-text-muted">Выезд</span>
                    <span className="font-medium text-t-text">{checkOut}</span>
                  </div>
                </>
              )}

              <div className="border-t border-t-border-subtle pt-3 mt-3" />

              {/* Price breakdown */}
              {calcLoading ? (
                <div className="flex items-center justify-center py-4">
                  <IconSpinner className="w-5 h-5 text-t-primary" />
                </div>
              ) : priceCalc ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-t-text-muted">Номер ({priceCalc.nights} ноч.)</span>
                    <span className="font-medium">{formatMoney(priceCalc.room_price)}</span>
                  </div>
                  {priceCalc.extras_breakdown.map((ext, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-t-text-muted text-xs">{ext.name} x{ext.quantity}</span>
                      <span className="font-medium text-xs">{formatMoney(ext.total)}</span>
                    </div>
                  ))}
                  <div className="border-t border-t-border-subtle pt-3 mt-3" />
                  <div className="flex justify-between items-baseline">
                    <span className="text-base font-semibold text-t-text">Итого</span>
                    <span className="text-2xl font-bold text-t-primary">
                      {formatMoney(priceCalc.total)}
                    </span>
                  </div>
                </>
              ) : nights > 0 ? (
                <div className="flex justify-between items-baseline">
                  <span className="text-t-text-muted">Примерно</span>
                  <span className="text-xl font-bold text-t-primary">
                    {formatMoney(selectedRoom.base_price * nights)}
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-t-text-subtle text-center py-6">
              Выберите номер и даты для расчёта стоимости
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full booking-btn-primary text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <IconSpinner className="w-5 h-5" />
                Создание...
              </>
            ) : (
              'Забронировать'
            )}
          </button>

          {formErrors.submit && (
            <p className="mt-3 text-xs text-red-600 text-center">{formErrors.submit}</p>
          )}
        </BookingCard>
      </div>
    </div>
  );
}
