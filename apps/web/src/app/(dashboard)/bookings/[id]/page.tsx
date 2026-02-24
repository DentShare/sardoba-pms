'use client';

import { useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge, SourceBadge, Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import {
  useBooking,
  useCheckinBooking,
  useCheckoutBooking,
  useCancelBooking,
} from '@/lib/hooks/use-bookings';
import { listPayments, createPayment } from '@/lib/api/payments';
import { formatMoney } from '@/lib/utils/money';
import { formatDate, formatDateTime, getNights } from '@/lib/utils/dates';
import type { Payment, BookingStatus, PaymentMethod } from '@sardoba/shared';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Наличные' },
  { value: 'card', label: 'Карта' },
  { value: 'transfer', label: 'Перевод' },
  { value: 'payme', label: 'Payme' },
  { value: 'click', label: 'Click' },
  { value: 'other', label: 'Другое' },
];

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = Number(params.id);

  const { data: booking, isLoading } = useBooking(id);
  const { data: payments } = useQuery({
    queryKey: ['payments', id],
    queryFn: () => listPayments(id),
    enabled: !!id,
  });

  const checkinMut = useCheckinBooking();
  const checkoutMut = useCheckoutBooking();
  const cancelMut = useCancelBooking();

  // Payment modal state
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payNotes, setPayNotes] = useState('');

  const addPaymentMut = useMutation({
    mutationFn: () =>
      createPayment({
        booking_id: id,
        amount: Math.round(Number(payAmount) * 100),
        method: payMethod,
        notes: payNotes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings', id] });
      toast.success('Оплата добавлена');
      setShowPayment(false);
      setPayAmount('');
      setPayNotes('');
    },
    onError: () => {
      toast.error('Ошибка при добавлении оплаты');
    },
  });

  const handleConfirm = useCallback(async () => {
    if (!booking) return;
    // Use checkin for now since there's no separate confirm mutation
    await checkinMut.mutateAsync(booking.id);
  }, [booking, checkinMut]);

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
    await cancelMut.mutateAsync({ id: booking.id, reason: 'Отменено вручную' });
  }, [booking, cancelMut]);

  const paidPercent = useMemo(() => {
    if (!booking || booking.totalAmount === 0) return 0;
    return Math.min(100, (booking.paidAmount / booking.totalAmount) * 100);
  }, [booking]);

  const nights = booking ? getNights(booking.checkIn, booking.checkOut) : 0;
  const balance = booking ? booking.totalAmount - booking.paidAmount : 0;

  if (isLoading) return <PageSpinner />;

  if (!booking) {
    return (
      <div className="p-4 lg:p-6">
        <div className="text-center py-20 text-gray-500">
          Бронирование не найдено
        </div>
      </div>
    );
  }

  const actionButtons = () => {
    const status = booking.status as BookingStatus;
    const buttons: React.ReactNode[] = [];

    if (status === 'new') {
      buttons.push(
        <Button key="confirm" variant="secondary" onClick={handleConfirm} loading={checkinMut.isPending}>
          Подтвердить
        </Button>,
      );
    }
    if (status === 'new' || status === 'confirmed') {
      buttons.push(
        <Button key="checkin" variant="primary" onClick={handleCheckin} loading={checkinMut.isPending}>
          Заезд
        </Button>,
      );
    }
    if (status === 'checked_in') {
      buttons.push(
        <Button key="checkout" variant="primary" onClick={handleCheckout} loading={checkoutMut.isPending}>
          Выезд
        </Button>,
      );
    }
    if (status === 'new' || status === 'confirmed') {
      buttons.push(
        <Button key="cancel" variant="danger" onClick={handleCancel} loading={cancelMut.isPending}>
          Отменить
        </Button>,
      );
    }

    return buttons;
  };

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title={`Бронирование ${booking.bookingNumber}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            {actionButtons()}
            <Button
              variant="outline"
              onClick={() => window.print()}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                </svg>
              }
            >
              Печать
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: booking info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Информация</h2>
              <div className="flex items-center gap-2">
                <StatusBadge status={booking.status} />
                <SourceBadge source={booking.source} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">Гость</div>
                <div className="font-medium text-gray-900">#{booking.guestId}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Комната</div>
                <div className="font-medium text-gray-900">#{booking.roomId}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Заезд</div>
                <div className="font-medium text-gray-900">
                  {formatDate(booking.checkIn)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Выезд</div>
                <div className="font-medium text-gray-900">
                  {formatDate(booking.checkOut)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Ночей</div>
                <div className="font-medium text-gray-900">{nights}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Гостей</div>
                <div className="font-medium text-gray-900">
                  {booking.adults} взр.
                  {booking.children > 0 ? ` + ${booking.children} дет.` : ''}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Сумма</div>
                <div className="font-bold text-sardoba-blue">
                  {formatMoney(booking.totalAmount)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Создано</div>
                <div className="font-medium text-gray-900 text-sm">
                  {formatDateTime(booking.createdAt)}
                </div>
              </div>
            </div>

            {booking.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Примечание</div>
                <p className="text-sm text-gray-700">{booking.notes}</p>
              </div>
            )}

            {booking.cancelReason && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg">
                <div className="text-sm text-red-600 mb-1">Причина отмены</div>
                <p className="text-sm text-red-700">{booking.cancelReason}</p>
              </div>
            )}
          </div>

          {/* Payments Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Оплаты</h2>
              <Button
                size="sm"
                onClick={() => setShowPayment(true)}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14" /><path d="M5 12h14" />
                  </svg>
                }
              >
                Добавить оплату
              </Button>
            </div>

            {/* Payment balance bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-500">
                  Оплачено: {formatMoney(booking.paidAmount)}
                </span>
                <span className={cn(
                  'font-medium',
                  balance <= 0 ? 'text-green-600' : 'text-orange-600',
                )}>
                  {balance <= 0 ? 'Оплачено полностью' : `Остаток: ${formatMoney(balance)}`}
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    paidPercent >= 100 ? 'bg-green-500' : 'bg-sardoba-gold',
                  )}
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
            </div>

            {/* Payments list */}
            {payments && payments.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {payments.map((payment: Payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatMoney(payment.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateTime(payment.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="default" size="sm">
                        {PAYMENT_METHODS.find((m) => m.value === payment.method)?.label || payment.method}
                      </Badge>
                      {payment.notes && (
                        <div className="text-xs text-gray-500 mt-1">{payment.notes}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-gray-500">
                Нет оплат
              </div>
            )}
          </div>
        </div>

        {/* Right column: timeline */}
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Итого</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Стоимость</span>
                <span className="font-medium">{formatMoney(booking.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Оплачено</span>
                <span className="font-medium text-green-600">{formatMoney(booking.paidAmount)}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between text-sm">
                <span className="font-medium text-gray-700">Остаток</span>
                <span className={cn(
                  'font-bold',
                  balance <= 0 ? 'text-green-600' : 'text-red-600',
                )}>
                  {formatMoney(Math.max(0, balance))}
                </span>
              </div>
            </div>
          </div>

          {/* History timeline placeholder */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">История</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-sardoba-gold mt-1.5 shrink-0" />
                <div>
                  <div className="text-sm text-gray-700">Бронирование создано</div>
                  <div className="text-xs text-gray-500">
                    {formatDateTime(booking.createdAt)}
                  </div>
                </div>
              </div>
              {booking.status === 'cancelled' && booking.cancelledAt && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
                  <div>
                    <div className="text-sm text-gray-700">Отменено</div>
                    <div className="text-xs text-gray-500">
                      {formatDateTime(booking.cancelledAt)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Payment Modal */}
      <Modal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        title="Добавить оплату"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowPayment(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => addPaymentMut.mutate()}
              loading={addPaymentMut.isPending}
              disabled={!payAmount || Number(payAmount) <= 0}
            >
              Добавить
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Сумма (сум)"
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            min={1}
            placeholder="0"
            required
          />
          <Select
            label="Способ оплаты"
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            options={PAYMENT_METHODS}
          />
          <Input
            label="Примечание"
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
            placeholder="Номер транзакции, комментарий..."
          />
          {balance > 0 && (
            <p className="text-sm text-gray-500">
              Остаток к оплате: {formatMoney(balance)}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
