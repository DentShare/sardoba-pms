'use client';

import { useState } from 'react';
import { useAdminBookings } from '@/lib/hooks';
import {
  Search,
  CalendarCheck,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

function formatUZS(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount / 100) + ' сум';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const statusLabels: Record<string, string> = {
  new: 'Новая',
  confirmed: 'Подтверждена',
  checked_in: 'Заехал',
  checked_out: 'Выехал',
  cancelled: 'Отменена',
  no_show: 'Не заехал',
};

const statusBadge: Record<string, string> = {
  new: 'badge badge-blue',
  confirmed: 'badge badge-purple',
  checked_in: 'badge badge-green',
  checked_out: 'badge badge-gray',
  cancelled: 'badge badge-red',
  no_show: 'badge badge-yellow',
};

const sourceLabels: Record<string, string> = {
  direct: 'Прямая',
  booking_com: 'Booking.com',
  airbnb: 'Airbnb',
  expedia: 'Expedia',
  phone: 'Телефон',
};

interface BookingItem {
  id: number;
  bookingNumber: string;
  propertyId: number;
  propertyName: string;
  guestName: string;
  guestPhone: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  source: string;
  createdAt: string;
}

const PAGE_SIZE = 20;

export default function BookingsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);

  const { data, isLoading, error } = useAdminBookings({
    page,
    perPage: PAGE_SIZE,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <span className="ml-3 text-gray-500">Загрузка бронирований...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <span className="ml-3 text-red-600">Не удалось загрузить бронирования</span>
      </div>
    );
  }

  const bookings: BookingItem[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, lastPage: 1 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Бронирования</h1>
          <p className="text-sm text-gray-500 mt-1">Все бронирования со всех отелей платформы</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-sm text-gray-500">Всего</p>
          <p className="text-2xl font-bold mt-1">{meta.total}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">На странице</p>
          <p className="text-2xl font-bold text-brand-600 mt-1">{bookings.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Страница</p>
          <p className="text-2xl font-bold mt-1">{page} / {meta.lastPage || 1}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Поиск по номеру брони, гостю..."
            className="input-field pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field w-auto"
        >
          <option value="all">Все статусы</option>
          <option value="new">Новая</option>
          <option value="confirmed">Подтверждена</option>
          <option value="checked_in">Заехал</option>
          <option value="checked_out">Выехал</option>
          <option value="cancelled">Отменена</option>
          <option value="no_show">Не заехал</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          className="input-field w-auto"
        >
          <option value="all">Все источники</option>
          <option value="direct">Прямая</option>
          <option value="booking_com">Booking.com</option>
          <option value="airbnb">Airbnb</option>
          <option value="expedia">Expedia</option>
          <option value="phone">Телефон</option>
        </select>
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-500">N брони</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Отель</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Гость</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Номер</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Заезд</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Выезд</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Ночей</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Источник</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Сумма</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Действия</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b: BookingItem) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-brand-600">{b.bookingNumber}</td>
                  <td className="px-4 py-3 font-medium">{b.propertyName}</td>
                  <td className="px-4 py-3">
                    <div>{b.guestName}</div>
                    <div className="text-xs text-gray-400">{b.guestPhone}</div>
                  </td>
                  <td className="px-4 py-3">{b.roomName}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(b.checkIn)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(b.checkOut)}</td>
                  <td className="px-4 py-3 text-gray-600">{b.nights}</td>
                  <td className="px-4 py-3">
                    <span className={statusBadge[b.status] ?? 'badge badge-gray'}>
                      {statusLabels[b.status] ?? b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge badge-gray">{sourceLabels[b.source] ?? b.source}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatUZS(b.totalAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedBooking(b)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-brand-600 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                    <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Бронирования не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          <p className="text-sm text-gray-500">Всего: {meta.total}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-white border disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 min-w-[80px] text-center">
              {page} / {meta.lastPage || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.lastPage || 1, p + 1))}
              disabled={page >= (meta.lastPage || 1)}
              className="p-1.5 rounded-lg hover:bg-white border disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedBooking(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Бронирование {selectedBooking.bookingNumber}</h2>
              <button onClick={() => setSelectedBooking(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Отель</p>
                <p className="font-medium">{selectedBooking.propertyName}</p>
              </div>
              <div>
                <p className="text-gray-500">Номер</p>
                <p className="font-medium">{selectedBooking.roomName}</p>
              </div>
              <div>
                <p className="text-gray-500">Гость</p>
                <p className="font-medium">{selectedBooking.guestName}</p>
                <p className="text-gray-400">{selectedBooking.guestPhone}</p>
              </div>
              <div>
                <p className="text-gray-500">Источник</p>
                <p className="font-medium">{sourceLabels[selectedBooking.source] ?? selectedBooking.source}</p>
              </div>
              <div>
                <p className="text-gray-500">Заезд</p>
                <p className="font-medium">{formatDate(selectedBooking.checkIn)}</p>
              </div>
              <div>
                <p className="text-gray-500">Выезд</p>
                <p className="font-medium">{formatDate(selectedBooking.checkOut)}</p>
              </div>
              <div>
                <p className="text-gray-500">Ночей</p>
                <p className="font-medium">{selectedBooking.nights}</p>
              </div>
              <div>
                <p className="text-gray-500">Статус</p>
                <span className={statusBadge[selectedBooking.status] ?? 'badge badge-gray'}>
                  {statusLabels[selectedBooking.status] ?? selectedBooking.status}
                </span>
              </div>
              <div>
                <p className="text-gray-500">Сумма</p>
                <p className="font-bold text-lg">{formatUZS(selectedBooking.totalAmount)}</p>
              </div>
              <div>
                <p className="text-gray-500">Оплачено</p>
                <p className="font-bold text-lg">{formatUZS(selectedBooking.paidAmount)}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button className="btn-secondary flex-1" onClick={() => setSelectedBooking(null)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
