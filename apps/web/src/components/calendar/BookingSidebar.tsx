'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { StatusBadge, SourceBadge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useBookingStore } from '@/lib/store/use-booking-store';
import {
  useBooking,
  useCheckinBooking,
  useCheckoutBooking,
  useCancelBooking,
} from '@/lib/hooks/use-bookings';
import { formatMoney } from '@/lib/utils/money';
import { formatDate, getNights } from '@/lib/utils/dates';
import type { BookingStatus } from '@sardoba/shared';

export function BookingSidebar() {
  const router = useRouter();
  const { selectedBooking, selectBooking } = useBookingStore();
  const { data: booking, isLoading } = useBooking(selectedBooking);

  const checkinMut = useCheckinBooking();
  const checkoutMut = useCheckoutBooking();
  const cancelMut = useCancelBooking();

  const handleClose = useCallback(() => {
    selectBooking(null);
  }, [selectBooking]);

  const handleCheckin = useCallback(async () => {
    if (!booking) return;
    await checkinMut.mutateAsync(booking.id);
  }, [booking, checkinMut]);

  const handleCheckout = useCallback(async () => {
    if (!booking) return;
    await checkoutMut.mutateAsync(booking.id);
  }, [booking, checkoutMut]);

  const handleCancel = useCallback(async () => {
    if (!booking) return;
    await cancelMut.mutateAsync({ id: booking.id, reason: 'Отменено из календаря' });
  }, [booking, cancelMut]);

  const handleOpenDetail = useCallback(() => {
    if (!booking) return;
    router.push(`/bookings/${booking.id}`);
  }, [booking, router]);

  if (!selectedBooking) return null;

  const isOpen = selectedBooking !== null;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={handleClose}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-xl z-50',
          'transform transition-transform duration-300 ease-in-out',
          'flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            Бронирование
          </h3>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : booking ? (
            <div className="space-y-6">
              {/* Booking Number & Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-gray-500">
                  {booking.bookingNumber}
                </span>
                <StatusBadge status={booking.status} />
              </div>

              {/* Guest */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Гость</div>
                <div className="font-semibold text-gray-900">
                  Гость #{booking.guestId}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Заезд</div>
                  <div className="font-medium">{formatDate(booking.checkIn)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Выезд</div>
                  <div className="font-medium">{formatDate(booking.checkOut)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Ночей</div>
                  <div className="font-medium">
                    {getNights(booking.checkIn, booking.checkOut)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Гостей</div>
                  <div className="font-medium">
                    {booking.adults} взр.{booking.children > 0 ? ` + ${booking.children} дет.` : ''}
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="p-4 bg-sardoba-sand-light rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Сумма</span>
                  <span className="font-bold text-lg text-sardoba-blue">
                    {formatMoney(booking.totalAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Оплачено</span>
                  <span className={cn(
                    'font-medium',
                    booking.paidAmount >= booking.totalAmount
                      ? 'text-green-600'
                      : 'text-orange-600',
                  )}>
                    {formatMoney(booking.paidAmount)}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      booking.paidAmount >= booking.totalAmount
                        ? 'bg-green-500'
                        : 'bg-sardoba-gold',
                    )}
                    style={{
                      width: `${Math.min(
                        100,
                        booking.totalAmount > 0
                          ? (booking.paidAmount / booking.totalAmount) * 100
                          : 0,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Source */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Источник</span>
                <SourceBadge source={booking.source} />
              </div>

              {/* Notes */}
              {booking.notes && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Примечание</div>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {booking.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
              Бронирование не найдено
            </div>
          )}
        </div>

        {/* Actions */}
        {booking && (
          <div className="border-t border-gray-100 px-6 py-4 space-y-2">
            <div className="flex gap-2">
              {booking.status === 'new' && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={handleCheckin}
                  loading={checkinMut.isPending}
                >
                  Заезд
                </Button>
              )}
              {booking.status === 'confirmed' && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={handleCheckin}
                  loading={checkinMut.isPending}
                >
                  Заезд
                </Button>
              )}
              {booking.status === 'checked_in' && (
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={handleCheckout}
                  loading={checkoutMut.isPending}
                >
                  Выезд
                </Button>
              )}
              {(booking.status === 'new' || booking.status === 'confirmed') && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleCancel}
                  loading={cancelMut.isPending}
                >
                  Отменить
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleOpenDetail}
            >
              Подробнее
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
