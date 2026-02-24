'use client';

import { useState, useMemo, useCallback } from 'react';
import { subDays, format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import {
  getSummary,
  getOccupancy,
  getRevenue,
  getSources,
  getRoomStats,
  exportReport,
  type AnalyticsParams,
  type OccupancyData,
  type RevenueData,
  type SourceData,
  type RoomStatsData,
} from '@/lib/api/analytics';
import { formatMoney, formatMoneyCompact } from '@/lib/utils/money';
import { SOURCE_COLORS } from '@/lib/utils/booking-colors';

const PROPERTY_ID = 1;

type PeriodKey = '7d' | '30d' | '90d' | 'custom';

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
  { value: '90d', label: '90 дней' },
  { value: 'custom', label: 'Свой период' },
];

// ---- Simple chart components (SVG-based, no external deps) ----

function BarChart({
  data,
  maxValue,
  labelKey,
  valueKey,
  barColor = '#D4A843',
}: {
  data: Array<Record<string, unknown>>;
  maxValue: number;
  labelKey: string;
  valueKey: string;
  barColor?: string;
}) {
  if (!data.length) return null;
  const barWidth = 100 / data.length;

  return (
    <div className="h-48 flex items-end gap-1">
      {data.map((item, i) => {
        const val = Number(item[valueKey]) || 0;
        const height = maxValue > 0 ? (val / maxValue) * 100 : 0;
        return (
          <div
            key={i}
            className="flex flex-col items-center flex-1 min-w-0"
            title={`${item[labelKey]}: ${val}`}
          >
            <div
              className="w-full rounded-t-sm transition-all"
              style={{
                height: `${Math.max(height, 2)}%`,
                backgroundColor: barColor,
                minHeight: '2px',
              }}
            />
            <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">
              {String(item[labelKey]).slice(-5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBar({
  items,
}: {
  items: Array<{ label: string; value: number; maxValue: number; color: string }>;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-700 truncate">{item.label}</span>
            <span className="font-medium text-gray-900 ml-2">{formatMoneyCompact(item.value)}</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${item.maxValue > 0 ? (item.value / item.maxValue) * 100 : 0}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function PieChart({ data }: { data: SourceData[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <div className="text-center text-sm text-gray-500 py-8">Нет данных</div>;

  const colors = ['#1E3A5F', '#D4A843', '#E8673C', '#22c55e', '#8b5cf6', '#94a3b8'];
  let cumulative = 0;

  const segments = data.map((item, i) => {
    const pct = item.count / total;
    const start = cumulative;
    cumulative += pct;
    return { ...item, start, pct, color: colors[i % colors.length] };
  });

  // SVG donut chart
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex items-center gap-6">
      <svg width="120" height="120" viewBox="0 0 100 100" className="shrink-0">
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth="18"
            strokeDasharray={`${seg.pct * circumference} ${circumference}`}
            strokeDashoffset={-seg.start * circumference}
            transform="rotate(-90 50 50)"
          />
        ))}
      </svg>
      <div className="space-y-2 min-w-0">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-700 truncate">
              {SOURCE_COLORS[seg.source as keyof typeof SOURCE_COLORS]?.label || seg.source}
            </span>
            <span className="font-medium text-gray-900 ml-auto">
              {Math.round(seg.percentage)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ data, labelKey, valueKey, color = '#1E3A5F' }: {
  data: Array<Record<string, unknown>>;
  labelKey: string;
  valueKey: string;
  color?: string;
}) {
  if (!data.length) return null;

  const values = data.map((d) => Number(d[valueKey]) || 0);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  const width = 400;
  const height = 150;
  const padding = 10;

  const points = data.map((_, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - ((values[i] - minVal) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${padding + ((data.length - 1) / (data.length - 1 || 1)) * (width - 2 * padding)},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#areaGradient)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" />
      {data.map((_, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
        const y = height - padding - ((values[i] - minVal) / range) * (height - 2 * padding);
        return (
          <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
        );
      })}
    </svg>
  );
}

// ---- KPI Card ----

function KpiCard({
  title,
  value,
  delta,
  deltaLabel,
  icon,
}: {
  title: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  icon: React.ReactNode;
}) {
  const isPositive = (delta ?? 0) >= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-sardoba-sand-light rounded-lg text-sardoba-blue">
          {icon}
        </div>
        {delta !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
            isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
          )}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ transform: isPositive ? 'none' : 'rotate(180deg)' }}
            >
              <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
            </svg>
            {Math.abs(delta).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{title}</div>
    </div>
  );
}

// ---- Main Page ----

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { dateFrom, dateTo, compareDateFrom, compareDateTo } = useMemo(() => {
    const now = new Date();
    let days = 30;
    if (period === '7d') days = 7;
    if (period === '90d') days = 90;

    if (period === 'custom' && customFrom && customTo) {
      return {
        dateFrom: customFrom,
        dateTo: customTo,
        compareDateFrom: undefined,
        compareDateTo: undefined,
      };
    }

    const from = format(subDays(now, days), 'yyyy-MM-dd');
    const to = format(now, 'yyyy-MM-dd');
    const compFrom = format(subDays(now, days * 2), 'yyyy-MM-dd');
    const compTo = format(subDays(now, days), 'yyyy-MM-dd');

    return {
      dateFrom: from,
      dateTo: to,
      compareDateFrom: compFrom,
      compareDateTo: compTo,
    };
  }, [period, customFrom, customTo]);

  const analyticsParams: AnalyticsParams = {
    propertyId: PROPERTY_ID,
    dateFrom,
    dateTo,
    compareDateFrom,
    compareDateTo,
  };

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['analytics', 'summary', analyticsParams],
    queryFn: () => getSummary(analyticsParams),
    enabled: !!dateFrom && !!dateTo,
  });

  const { data: occupancy } = useQuery({
    queryKey: ['analytics', 'occupancy', analyticsParams],
    queryFn: () => getOccupancy(analyticsParams),
    enabled: !!dateFrom && !!dateTo,
  });

  const { data: revenue } = useQuery({
    queryKey: ['analytics', 'revenue', analyticsParams],
    queryFn: () => getRevenue(analyticsParams),
    enabled: !!dateFrom && !!dateTo,
  });

  const { data: sources } = useQuery({
    queryKey: ['analytics', 'sources', analyticsParams],
    queryFn: () => getSources(analyticsParams),
    enabled: !!dateFrom && !!dateTo,
  });

  const { data: roomStats } = useQuery({
    queryKey: ['analytics', 'rooms', analyticsParams],
    queryFn: () => getRoomStats(analyticsParams),
    enabled: !!dateFrom && !!dateTo,
  });

  const handleExport = useCallback(async () => {
    try {
      const blob = await exportReport({
        propertyId: PROPERTY_ID,
        dateFrom,
        dateTo,
        format: 'xlsx',
        sections: ['summary', 'occupancy', 'revenue', 'sources', 'rooms'],
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${dateFrom}_${dateTo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Отчет скачан');
    } catch {
      toast.error('Ошибка при экспорте');
    }
  }, [dateFrom, dateTo]);

  // Compute deltas
  const occupancyDelta = summary?.compare?.occupancyRate !== undefined
    ? summary.occupancyRate - summary.compare.occupancyRate
    : undefined;

  const revenueDelta = summary?.compare?.revenue !== undefined && summary.compare.revenue > 0
    ? ((summary.revenue - summary.compare.revenue) / summary.compare.revenue) * 100
    : undefined;

  const adrDelta = summary?.compare?.adr !== undefined && summary.compare.adr > 0
    ? ((summary.adr - summary.compare.adr) / summary.compare.adr) * 100
    : undefined;

  const revparDelta = summary?.compare?.revpar !== undefined && summary.compare.revpar > 0
    ? ((summary.revpar - summary.compare.revpar) / summary.compare.revpar) * 100
    : undefined;

  const maxRevenue = revenue
    ? Math.max(...revenue.map((r) => r.revenue), 1)
    : 1;

  const topRooms = (roomStats || [])
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const maxRoomRevenue = topRooms.length > 0 ? topRooms[0].revenue : 1;

  const roomColors = ['#1E3A5F', '#D4A843', '#E8673C', '#22c55e', '#8b5cf6'];

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Аналитика"
        actions={
          <Button
            variant="outline"
            onClick={handleExport}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            }
          >
            Экспорт Excel
          </Button>
        }
      />

      {/* Period selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                period === opt.value
                  ? 'bg-white text-sardoba-blue shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
        )}
      </div>

      {loadingSummary ? (
        <PageSpinner />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              title="Загрузка"
              value={`${summary?.occupancyRate?.toFixed(1) ?? '0'}%`}
              delta={occupancyDelta}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
                </svg>
              }
            />
            <KpiCard
              title="Выручка"
              value={summary ? formatMoneyCompact(summary.revenue) : '0'}
              delta={revenueDelta}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
            />
            <KpiCard
              title="ADR"
              value={summary ? formatMoney(summary.adr) : '0'}
              delta={adrDelta}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" /><path d="M7 12l4-4 4 4 4-8" />
                </svg>
              }
            />
            <KpiCard
              title="RevPAR"
              value={summary ? formatMoney(summary.revpar) : '0'}
              delta={revparDelta}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" />
                </svg>
              }
            />
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Occupancy chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Загрузка по дням, %
              </h3>
              {occupancy && occupancy.length > 0 ? (
                <LineChart
                  data={occupancy as unknown as Array<Record<string, unknown>>}
                  labelKey="date"
                  valueKey="rate"
                  color="#1E3A5F"
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-gray-500">
                  Нет данных
                </div>
              )}
            </div>

            {/* Revenue chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Выручка по дням
              </h3>
              {revenue && revenue.length > 0 ? (
                <BarChart
                  data={revenue as unknown as Array<Record<string, unknown>>}
                  maxValue={maxRevenue}
                  labelKey="date"
                  valueKey="revenue"
                  barColor="#D4A843"
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-gray-500">
                  Нет данных
                </div>
              )}
            </div>

            {/* Sources pie chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Источники бронирований
              </h3>
              {sources && sources.length > 0 ? (
                <PieChart data={sources} />
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-gray-500">
                  Нет данных
                </div>
              )}
            </div>

            {/* Top rooms by revenue */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Топ номеров по выручке
              </h3>
              {topRooms.length > 0 ? (
                <HorizontalBar
                  items={topRooms.map((r, i) => ({
                    label: r.roomName,
                    value: r.revenue,
                    maxValue: maxRoomRevenue,
                    color: roomColors[i % roomColors.length],
                  }))}
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-gray-500">
                  Нет данных
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
