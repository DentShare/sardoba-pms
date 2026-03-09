'use client';

import { useCounter, useParallax } from '@/lib/hooks';
import { BuildingIcon, UsersIcon, GlobeIcon, StarIcon } from './icons';

const STATS = [
  {
    icon: BuildingIcon,
    end: 150,
    suffix: '+',
    label: 'Отелей подключено',
    desc: 'По всему Узбекистану',
    color: '#D4A843',
    progress: 75,
  },
  {
    icon: UsersIcon,
    end: 12000,
    suffix: '+',
    label: 'Гостей обслужено',
    desc: 'За последний год',
    color: '#2A4F7F',
    progress: 85,
  },
  {
    icon: GlobeIcon,
    end: 98,
    suffix: '%',
    label: 'Uptime сервиса',
    desc: 'Надёжность 24/7',
    color: '#10b981',
    progress: 98,
  },
  {
    icon: StarIcon,
    end: 4.9,
    isDecimal: true,
    suffix: '/5',
    label: 'Рейтинг клиентов',
    desc: 'Средняя оценка',
    color: '#E8C97A',
    progress: 98,
  },
];

function RadialProgress({
  progress,
  color,
  isVisible,
}: {
  progress: number;
  color: string;
  isVisible: boolean;
}) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-sardoba-sand-dark/20"
        strokeWidth="3"
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={isVisible ? offset : circumference}
        style={{ transition: 'stroke-dashoffset 2s ease-out' }}
      />
    </svg>
  );
}

function StatItem({
  icon: Icon,
  end,
  suffix,
  label,
  desc,
  isDecimal,
  color,
  progress,
}: (typeof STATS)[0] & { isDecimal?: boolean }) {
  const { count, ref, isVisible } = useCounter(
    isDecimal ? Math.round(end * 10) : end,
    2500
  );

  const displayValue = isDecimal ? (count / 10).toFixed(1) : count.toLocaleString();

  return (
    <div
      ref={ref}
      className={`text-center transition-all duration-700 group cursor-pointer ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      {/* Radial progress ring around icon */}
      <div className="relative w-20 h-20 mx-auto mb-4">
        <RadialProgress progress={progress} color={color} isVisible={isVisible} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-sardoba-gold/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <Icon size={24} className="text-sardoba-gold" />
          </div>
        </div>
      </div>

      <div className="text-4xl sm:text-5xl font-bold text-sardoba-dark mb-1 transition-all duration-300 group-hover:scale-105">
        {displayValue}
        <span className="text-sardoba-gold">{suffix}</span>
      </div>
      <div className="text-base font-medium text-sardoba-dark/80">{label}</div>
      <div className="text-sm text-sardoba-dark/40">{desc}</div>
    </div>
  );
}

export function Stats() {
  const { ref: parallaxRef, offset } = useParallax(0.1);

  return (
    <section className="py-20 lg:py-24 bg-white relative overflow-hidden">
      {/* Parallax background decoration */}
      <div
        ref={parallaxRef}
        className="absolute inset-0 pointer-events-none"
        style={{ transform: `translateY(${offset * 0.3}px)` }}
      >
        <div className="absolute top-10 left-[5%] w-32 h-32 rounded-full bg-sardoba-gold/5 blur-2xl" />
        <div className="absolute bottom-10 right-[10%] w-40 h-40 rounded-full bg-sardoba-blue/5 blur-2xl" />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {STATS.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
