'use client';

import { useStats, useSystemHealth } from '@/lib/hooks';
import {
  Building2,
  TrendingUp,
  Activity,
  DollarSign,
  Users,
  HeartPulse,
  ArrowRight,
  BedDouble,
  CalendarCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

function formatUZS(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount / 100) + ' сум';
}

const statusDot = (status: string) => {
  switch (status) {
    case 'healthy': return 'bg-emerald-500';
    case 'degraded': return 'bg-amber-500 animate-pulse';
    case 'down': return 'bg-red-500 animate-pulse';
    default: return 'bg-gray-400';
  }
};

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      <span className="ml-3 text-gray-500">Загрузка данных...</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <AlertCircle className="h-8 w-8 text-red-500" />
      <span className="ml-3 text-red-600">{message}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useStats();
  const { data: health, isLoading: healthLoading } = useSystemHealth();

  if (statsLoading) return <LoadingState />;
  if (statsError) return <ErrorState message="Не удалось загрузить статистику" />;

  const services = health?.services ?? [];
  const degradedServices = services.filter((s: any) => s.status !== 'healthy');

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Командный центр</h1>
          <p className="mt-1 text-sm text-gray-500">
            Обзор платформы Sardoba PMS &middot; {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {degradedServices.length > 0 ? (
            <Link href="/system-health" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors">
              <AlertCircle className="h-4 w-4" />
              {degradedServices.length} сервис{degradedServices.length > 1 ? 'а' : ''} с проблемами
            </Link>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
              <HeartPulse className="h-4 w-4" />
              Все системы работают
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-blue-100 p-2.5">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">Общий доход</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatUZS(stats.totalRevenue)}</p>
          <p className="mt-1 text-xs text-gray-400">За весь период</p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-emerald-100 p-2.5">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">Доход за месяц</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatUZS(stats.monthlyRevenue)}</p>
          <p className="mt-1 text-xs text-gray-400">Текущий месяц</p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-violet-100 p-2.5">
              <Building2 className="h-5 w-5 text-violet-600" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">Отели</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalHotels}</p>
          <p className="mt-1 text-xs text-gray-400">Подключены к платформе</p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-cyan-100 p-2.5">
              <Users className="h-5 w-5 text-cyan-600" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">Пользователи</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
          <p className="mt-1 text-xs text-gray-400">{stats.totalRooms} номеров</p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-amber-100 p-2.5">
              <CalendarCheck className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">Бронирования</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
          <p className="mt-1 text-xs text-gray-400">{stats.activeBookings} активных</p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-rose-100 p-2.5">
              <BedDouble className="h-5 w-5 text-rose-600" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">Номера</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalRooms}</p>
          <p className="mt-1 text-xs text-gray-400">Всего на платформе</p>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* System Health */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-gray-600" />
              <h3 className="text-base font-semibold text-gray-900">Состояние систем</h3>
            </div>
            <Link href="/system-health" className="text-xs text-brand-600 hover:underline">
              Подробнее
            </Link>
          </div>
          <div className="p-4 space-y-2">
            {healthLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              services.map((service: any) => (
                <div key={service.name} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${statusDot(service.status)}`} />
                    <span className="text-sm text-gray-700">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {service.responseTimeMs != null && (
                      <span className="text-xs text-gray-400">{service.responseTimeMs}ms</span>
                    )}
                    {service.uptime != null && (
                      <span className="text-xs text-gray-400">uptime: {Math.floor(service.uptime / 60)}m</span>
                    )}
                    {service.memoryMb != null && (
                      <span className="text-xs text-gray-400">{service.memoryMb.toFixed(0)}MB</span>
                    )}
                    {service.details && (
                      <span className="text-xs text-gray-400">
                        {service.details.properties}p / {service.details.users}u / {service.details.bookings}b
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-600" />
              <h3 className="text-base font-semibold text-gray-900">Быстрые действия</h3>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <Link href="/hotels" className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-gray-400 group-hover:text-brand-600" />
                <span className="text-sm text-gray-700">Управление отелями</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-brand-600" />
            </Link>
            <Link href="/users" className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-gray-400 group-hover:text-brand-600" />
                <span className="text-sm text-gray-700">Управление пользователями</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-brand-600" />
            </Link>
            <Link href="/bookings" className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3">
                <CalendarCheck className="h-5 w-5 text-gray-400 group-hover:text-brand-600" />
                <span className="text-sm text-gray-700">Все бронирования</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-brand-600" />
            </Link>
            <Link href="/system-health" className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3">
                <HeartPulse className="h-5 w-5 text-gray-400 group-hover:text-brand-600" />
                <span className="text-sm text-gray-700">Состояние систем</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-brand-600" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
