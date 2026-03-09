'use client';

import { useSystemHealth } from '@/lib/hooks';
import {
  HeartPulse,
  Server,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; bg: string; border: string; text: string; dot: string }> = {
  healthy: { label: 'Работает', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  degraded: { label: 'Деградация', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500 animate-pulse' },
  down: { label: 'Не работает', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500 animate-pulse' },
};

export default function SystemHealthPage() {
  const { data: health, isLoading, error, refetch, isFetching } = useSystemHealth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <span className="ml-3 text-gray-500">Проверка систем...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <span className="ml-3 text-red-600">Не удалось загрузить состояние систем</span>
      </div>
    );
  }

  const services = health?.services ?? [];
  const timestamp = health?.timestamp ? new Date(health.timestamp).toLocaleString('ru-RU') : '';

  const healthyCount = services.filter((s: any) => s.status === 'healthy').length;
  const degradedCount = services.filter((s: any) => s.status === 'degraded').length;
  const downCount = services.filter((s: any) => s.status === 'down').length;

  const overallStatus = downCount > 0 ? 'down' : degradedCount > 0 ? 'degraded' : 'healthy';
  const overallConfig = statusConfig[overallStatus];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Здоровье системы</h1>
          <p className="text-sm text-gray-500 mt-1">Мониторинг сервисов и инфраструктуры платформы</p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-secondary"
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Overall Status Banner */}
      <div className={`rounded-xl border p-5 ${overallConfig.bg} ${overallConfig.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${overallConfig.dot}`} />
            <div>
              <p className={`text-lg font-bold ${overallConfig.text}`}>
                {overallStatus === 'healthy' ? 'Все системы работают нормально' :
                 overallStatus === 'degraded' ? 'Обнаружена деградация сервисов' :
                 'Критический сбой!'}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">
                {healthyCount} из {services.length} сервисов работают нормально
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Обновлено</p>
            <p className="text-sm font-medium text-gray-700">{timestamp}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-gray-500">Здоровы</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{healthyCount}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-gray-500">Деградация</span>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{degradedCount}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-red-500" />
            <span className="text-sm text-gray-500">Не работают</span>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-1">{downCount}</p>
        </div>
      </div>

      {/* Services Grid */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Статус сервисов</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service: any) => {
            const config = statusConfig[service.status] ?? statusConfig.healthy;
            return (
              <div key={service.name} className={`rounded-xl border p-4 ${config.bg} ${config.border}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                    <span className={`text-sm font-semibold ${config.text}`}>{config.label}</span>
                  </div>
                </div>
                <p className="font-medium text-gray-900 mt-2">{service.name}</p>
                <div className="mt-3 space-y-1 text-xs">
                  {service.responseTimeMs != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Отклик</span>
                      <span className="font-semibold text-gray-700">{service.responseTimeMs}ms</span>
                    </div>
                  )}
                  {service.uptime != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Uptime</span>
                      <span className="font-semibold text-gray-700">{Math.floor(service.uptime / 60)} мин</span>
                    </div>
                  )}
                  {service.memoryMb != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Память</span>
                      <span className="font-semibold text-gray-700">{service.memoryMb.toFixed(0)} MB</span>
                    </div>
                  )}
                  {service.details && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Отели</span>
                        <span className="font-semibold text-gray-700">{service.details.properties}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Пользователи</span>
                        <span className="font-semibold text-gray-700">{service.details.users}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Бронирования</span>
                        <span className="font-semibold text-gray-700">{service.details.bookings}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
