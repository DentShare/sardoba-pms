'use client';

import { useState, useMemo, Fragment } from 'react';
import {
  systemLogs,
  errorsByService,
  formatDateTime,
  type SystemLog,
} from '@/lib/mock-data';
import {
  Search,
  Filter,
  AlertTriangle,
  AlertCircle,
  Info,
  XCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const ROWS_PER_PAGE = 25;

const levelBadgeClass = (level: SystemLog['level']) => {
  switch (level) {
    case 'info':
      return 'badge badge-blue';
    case 'warning':
      return 'badge badge-yellow';
    case 'error':
      return 'badge badge-red';
    case 'critical':
      return 'bg-red-600 text-white rounded-full px-2.5 py-0.5 text-xs font-medium';
    default:
      return 'badge badge-gray';
  }
};

const levelLabels: Record<SystemLog['level'], string> = {
  info: 'Info',
  warning: 'Warning',
  error: 'Error',
  critical: 'Critical',
};

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <ChevronUp className="h-4 w-4 text-red-500" />;
  if (trend === 'down') return <ChevronDown className="h-4 w-4 text-emerald-500" />;
  return <span className="text-gray-400">—</span>;
};

export default function LogsPage() {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<SystemLog['level'] | 'all'>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [hotelFilter, setHotelFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const uniqueServices = useMemo(
    () => Array.from(new Set(systemLogs.map((l) => l.service))).sort(),
    []
  );
  const uniqueHotels = useMemo(
    () =>
      Array.from(
        new Set(systemLogs.map((l) => l.hotelName).filter(Boolean) as string[])
      ).sort(),
    []
  );

  const filteredLogs = useMemo(() => {
    let result = [...systemLogs];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q)
      );
    }

    if (levelFilter !== 'all') {
      result = result.filter((l) => l.level === levelFilter);
    }

    if (serviceFilter !== 'all') {
      result = result.filter((l) => l.service === serviceFilter);
    }

    if (hotelFilter !== 'all') {
      result = result.filter((l) => l.hotelName === hotelFilter);
    }

    if (dateFrom) {
      result = result.filter((l) => l.timestamp >= `${dateFrom}T00:00:00Z`);
    }
    if (dateTo) {
      result = result.filter((l) => l.timestamp <= `${dateTo}T23:59:59Z`);
    }

    return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [
    search,
    levelFilter,
    serviceFilter,
    hotelFilter,
    dateFrom,
    dateTo,
  ]);

  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return filteredLogs.slice(start, start + ROWS_PER_PAGE);
  }, [filteredLogs, page]);

  const totalPages = Math.ceil(filteredLogs.length / ROWS_PER_PAGE);

  const stats = useMemo(() => ({
    total: systemLogs.length,
    errors: systemLogs.filter((l) => l.level === 'error').length,
    critical: systemLogs.filter((l) => l.level === 'critical').length,
    warnings: systemLogs.filter((l) => l.level === 'warning').length,
  }), []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Логи и ошибки</h1>
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
        </span>
      </div>

      {/* Error Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-gray-100 p-2.5">
              <Activity className="h-5 w-5 text-gray-600" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">Все логи</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-red-100 p-2.5">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">Ошибки</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.errors}</p>
        </div>

        <div className="stat-card bg-red-50/80 border-red-200">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-red-200 p-2.5">
              <AlertCircle className="h-5 w-5 text-red-700" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-red-700">Критические</p>
          <p className="mt-1 text-2xl font-bold text-red-800">{stats.critical}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-amber-100 p-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">Предупреждения</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.warnings}</p>
        </div>
      </div>

      {/* Errors by Service Chart */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          Ошибки по сервисам
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={errorsByService}
              layout="vertical"
              margin={{ left: 0, right: 60 }}
            >
              <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="service"
                width={120}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}
                formatter={(value: number) => [value, 'Ошибок']}
              />
              <Bar dataKey="count" fill="#dc2626" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          {errorsByService.map((item) => (
            <div
              key={item.service}
              className="flex items-center gap-2 text-sm text-gray-600"
            >
              <span className="font-medium">{item.service}</span>
              <span>{item.count}</span>
              <TrendIcon trend={item.trend} />
            </div>
          ))}
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по сообщению или деталям..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input-field pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-600">Уровень:</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {(['all', 'info', 'warning', 'error', 'critical'] as const).map(
            (lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  setLevelFilter(lvl);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  levelFilter === lvl
                    ? lvl === 'all'
                      ? 'bg-gray-800 text-white'
                      : lvl === 'critical'
                        ? 'bg-red-600 text-white'
                        : lvl === 'error'
                          ? 'bg-red-500 text-white'
                          : lvl === 'warning'
                            ? 'bg-amber-500 text-white'
                            : 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {lvl === 'all' ? 'Все' : levelLabels[lvl]}
              </button>
            )
          )}
        </div>

        <select
          value={serviceFilter}
          onChange={(e) => {
            setServiceFilter(e.target.value);
            setPage(1);
          }}
          className="input-field w-40"
        >
          <option value="all">Сервис: все</option>
          {uniqueServices.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={hotelFilter}
          onChange={(e) => {
            setHotelFilter(e.target.value);
            setPage(1);
          }}
          className="input-field w-48"
        >
          <option value="all">Отель: все</option>
          {uniqueHotels.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="input-field w-36"
          />
          <span className="text-gray-400">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="input-field w-36"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/80">
                <th className="px-5 py-3 text-left font-medium text-gray-600">
                  Время
                </th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">
                  Уровень
                </th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">
                  Сервис
                </th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">
                  Сообщение
                </th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">
                  Отель
                </th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">
                  Request ID
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log, idx) => (
                <Fragment key={log.id}>
                  <tr
                    key={log.id}
                    onClick={() =>
                      setExpandedRow(expandedRow === log.id ? null : log.id)
                    }
                    className={`cursor-pointer border-b last:border-0 transition-colors ${
                      log.level === 'critical'
                        ? 'bg-red-50/50 hover:bg-red-50'
                        : idx % 2 === 0
                          ? 'bg-white hover:bg-gray-50/50'
                          : 'bg-gray-50/30 hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-5 py-3 text-gray-600">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={levelBadgeClass(log.level)}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="badge badge-gray">{log.service}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{log.message}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {log.hotelName ?? '—'}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">
                      {log.requestId}
                    </td>
                  </tr>
                  {expandedRow === log.id && (
                    <tr>
                      <td
                        colSpan={6}
                        className="bg-gray-100/80 px-5 py-3 text-gray-600"
                      >
                        <div className="flex items-start gap-2">
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                          <pre className="whitespace-pre-wrap break-words font-sans text-sm">
                            {log.details}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-5 py-3">
          <p className="text-sm text-gray-500">
            Показано{' '}
            {(page - 1) * ROWS_PER_PAGE + 1}–
            {Math.min(page * ROWS_PER_PAGE, filteredLogs.length)} из{' '}
            {filteredLogs.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Назад
            </button>
            <span className="text-sm font-medium text-gray-600">
              {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Вперёд
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
