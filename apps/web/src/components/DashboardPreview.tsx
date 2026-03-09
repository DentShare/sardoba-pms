'use client';

import { useRef, useState } from 'react';
import { useScrollReveal } from '@/lib/hooks';

export function DashboardPreview() {
  const { ref, isVisible } = useScrollReveal(0.1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -4, y: x * 4 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <section id="dashboard" className="py-24 lg:py-32 bg-gradient-to-b from-sardoba-cream to-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div
          ref={ref}
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-800 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-sardoba-blue/10 text-sardoba-blue text-sm font-medium mb-4">
            Живой дашборд
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-sardoba-dark mb-4 text-balance">
            Вся информация{' '}
            <span className="text-gradient">на одном экране</span>
          </h2>
          <p className="text-lg text-sardoba-dark/50">
            Наглядный дашборд с ключевыми метриками вашего отеля в реальном времени
          </p>
        </div>

        {/* Dashboard mockup with perspective tilt */}
        <div
          ref={containerRef}
          className={`relative max-w-5xl mx-auto transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'
          }`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${isVisible ? 'scale(1)' : 'scale(0.95)'}`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          {/* Animated glow behind */}
          <div className="absolute -inset-4 bg-gradient-to-r from-sardoba-gold/20 via-sardoba-blue/20 to-sardoba-gold/20 rounded-3xl blur-2xl opacity-60 animate-glow-pulse" />

          {/* Main container */}
          <div className="relative rounded-2xl overflow-hidden border border-sardoba-sand-dark/30 shadow-premium bg-sardoba-dark">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-sardoba-dark-light border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-400/80" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-white/30 text-xs">app.sardoba.uz/dashboard</span>
              </div>
            </div>

            {/* Dashboard content */}
            <div className="p-6 space-y-6">
              {/* Top stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AnimatedStatCard label="Загрузка" value="87%" trend="+12%" color="text-emerald-400" delay={0} isVisible={isVisible} />
                <AnimatedStatCard label="Выручка" value="48.2M" trend="+8%" color="text-sardoba-gold" suffix=" сум" delay={100} isVisible={isVisible} />
                <AnimatedStatCard label="Бронирования" value="156" trend="+23" color="text-sky-400" delay={200} isVisible={isVisible} />
                <AnimatedStatCard label="ADR" value="420K" trend="+5%" color="text-violet-400" suffix=" сум" delay={300} isVisible={isVisible} />
              </div>

              {/* Chart area + side panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Chart with animated bars */}
                <div className="md:col-span-2 glass-card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white/70 text-sm font-medium">Загрузка по месяцам</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-sardoba-gold animate-pulse" />
                      <span className="text-white/30 text-xs">Обновляется</span>
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-2 h-32">
                    {[40, 55, 65, 72, 85, 90, 87, 92, 78, 70, 60, 45].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t transition-all duration-700 hover:opacity-80 cursor-pointer group/bar relative"
                        style={{
                          height: isVisible ? `${h}%` : '0%',
                          background: h > 80
                            ? 'linear-gradient(to top, #D4A843, #E8C97A)'
                            : 'linear-gradient(to top, rgba(212,168,67,0.3), rgba(212,168,67,0.5))',
                          transitionDelay: `${i * 80 + 500}ms`,
                        }}
                      >
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-white/10 text-[10px] text-white/70 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {h}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2">
                    {['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'].map((m) => (
                      <span key={m} className="text-[10px] text-white/20 flex-1 text-center">{m}</span>
                    ))}
                  </div>
                </div>

                {/* Side bookings panel */}
                <div className="glass-card p-4">
                  <span className="text-white/70 text-sm font-medium block mb-3">Последние брони</span>
                  <div className="space-y-3">
                    <BookingRow name="Иванов А." room="Suite 201" status="confirmed" amount="2.1M" />
                    <BookingRow name="Kim S." room="Double 105" status="checked_in" amount="840K" />
                    <BookingRow name="Mueller H." room="Family 301" status="new" amount="1.5M" />
                    <BookingRow name="Алиев Б." room="Single 102" status="confirmed" amount="420K" />
                  </div>
                </div>
              </div>

              {/* Calendar row */}
              <div className="glass-card p-4">
                <span className="text-white/70 text-sm font-medium block mb-3">Календарь номеров — Март 2026</span>
                <div className="space-y-2">
                  <CalendarRow room="Suite 201" bookings={[{ start: 2, end: 8, guest: 'Иванов', color: 'bg-sardoba-gold/60' }, { start: 12, end: 18, guest: 'Kim', color: 'bg-sky-500/60' }]} isVisible={isVisible} />
                  <CalendarRow room="Double 105" bookings={[{ start: 1, end: 5, guest: 'Mueller', color: 'bg-emerald-500/60' }, { start: 10, end: 22, guest: 'Алиев', color: 'bg-violet-500/60' }]} isVisible={isVisible} />
                  <CalendarRow room="Family 301" bookings={[{ start: 5, end: 15, guest: 'Петров', color: 'bg-rose-500/60' }]} isVisible={isVisible} />
                </div>
              </div>
            </div>
          </div>

          {/* Reflection effect */}
          <div className="absolute -bottom-20 left-[10%] right-[10%] h-20 bg-gradient-to-b from-sardoba-dark/10 to-transparent blur-xl rounded-full" />
        </div>
      </div>
    </section>
  );
}

function AnimatedStatCard({
  label,
  value,
  trend,
  color,
  suffix = '',
  delay,
  isVisible,
}: {
  label: string;
  value: string;
  trend: string;
  color: string;
  suffix?: string;
  delay: number;
  isVisible: boolean;
}) {
  return (
    <div
      className={`glass-card p-4 transition-all duration-500 hover:bg-white/12 group/stat cursor-pointer ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className="text-white/40 text-xs">{label}</span>
      <div className="flex items-baseline gap-1 mt-1">
        <span className={`text-xl font-bold ${color} transition-all group-hover/stat:scale-105 origin-left`}>{value}</span>
        <span className="text-white/30 text-xs">{suffix}</span>
      </div>
      <span className="text-emerald-400/70 text-xs mt-1 block">{trend}</span>
    </div>
  );
}

function BookingRow({
  name,
  room,
  status,
  amount,
}: {
  name: string;
  room: string;
  status: string;
  amount: string;
}) {
  const statusColors: Record<string, string> = {
    new: 'bg-sardoba-gold/20 text-sardoba-gold',
    confirmed: 'bg-emerald-500/20 text-emerald-400',
    checked_in: 'bg-sky-500/20 text-sky-400',
  };

  const statusLabels: Record<string, string> = {
    new: 'Новая',
    confirmed: 'Подтв.',
    checked_in: 'Заселён',
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 hover:bg-white/5 rounded px-1 -mx-1 transition-colors cursor-pointer">
      <div>
        <span className="text-white/80 text-sm block">{name}</span>
        <span className="text-white/30 text-xs">{room}</span>
      </div>
      <div className="text-right">
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[status]}`}>
          {statusLabels[status]}
        </span>
        <span className="text-white/40 text-xs block mt-1">{amount} сум</span>
      </div>
    </div>
  );
}

function CalendarRow({
  room,
  bookings,
  isVisible,
}: {
  room: string;
  bookings: Array<{ start: number; end: number; guest: string; color: string }>;
  isVisible: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-white/50 text-xs w-20 shrink-0 truncate">{room}</span>
      <div className="relative flex-1 h-6 bg-white/5 rounded overflow-hidden">
        {bookings.map((b, i) => (
          <div
            key={i}
            className={`absolute top-0.5 bottom-0.5 ${b.color} rounded text-[9px] text-white/80 flex items-center px-1 truncate transition-all duration-700 hover:brightness-125 cursor-pointer`}
            style={{
              left: `${(b.start / 31) * 100}%`,
              width: isVisible ? `${((b.end - b.start) / 31) * 100}%` : '0%',
              transitionDelay: `${800 + i * 200}ms`,
            }}
          >
            {b.guest}
          </div>
        ))}
      </div>
    </div>
  );
}
