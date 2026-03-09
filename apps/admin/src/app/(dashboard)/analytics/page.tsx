'use client';

import { useState } from 'react';
import {
  revenueByMonth,
  mrrHistory,
  bookingsBySource,
  hotelsByCity,
  hotels,
  subscriptions,
  formatUZS,
  planConfigs,
} from '@/lib/mock-data';
import {
  TrendingUp,
  DollarSign,
  Percent,
  Building2,
  Users,
  Zap,
  ArrowUpRight,
  Download,
} from 'lucide-react';
import {
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = {
  brand: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  red: '#ef4444',
};

const PIE_COLORS = ['#6B7280', '#2563EB', '#7C3AED', '#059669'];

const DATE_RANGES = [
  { key: '7', label: '7 дней' },
  { key: '30', label: '30 дней' },
  { key: '90', label: '90 дней' },
  { key: '365', label: 'Год' },
] as const;

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  standard: 'Standard',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

function occupancyColor(occupancy: number): string {
  if (occupancy >= 70) return 'bg-emerald-500';
  if (occupancy >= 50) return 'bg-amber-500';
  if (occupancy >= 30) return 'bg-amber-400';
  return 'bg-red-400';
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<string>('30');

  const totalRevenue = hotels.reduce((acc, h) => acc + h.monthlyRevenue, 0);
  const totalMRR = subscriptions.reduce((a, s) => a + s.amount, 0);
  const avgRevenuePerHotel = Math.round(totalRevenue / hotels.length);
  const trialConversion = 68;
  const churnRate = 4.2;
  const ltv = 5_040_000;

  const topHotels = [...hotels]
    .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
    .slice(0, 15);

  const planCounts = hotels.reduce(
    (acc, h) => {
      acc[h.plan] = (acc[h.plan] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const totalHotelsCount = hotels.length;
  const planDistribution = (['starter', 'standard', 'professional', 'enterprise'] as const).map(
    (plan) => ({
      plan: PLAN_LABELS[plan] || plan,
      count: planCounts[plan] || 0,
      percent: totalHotelsCount
        ? Math.round(((planCounts[plan] || 0) / totalHotelsCount) * 100)
        : 0,
      revenue: subscriptions.filter(s => s.plan === plan).reduce((a, s) => a + s.amount, 0),
    })
  );

  const planPieData = planDistribution.map(p => ({
    name: p.plan,
    value: p.count,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Аналитика платформы</h1>
          <p className="text-sm text-gray-500 mt-1">Метрики бизнеса и роста SaaS</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">
            <Download className="h-4 w-4" />
            Экспорт
          </button>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {DATE_RANGES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDateRange(key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  dateRange === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SaaS KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-brand-100 p-2.5">
              <DollarSign className="h-5 w-5 text-brand-500" />
            </div>
            <span className="flex items-center text-xs font-medium text-emerald-600">
              <TrendingUp className="mr-0.5 h-3 w-3" />+41%
            </span>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">MRR</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatUZS(totalMRR)}</p>
        </div>

        <div className="stat-card">
          <div className="rounded-lg bg-emerald-100 p-2.5 w-fit">
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">ARR</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatUZS(totalMRR * 12)}</p>
        </div>

        <div className="stat-card">
          <div className="rounded-lg bg-violet-100 p-2.5 w-fit">
            <Building2 className="h-5 w-5 text-violet-600" />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">Avg выр./отель</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatUZS(avgRevenuePerHotel)}</p>
        </div>

        <div className="stat-card">
          <div className="rounded-lg bg-amber-100 p-2.5 w-fit">
            <Zap className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">Конверсия триала</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{trialConversion}%</p>
        </div>

        <div className="stat-card">
          <div className="rounded-lg bg-red-100 p-2.5 w-fit">
            <Percent className="h-5 w-5 text-red-600" />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">Churn Rate</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{churnRate}%</p>
        </div>

        <div className="stat-card">
          <div className="rounded-lg bg-cyan-100 p-2.5 w-fit">
            <Users className="h-5 w-5 text-cyan-600" />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">LTV</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatUZS(ltv)}</p>
        </div>
      </div>

      {/* MRR + Hotels Trend Chart */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Динамика MRR и роста базы отелей</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={mrrHistory}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                formatter={(value: number, name: string) => {
                  if (name === 'MRR') return [formatUZS(value), name];
                  return [value, name];
                }}
              />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="mrr" fill={COLORS.brand} fillOpacity={0.15} stroke={COLORS.brand} strokeWidth={2} name="MRR" />
              <Line yAxisId="right" type="monotone" dataKey="hotels" stroke={COLORS.emerald} strokeWidth={2} dot={{ fill: COLORS.emerald, r: 4 }} name="Отелей" />
              <Bar yAxisId="right" dataKey="churned" fill={COLORS.red} radius={[4, 4, 0, 0]} name="Ушли" opacity={0.7} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row with charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Plan Distribution Pie */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Распределение по тарифам</h3>
          <div className="h-72 flex items-center">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {planPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-3">
              {planDistribution.map((item, i) => (
                <div key={item.plan} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-sm text-gray-700">{item.plan}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">{item.count}</span>
                    <span className="text-xs text-gray-400 ml-1">({item.percent}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bookings by Source */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Источники бронирований (все отели)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingsBySource} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="source" width={90} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value: number, _name: string, props: { payload?: { percent: number } }) => [
                    `${value} (${props.payload?.percent ?? 0}%)`,
                    'Бронирований',
                  ]}
                />
                <Bar dataKey="count" fill={COLORS.brand} radius={[0, 4, 4, 0]} name="Бронирований" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Revenue by City */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Отели по городам</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hotelsByCity}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
              <XAxis dataKey="city" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              <Bar dataKey="count" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Hotels by Revenue */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <Building2 className="h-5 w-5 text-gray-600" />
          <h3 className="text-base font-semibold text-gray-900">Топ-15 отелей по выручке</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/80">
                <th className="px-5 py-3 text-left font-medium text-gray-600">#</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Название</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Город</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Номера</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Загрузка</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Выручка/мес</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">Бронирования</th>
                <th className="px-5 py-3 text-left font-medium text-gray-600">План</th>
              </tr>
            </thead>
            <tbody>
              {topHotels.map((hotel, idx) => (
                <tr key={hotel.id} className="border-b last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-gray-400 font-mono">{idx + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{hotel.name}</td>
                  <td className="px-5 py-3 text-gray-600">{hotel.city}</td>
                  <td className="px-5 py-3 text-gray-600">{hotel.rooms}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
                        <div className={`h-full ${occupancyColor(hotel.occupancy)}`} style={{ width: `${hotel.occupancy}%` }} />
                      </div>
                      <span className="text-gray-700">{hotel.occupancy}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-700 font-medium">{formatUZS(hotel.monthlyRevenue)}</td>
                  <td className="px-5 py-3 text-gray-600">{hotel.totalBookings}</td>
                  <td className="px-5 py-3">
                    <span className="badge badge-purple">{PLAN_LABELS[hotel.plan]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue per Plan */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-gray-900">Доход по тарифам</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {planDistribution.map((item, i) => {
            const planColors = [
              'bg-gray-100 text-gray-700 border-gray-200',
              'bg-brand-50 text-brand-700 border-brand-200',
              'bg-purple-50 text-purple-700 border-purple-200',
              'bg-emerald-50 text-emerald-700 border-emerald-200',
            ];
            return (
              <div key={item.plan} className={`rounded-xl border p-4 ${planColors[i % planColors.length]}`}>
                <p className="text-sm font-medium text-gray-500">{item.plan}</p>
                <p className="mt-1 text-2xl font-bold">{item.count} отелей</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  MRR: {formatUZS(item.revenue)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
