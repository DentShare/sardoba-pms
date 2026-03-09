'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  useConfirmBooking,
  useCheckinBooking,
  useCheckoutBooking,
  useCancelBooking,
} from '@/lib/hooks/use-bookings';
import {
  useSetEarlyCheckin,
  useRemoveEarlyCheckin,
  useSetLateCheckout,
  useRemoveLateCheckout,
} from '@/lib/hooks/use-flexibility';
import { listPayments, createPayment, generatePaymeQr, getPaymeQrStatus, type PaymentsResponse } from '@/lib/api/payments';
import { listInvoices, createInvoice, downloadInvoicePdf, type Invoice, type CreateInvoiceDto } from '@/lib/api/invoices';
import { formatMoney } from '@/lib/utils/money';
import { formatDate, formatDateTime, getNights } from '@/lib/utils/dates';
import type { Payment, BookingStatus, PaymentMethod } from '@sardoba/shared';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Наличные' },
  { value: 'card', label: 'Карта' },
  { value: 'transfer', label: 'Перевод' },
  { value: 'other', label: 'Другое' },
];

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = Number(params.id);

  const { data: booking, isLoading } = useBooking(id);
  const { data: paymentsResponse } = useQuery({
    queryKey: ['payments', id],
    queryFn: () => listPayments(id),
    enabled: !!id,
  });
  const payments = paymentsResponse?.data;

  const confirmMut = useConfirmBooking();
  const checkinMut = useCheckinBooking();
  const checkoutMut = useCheckoutBooking();
  const cancelMut = useCancelBooking();

  // Payment modal state
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payNotes, setPayNotes] = useState('');

  // Flexibility state
  const [earlyTime, setEarlyTime] = useState('');
  const [earlyPrice, setEarlyPrice] = useState('');
  const [lateTime, setLateTime] = useState('');
  const [latePrice, setLatePrice] = useState('');

  const setEarlyCheckinMut = useSetEarlyCheckin();
  const removeEarlyCheckinMut = useRemoveEarlyCheckin();
  const setLateCheckoutMut = useSetLateCheckout();
  const removeLateCheckoutMut = useRemoveLateCheckout();

  // Payme QR state
  const [showPaymeModal, setShowPaymeModal] = useState(false);
  const [paymeAmount, setPaymeAmount] = useState('');
  const [paymeQrUrl, setPaymeQrUrl] = useState('');
  const [paymeLoading, setPaymeLoading] = useState(false);

  // Invoice state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invCompanyName, setInvCompanyName] = useState('');
  const [invCompanyInn, setInvCompanyInn] = useState('');
  const [invCompanyAddress, setInvCompanyAddress] = useState('');
  const [invCompanyBank, setInvCompanyBank] = useState('');
  const [invCompanyAccount, setInvCompanyAccount] = useState('');
  const [invCompanyMfo, setInvCompanyMfo] = useState('');

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

  // Flexibility handlers
  const handleSetEarlyCheckin = useCallback(() => {
    if (!earlyTime || !earlyPrice) return;
    setEarlyCheckinMut.mutate(
      { bookingId: id, time: earlyTime, price: Math.round(Number(earlyPrice) * 100) },
      { onSuccess: () => { setEarlyTime(''); setEarlyPrice(''); } },
    );
  }, [id, earlyTime, earlyPrice, setEarlyCheckinMut]);

  const handleRemoveEarlyCheckin = useCallback(() => {
    removeEarlyCheckinMut.mutate(id);
  }, [id, removeEarlyCheckinMut]);

  const handleSetLateCheckout = useCallback(() => {
    if (!lateTime || !latePrice) return;
    setLateCheckoutMut.mutate(
      { bookingId: id, time: lateTime, price: Math.round(Number(latePrice) * 100) },
      { onSuccess: () => { setLateTime(''); setLatePrice(''); } },
    );
  }, [id, lateTime, latePrice, setLateCheckoutMut]);

  const handleRemoveLateCheckout = useCallback(() => {
    removeLateCheckoutMut.mutate(id);
  }, [id, removeLateCheckoutMut]);

  // Payme QR handlers
  const handleGeneratePaymeQr = useCallback(async () => {
    if (!paymeAmount || Number(paymeAmount) <= 0) return;
    setPaymeLoading(true);
    try {
      const result = await generatePaymeQr(id, Math.round(Number(paymeAmount) * 100));
      setPaymeQrUrl(result.qrUrl);
    } catch {
      toast.error('Ошибка при генерации QR-кода');
    } finally {
      setPaymeLoading(false);
    }
  }, [id, paymeAmount]);

  const handleCheckPaymeStatus = useCallback(async () => {
    setPaymeLoading(true);
    try {
      const result = await getPaymeQrStatus(id);
      if (result.paid) {
        toast.success('Оплата подтверждена');
        setShowPaymeModal(false);
        setPaymeQrUrl('');
        setPaymeAmount('');
        queryClient.invalidateQueries({ queryKey: ['payments', id] });
        queryClient.invalidateQueries({ queryKey: ['bookings', id] });
      } else {
        toast('Оплата ещё не получена');
      }
    } catch {
      toast.error('Ошибка при проверке статуса');
    } finally {
      setPaymeLoading(false);
    }
  }, [id, queryClient]);

  // Invoice handlers
  useEffect(() => {
    if (id) {
      listInvoices(id).then(setInvoices).catch(() => {});
    }
  }, [id]);

  const handleDownloadPdf = useCallback(async (invoiceId: number) => {
    try {
      const blob = await downloadInvoicePdf(invoiceId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Ошибка при скачивании PDF');
    }
  }, []);

  const handleCreateInvoice = useCallback(async () => {
    if (!invCompanyName) return;
    setInvoiceLoading(true);
    try {
      const dto: CreateInvoiceDto = {
        booking_id: id,
        company_name: invCompanyName,
        company_inn: invCompanyInn || undefined,
        company_address: invCompanyAddress || undefined,
        company_bank: invCompanyBank || undefined,
        company_account: invCompanyAccount || undefined,
        company_mfo: invCompanyMfo || undefined,
      };
      const invoice = await createInvoice(dto);
      setInvoices((prev) => [...prev, invoice]);
      setShowInvoiceModal(false);
      setInvCompanyName('');
      setInvCompanyInn('');
      setInvCompanyAddress('');
      setInvCompanyBank('');
      setInvCompanyAccount('');
      setInvCompanyMfo('');
      toast.success('Счёт создан');
      // Auto-download PDF
      handleDownloadPdf(invoice.id);
    } catch {
      toast.error('Ошибка при создании счёта');
    } finally {
      setInvoiceLoading(false);
    }
  }, [id, invCompanyName, invCompanyInn, invCompanyAddress, invCompanyBank, invCompanyAccount, invCompanyMfo, handleDownloadPdf]);

  const handleConfirm = useCallback(async () => {
    if (!booking) return;
    await confirmMut.mutateAsync(booking.id);
  }, [booking, confirmMut]);

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
        <Button key="confirm" variant="secondary" onClick={handleConfirm} loading={confirmMut.isPending}>
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
              onClick={() => router.push(`/bookings/${booking.id}/invoice`)}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                </svg>
              }
            >
              Счёт
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
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPaymeAmount(balance > 0 ? String(balance / 100) : '');
                    setPaymeQrUrl('');
                    setShowPaymeModal(true);
                  }}
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 3v18" />
                    </svg>
                  }
                >
                  Payme QR
                </Button>
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

          {/* Flexibility Section — Early check-in / Late check-out */}
          {(booking.status === 'new' || booking.status === 'confirmed') && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Гибкое время</h2>

              {/* Early check-in */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Ранний заезд</h3>
                {booking.earlyCheckinTime ? (
                  <div className="flex items-center justify-between bg-green-50 rounded-lg p-3">
                    <span className="text-sm text-gray-700">
                      Время: {booking.earlyCheckinTime} / Цена: {formatMoney(booking.earlyCheckinPrice)} сум
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveEarlyCheckin}
                      loading={removeEarlyCheckinMut.isPending}
                    >
                      Отменить
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-end">
                    <Input
                      type="time"
                      label="Время"
                      value={earlyTime}
                      onChange={(e) => setEarlyTime(e.target.value)}
                    />
                    <Input
                      type="number"
                      label="Цена (сум)"
                      value={earlyPrice}
                      onChange={(e) => setEarlyPrice(e.target.value)}
                      min={0}
                      placeholder="0"
                    />
                    <Button
                      size="sm"
                      onClick={handleSetEarlyCheckin}
                      loading={setEarlyCheckinMut.isPending}
                      disabled={!earlyTime || !earlyPrice}
                    >
                      Установить
                    </Button>
                  </div>
                )}
              </div>

              {/* Late check-out */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Поздний выезд</h3>
                {booking.lateCheckoutTime ? (
                  <div className="flex items-center justify-between bg-green-50 rounded-lg p-3">
                    <span className="text-sm text-gray-700">
                      Время: {booking.lateCheckoutTime} / Цена: {formatMoney(booking.lateCheckoutPrice)} сум
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLateCheckout}
                      loading={removeLateCheckoutMut.isPending}
                    >
                      Отменить
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-end">
                    <Input
                      type="time"
                      label="Время"
                      value={lateTime}
                      onChange={(e) => setLateTime(e.target.value)}
                    />
                    <Input
                      type="number"
                      label="Цена (сум)"
                      value={latePrice}
                      onChange={(e) => setLatePrice(e.target.value)}
                      min={0}
                      placeholder="0"
                    />
                    <Button
                      size="sm"
                      onClick={handleSetLateCheckout}
                      loading={setLateCheckoutMut.isPending}
                      disabled={!lateTime || !latePrice}
                    >
                      Установить
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
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

          {/* Invoices section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Счета</h2>
              <Button size="sm" onClick={() => setShowInvoiceModal(true)}>
                Создать счёт
              </Button>
            </div>

            {invoices.length === 0 ? (
              <p className="text-sm text-gray-400">Нет счетов</p>
            ) : (
              <ul className="space-y-2">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">{inv.companyName}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(inv.id)}>
                      PDF
                    </Button>
                  </li>
                ))}
              </ul>
            )}
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

      {/* Payme QR Modal */}
      <Modal
        open={showPaymeModal}
        onClose={() => {
          setShowPaymeModal(false);
          setPaymeQrUrl('');
        }}
        title="Payme QR"
        footer={
          paymeQrUrl ? (
            <>
              <Button variant="outline" onClick={() => { setShowPaymeModal(false); setPaymeQrUrl(''); }}>
                Закрыть
              </Button>
              <Button onClick={handleCheckPaymeStatus} loading={paymeLoading}>
                Проверить оплату
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowPaymeModal(false)}>
                Отмена
              </Button>
              <Button
                onClick={handleGeneratePaymeQr}
                loading={paymeLoading}
                disabled={!paymeAmount || Number(paymeAmount) <= 0}
              >
                Сгенерировать QR
              </Button>
            </>
          )
        }
      >
        <div className="space-y-4">
          {!paymeQrUrl ? (
            <Input
              label="Сумма (сум)"
              type="number"
              value={paymeAmount}
              onChange={(e) => setPaymeAmount(e.target.value)}
              min={1}
              placeholder="0"
              required
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <img
                src={paymeQrUrl}
                alt="Payme QR"
                className="w-64 h-64 border border-gray-200 rounded-lg"
              />
              <p className="text-sm text-gray-500">
                Сумма: {formatMoney(Math.round(Number(paymeAmount) * 100))} сум
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Invoice Modal */}
      <Modal
        open={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        title="Создать счёт"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowInvoiceModal(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleCreateInvoice}
              loading={invoiceLoading}
              disabled={!invCompanyName}
            >
              Создать
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Название компании"
            value={invCompanyName}
            onChange={(e) => setInvCompanyName(e.target.value)}
            placeholder="ООО «Компания»"
            required
          />
          <Input
            label="ИНН"
            value={invCompanyInn}
            onChange={(e) => setInvCompanyInn(e.target.value)}
            placeholder="123456789"
          />
          <Input
            label="Адрес"
            value={invCompanyAddress}
            onChange={(e) => setInvCompanyAddress(e.target.value)}
            placeholder="г. Ташкент, ул. ..."
          />
          <Input
            label="Банк"
            value={invCompanyBank}
            onChange={(e) => setInvCompanyBank(e.target.value)}
            placeholder="АКБ «Банк»"
          />
          <Input
            label="Расчётный счёт"
            value={invCompanyAccount}
            onChange={(e) => setInvCompanyAccount(e.target.value)}
            placeholder="20208000..."
          />
          <Input
            label="МФО"
            value={invCompanyMfo}
            onChange={(e) => setInvCompanyMfo(e.target.value)}
            placeholder="00000"
          />
        </div>
      </Modal>
    </div>
  );
}
