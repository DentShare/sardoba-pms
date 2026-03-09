'use client';

import { useState } from 'react';
import { useProperties } from '@/lib/hooks';
import {
  Search,
  Eye,
  X,
  Building2,
  Loader2,
  AlertCircle,
  CalendarCheck,
  Users,
  BedDouble,
} from 'lucide-react';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface Property {
  id: number;
  name: string;
  city: string;
  address: string;
  phone: string;
  currency: string;
  slug: string;
  bookingEnabled: boolean;
  roomsCount: number;
  usersCount: number;
  bookingsCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function HotelsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const { data, isLoading, error } = useProperties({ page, perPage: 20, search: search || undefined });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <span className="ml-3 text-gray-500">Загрузка отелей...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <span className="ml-3 text-red-600">Не удалось загрузить список отелей</span>
      </div>
    );
  }

  const properties: Property[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, lastPage: 1 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление отелями</h1>
          <p className="text-sm text-gray-500 mt-1">Полный контроль над всеми подключёнными объектами</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-500">Всего отелей</span>
          </div>
          <p className="text-2xl font-bold mt-1">{meta.total}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-gray-500">Номеров</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {properties.reduce((sum: number, p: Property) => sum + p.roomsCount, 0)}
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-500" />
            <span className="text-sm text-gray-500">Пользователей</span>
          </div>
          <p className="text-2xl font-bold text-violet-600 mt-1">
            {properties.reduce((sum: number, p: Property) => sum + p.usersCount, 0)}
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-gray-500">Бронирований</span>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {properties.reduce((sum: number, p: Property) => sum + p.bookingsCount, 0)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по названию, городу..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/80">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Отель</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Город</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Номера</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Пользователи</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Бронирования</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Онлайн-бронь</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Создан</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Действия</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property: Property) => (
                <tr key={property.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-gray-900">{property.name}</span>
                      <p className="text-xs text-gray-500">{property.slug}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{property.city}</td>
                  <td className="px-4 py-3 text-gray-700">{property.roomsCount}</td>
                  <td className="px-4 py-3 text-gray-700">{property.usersCount}</td>
                  <td className="px-4 py-3 text-gray-700">{property.bookingsCount}</td>
                  <td className="px-4 py-3">
                    <span className={property.bookingEnabled ? 'badge badge-green' : 'badge badge-gray'}>
                      {property.bookingEnabled ? 'Включено' : 'Выключено'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(property.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedProperty(property)}
                        className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="Просмотр"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {properties.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            Отели не найдены
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta.lastPage > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Всего: {meta.total}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Назад
            </button>
            <span className="text-sm text-gray-600">
              {page} / {meta.lastPage}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.lastPage, p + 1))}
              disabled={page >= meta.lastPage}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Далее
            </button>
          </div>
        </div>
      )}

      {/* Property Details Sidebar */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedProperty(null)} />
          <div className="relative z-10 h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">{selectedProperty.name}</h2>
              <button onClick={() => setSelectedProperty(null)} className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-6 p-6">
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500">Информация</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Город:</span> {selectedProperty.city}</p>
                  <p><span className="text-gray-500">Адрес:</span> {selectedProperty.address}</p>
                  <p><span className="text-gray-500">Телефон:</span> {selectedProperty.phone}</p>
                  <p><span className="text-gray-500">Валюта:</span> {selectedProperty.currency}</p>
                  <p><span className="text-gray-500">Slug:</span> <span className="font-mono text-gray-600">{selectedProperty.slug}</span></p>
                  <p><span className="text-gray-500">ID:</span> <span className="font-mono text-gray-600">#{selectedProperty.id}</span></p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500">Статистика</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Номеров</p>
                    <p className="text-lg font-semibold">{selectedProperty.roomsCount}</p>
                  </div>
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Пользователей</p>
                    <p className="text-lg font-semibold">{selectedProperty.usersCount}</p>
                  </div>
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Бронирований</p>
                    <p className="text-lg font-semibold">{selectedProperty.bookingsCount}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500">Онлайн-бронирование</h3>
                <span className={selectedProperty.bookingEnabled ? 'badge badge-green' : 'badge badge-gray'}>
                  {selectedProperty.bookingEnabled ? 'Включено' : 'Выключено'}
                </span>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500">Даты</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Создан:</span> {formatDate(selectedProperty.createdAt)}</p>
                  <p><span className="text-gray-500">Обновлён:</span> {formatDate(selectedProperty.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
