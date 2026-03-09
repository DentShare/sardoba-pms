'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  CreditCard,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { subscriptions, Subscription, formatUZS, formatDate, planConfigs, PlanId } from '@/lib/mock-data';

const planLabels: Record<PlanId, string> = {
  starter: 'Starter',
  standard: 'Standard',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

const planBadge: Record<PlanId, string> = {
  starter: 'badge badge-gray',
  standard: 'badge badge-blue',
  professional: 'badge badge-purple',
  enterprise: 'badge badge-green',
};

const planPrice: Record<PlanId, string> = {
  starter: '150 000 сум/мес',
  standard: '350 000 сум/мес',
  professional: '700 000 сум/мес',
  enterprise: 'Индивидуально',
};

const statusLabels: Record<Subscription['status'], string> = {
  active: 'Активна',
  trial: 'Триал',
  expired: 'Истекла',
  cancelled: 'Отменена',
};

const statusBadge: Record<Subscription['status'], string> = {
  active: 'badge badge-green',
  trial: 'badge badge-yellow',
  expired: 'badge badge-red',
  cancelled: 'badge badge-gray',
};

const PAGE_SIZE = 20;

export default function SubscriptionsPage() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return subscriptions.filter((s) => {
      const matchSearch = !search || s.hotelName.toLowerCase().includes(search.toLowerCase());
      const matchPlan = planFilter === 'all' || s.plan === planFilter;
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchPlan && matchStatus;
    });
  }, [search, planFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === 'active');
    const trial = subscriptions.filter((s) => s.status === 'trial');
    const mrr = active.reduce((a, s) => a + s.amount, 0);
    const arr = mrr * 12;
    return {
      mrr,
      arr,
      activeCount: active.length,
      trialCount: trial.length,
      expiredCount: subscriptions.filter((s) => s.status === 'expired').length,
      churnRate: 4.2,
      byPlan: {
        starter: subscriptions.filter((s) => s.plan === 'starter').length,
        standard: subscriptions.filter((s) => s.plan === 'standard').length,
        professional: subscriptions.filter((s) => s.plan === 'professional').length,
        enterprise: subscriptions.filter((s) => s.plan === 'enterprise').length,
      },
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Подписки и биллинг</h1>
          <p className="text-sm text-gray-500 mt-1">Управление тарифами и платежами</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            MRR
          </div>
          <p className="text-2xl font-bold text-brand-600">{formatUZS(stats.mrr)}</p>
          <p className="text-xs text-gray-400 mt-1">ARR: {formatUZS(stats.arr)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Активные подписки
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.activeCount}</p>
          <p className="text-xs text-gray-400 mt-1">Триал: {stats.trialCount}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <XCircle className="w-4 h-4 text-red-500" />
            Истекшие
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.expiredCount}</p>
          <p className="text-xs text-gray-400 mt-1">Требуют внимания</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Churn rate
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.churnRate}%</p>
          <p className="text-xs text-gray-400 mt-1">За последний месяц</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.entries(stats.byPlan) as [PlanId, number][]).map(([plan, count]) => {
          const config = planConfigs[plan];
          return (
            <div key={plan} className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={planBadge[plan]}>{planLabels[plan]}</span>
                <div className="text-right">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-gray-400">отелей</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">{planPrice[plan]}</p>
              <div className="mt-2 pt-2 border-t space-y-1">
                <p className="text-xs text-gray-400">
                  Номеров: до {config.maxRooms ?? '∞'} | Польз.: {config.maxUsers ?? '∞'} | OTA: {config.maxOtaChannels ?? '50+'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Поиск по названию отеля..."
            className="input-field pl-10"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="input-field w-auto"
        >
          <option value="all">Все планы</option>
          <option value="starter">Starter</option>
          <option value="standard">Standard</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field w-auto"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="trial">Триал</option>
          <option value="expired">Истекшие</option>
          <option value="cancelled">Отменённые</option>
        </select>
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-500">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Отель</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">План</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Использование</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Окончание</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Сумма/мес</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Оплата</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Авто</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Действия</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{s.id}</td>
                  <td className="px-4 py-3 font-medium">{s.hotelName}</td>
                  <td className="px-4 py-3">
                    <span className={planBadge[s.plan]}>{planLabels[s.plan]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadge[s.status]}>{statusLabels[s.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const config = planConfigs[s.plan];
                      const maxR = config.maxRooms;
                      const roomPct = maxR ? Math.round((s.roomsUsed / maxR) * 100) : 0;
                      return (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-gray-500 w-12">Ном.:</span>
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-16">
                              <div
                                className={`h-full rounded-full ${roomPct > 85 ? 'bg-red-500' : roomPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${maxR ? roomPct : 20}%` }}
                              />
                            </div>
                            <span className="text-gray-600 font-mono">{s.roomsUsed}/{maxR ?? '∞'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-gray-500 w-12">OTA:</span>
                            <span className="text-gray-600 font-mono">{s.otaChannelsUsed}/{config.maxOtaChannels ?? '50+'}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(s.endDate)}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {s.amount > 0 ? formatUZS(s.amount) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge badge-gray">{s.paymentMethod}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.autoRenew ? (
                      <RefreshCw className="w-4 h-4 text-emerald-500 mx-auto" />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-600" title="Изменить план">
                        <CreditCard className="w-4 h-4" />
                      </button>
                      {s.status === 'expired' && (
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-amber-500 hover:text-amber-600" title="Продлить">
                          <Clock className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          <p className="text-sm text-gray-500">Показано {paginated.length} из {filtered.length}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-white border disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 min-w-[80px] text-center">{page} из {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg hover:bg-white border disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
