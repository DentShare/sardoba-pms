'use client';

import { useCounter } from '@/lib/hooks';
import { BuildingIcon, UsersIcon, GlobeIcon, StarIcon } from './icons';

const STATS = [
  {
    icon: BuildingIcon,
    end: 150,
    suffix: '+',
    label: 'Отелей подключено',
    desc: 'По всему Узбекистану',
  },
  {
    icon: UsersIcon,
    end: 12000,
    suffix: '+',
    label: 'Гостей обслужено',
    desc: 'За последний год',
  },
  {
    icon: GlobeIcon,
    end: 98,
    suffix: '%',
    label: 'Uptime сервиса',
    desc: 'Надёжность 24/7',
  },
  {
    icon: StarIcon,
    end: 4.9,
    isDecimal: true,
    suffix: '/5',
    label: 'Рейтинг клиентов',
    desc: 'Средняя оценка',
  },
];

function StatItem({
  icon: Icon,
  end,
  suffix,
  label,
  desc,
  isDecimal,
}: (typeof STATS)[0] & { isDecimal?: boolean }) {
  const { count, ref, isVisible } = useCounter(
    isDecimal ? Math.round(end * 10) : end,
    2500
  );

  const displayValue = isDecimal ? (count / 10).toFixed(1) : count.toLocaleString();

  return (
    <div
      ref={ref}
      className={`text-center transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      <div className="w-14 h-14 rounded-2xl bg-sardoba-gold/10 flex items-center justify-center mx-auto mb-4">
        <Icon size={24} className="text-sardoba-gold" />
      </div>
      <div className="text-4xl sm:text-5xl font-bold text-sardoba-dark mb-1">
        {displayValue}
        <span className="text-sardoba-gold">{suffix}</span>
      </div>
      <div className="text-base font-medium text-sardoba-dark/80">{label}</div>
      <div className="text-sm text-sardoba-dark/40">{desc}</div>
    </div>
  );
}

export function Stats() {
  return (
    <section className="py-20 lg:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {STATS.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
