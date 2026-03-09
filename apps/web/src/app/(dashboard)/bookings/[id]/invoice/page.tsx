'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useBooking } from '@/lib/hooks/use-bookings';
import { listPayments } from '@/lib/api/payments';
import { formatMoney } from '@/lib/utils/money';
import { formatDate, formatDateTime, getNights } from '@/lib/utils/dates';
import { PageSpinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import type { Payment, PaymentMethod } from '@sardoba/shared';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перевод',
  payme: 'Payme',
  click: 'Click',
  other: 'Другое',
};

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const { data: booking, isLoading: bookingLoading } = useBooking(id);
  const { data: paymentsResponse, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', id],
    queryFn: () => listPayments(id),
    enabled: !!id,
  });
  const payments = paymentsResponse?.data;

  if (bookingLoading || paymentsLoading) return <PageSpinner />;

  if (!booking) {
    return (
      <div className="p-8 text-center text-gray-500">
        Бронирование не найдено
      </div>
    );
  }

  const nights = getNights(booking.checkIn, booking.checkOut);
  const pricePerNight = nights > 0 ? Math.round(booking.totalAmount / nights) : 0;
  const balance = booking.totalAmount - booking.paidAmount;

  const guest = (booking as any).guest;
  const room = (booking as any).room;

  return (
    <>
      {/* Print controls — hidden when printing */}
      <div className="print:hidden p-4 lg:p-6 flex items-center gap-3 border-b border-gray-200 bg-gray-50">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          ← Назад
        </Button>
        <Button variant="primary" size="sm" onClick={() => window.print()}>
          Печать
        </Button>
      </div>

      {/* Invoice — optimized for print */}
      <div className="max-w-[800px] mx-auto p-8 print:p-0 print:max-w-none">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">СЧЁТ / КВИТАНЦИЯ</h1>
            <p className="text-sm text-gray-500 mt-1">
              Бронирование {booking.bookingNumber}
            </p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p className="font-semibold text-base text-gray-900">Sardoba PMS</p>
            <p>Дата выписки: {formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        <hr className="border-gray-300 mb-6" />

        {/* Guest & Booking Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Гость</h3>
            {guest ? (
              <div className="text-sm space-y-1">
                <p className="font-semibold text-gray-900">
                  {guest.firstName} {guest.lastName}
                </p>
                {guest.phone && <p className="text-gray-600">{guest.phone}</p>}
                {guest.email && <p className="text-gray-600">{guest.email}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Гость #{booking.guestId}</p>
            )}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Детали</h3>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-gray-500">Комната:</span>{' '}
                <span className="font-medium">{room?.name || `#${booking.roomId}`}</span>
              </p>
              <p>
                <span className="text-gray-500">Заезд:</span>{' '}
                <span className="font-medium">{formatDate(booking.checkIn)}</span>
              </p>
              <p>
                <span className="text-gray-500">Выезд:</span>{' '}
                <span className="font-medium">{formatDate(booking.checkOut)}</span>
              </p>
              <p>
                <span className="text-gray-500">Гостей:</span>{' '}
                <span className="font-medium">
                  {booking.adults} взр.{booking.children > 0 ? ` + ${booking.children} дет.` : ''}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 font-semibold text-gray-700">Описание</th>
              <th className="text-center py-2 font-semibold text-gray-700">Кол-во</th>
              <th className="text-right py-2 font-semibold text-gray-700">Цена</th>
              <th className="text-right py-2 font-semibold text-gray-700">Сумма</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-3">
                Проживание: {room?.name || `Комната #${booking.roomId}`}
                {room?.roomType && (
                  <span className="text-gray-500"> ({room.roomType})</span>
                )}
              </td>
              <td className="py-3 text-center">{nights} ноч.</td>
              <td className="py-3 text-right">{formatMoney(pricePerNight)}</td>
              <td className="py-3 text-right font-medium">{formatMoney(booking.totalAmount)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-2 text-sm">
              <span className="text-gray-600">Итого</span>
              <span className="font-semibold">{formatMoney(booking.totalAmount)}</span>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-gray-600">Оплачено</span>
              <span className="font-medium text-green-700">{formatMoney(booking.paidAmount)}</span>
            </div>
            <div className="flex justify-between py-2 text-sm border-t-2 border-gray-300">
              <span className="font-bold">
                {balance <= 0 ? 'Переплата' : 'К оплате'}
              </span>
              <span className={`font-bold text-lg ${balance <= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {balance <= 0 ? formatMoney(0) : formatMoney(balance)}
              </span>
            </div>
          </div>
        </div>

        {/* Payments History */}
        {payments && payments.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              История оплат
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-600 font-medium">Дата</th>
                  <th className="text-left py-2 text-gray-600 font-medium">Способ</th>
                  <th className="text-left py-2 text-gray-600 font-medium">Примечание</th>
                  <th className="text-right py-2 text-gray-600 font-medium">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: Payment) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-2">{formatDateTime(p.createdAt)}</td>
                    <td className="py-2">{METHOD_LABELS[p.method as PaymentMethod] || p.method}</td>
                    <td className="py-2 text-gray-500">{p.notes || '—'}</td>
                    <td className="py-2 text-right font-medium">{formatMoney(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes */}
        {booking.notes && (
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Примечание
            </h3>
            <p className="text-sm text-gray-700">{booking.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 text-xs text-gray-400 text-center">
          <p>Спасибо за ваш визит!</p>
          <p className="mt-1">Документ сформирован автоматически системой Sardoba PMS</p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          nav, header, .print\\:hidden { display: none !important; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>
    </>
  );
}
