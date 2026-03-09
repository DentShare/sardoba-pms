'use client';

import { useRef, useState } from 'react';
import { useScrollReveal } from '@/lib/hooks';
import {
  ShieldIcon, BedIcon, CalendarIcon, UsersIcon, TagIcon,
  CreditCardIcon, GlobeIcon, BellIcon, ChartIcon,
  ClockIcon, KeyIcon, ImageIcon, SettingsIcon, LayersIcon,
} from './icons';

const FEATURES = [
  {
    icon: ShieldIcon,
    title: 'Авторизация и роли',
    desc: 'JWT-аутентификация с ролями: владелец, админ, наблюдатель.',
    color: 'from-blue-500/20 to-indigo-500/20',
    accent: '#6366f1',
  },
  {
    icon: BedIcon,
    title: 'Управление номерами',
    desc: 'Типы, удобства, фото через Cloudinary. Полная карточка номера.',
    color: 'from-emerald-500/20 to-teal-500/20',
    accent: '#10b981',
  },
  {
    icon: CalendarIcon,
    title: 'Бронирования',
    desc: 'Визуальный календарь, статусы, check-in/check-out. Защита от овербукинга.',
    color: 'from-sardoba-gold/20 to-amber-500/20',
    accent: '#D4A843',
  },
  {
    icon: UsersIcon,
    title: 'База гостей',
    desc: 'Профили, история визитов, VIP-статусы. Шифрование паспортов.',
    color: 'from-violet-500/20 to-purple-500/20',
    accent: '#8b5cf6',
  },
  {
    icon: TagIcon,
    title: 'Гибкие тарифы',
    desc: 'Сезонные, выходные, long-stay тарифы. Автоматический расчёт.',
    color: 'from-rose-500/20 to-pink-500/20',
    accent: '#f43f5e',
  },
  {
    icon: CreditCardIcon,
    title: 'Payme / Click платежи',
    desc: 'Онлайн-оплаты через Payme и Click. Наличные и переводы.',
    color: 'from-cyan-500/20 to-sky-500/20',
    accent: '#06b6d4',
  },
  {
    icon: GlobeIcon,
    title: 'Channel Manager',
    desc: 'Booking.com, Airbnb, Ostrovok. iCal и API интеграция.',
    color: 'from-orange-500/20 to-amber-500/20',
    accent: '#f97316',
  },
  {
    icon: BellIcon,
    title: 'Telegram-уведомления',
    desc: 'Новые брони, отмены, дайджест дня — мгновенно в Telegram.',
    color: 'from-sky-500/20 to-blue-500/20',
    accent: '#0ea5e9',
  },
  {
    icon: ChartIcon,
    title: 'Аналитика и отчёты',
    desc: 'Загрузка, ADR, RevPAR, выручка. Графики для решений.',
    color: 'from-lime-500/20 to-green-500/20',
    accent: '#84cc16',
  },
  {
    icon: ClockIcon,
    title: 'Управление заездами',
    desc: 'Ранний заезд, поздний выезд. Автоматизация процесса.',
    color: 'from-amber-500/20 to-yellow-500/20',
    accent: '#f59e0b',
  },
  {
    icon: KeyIcon,
    title: 'Мульти-объекты',
    desc: 'Управляйте несколькими отелями из одного аккаунта.',
    color: 'from-indigo-500/20 to-blue-500/20',
    accent: '#4f46e5',
  },
  {
    icon: ImageIcon,
    title: 'Галерея и медиа',
    desc: 'Cloudinary CDN для фото. Оптимизация и авто-форматы.',
    color: 'from-pink-500/20 to-rose-500/20',
    accent: '#ec4899',
  },
  {
    icon: SettingsIcon,
    title: 'Настройки отеля',
    desc: 'Валюта, язык, часовой пояс, налоги. Полная кастомизация.',
    color: 'from-slate-500/20 to-gray-500/20',
    accent: '#64748b',
  },
  {
    icon: LayersIcon,
    title: 'API интеграция',
    desc: 'REST API для внешних систем. Webhook-уведомления.',
    color: 'from-teal-500/20 to-emerald-500/20',
    accent: '#14b8a6',
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[0];
  index: number;
}) {
  const { ref, isVisible } = useScrollReveal(0.05);
  const Icon = feature.icon;
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -8, y: x * 8 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div
        ref={cardRef}
        className="group relative p-6 rounded-2xl border border-sardoba-sand-dark/30 bg-white
          transition-all duration-300 cursor-pointer h-full
          hover:shadow-card-hover hover:border-transparent"
        style={{
          transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${isHovered ? 'translateY(-4px)' : ''}`,
          transition: 'transform 0.2s ease-out, box-shadow 0.3s ease',
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
      >
        {/* Icon with gradient bg */}
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}
        >
          <Icon size={22} className="text-sardoba-dark" />
        </div>

        <h3 className="text-lg font-semibold text-sardoba-dark mb-2 transition-colors group-hover:text-sardoba-gold-dark">
          {feature.title}
        </h3>
        <p className="text-sm text-sardoba-dark/60 leading-relaxed">
          {feature.desc}
        </p>

        {/* Hover spotlight effect */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${50 + tilt.y * 5}% ${50 + tilt.x * 5}%, ${feature.accent}08 0%, transparent 60%)`,
          }}
        />

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
          style={{ background: `linear-gradient(to right, ${feature.accent}60, transparent)` }}
        />
      </div>
    </div>
  );
}

export function Features() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal();

  return (
    <section id="features" className="py-24 lg:py-32 bg-sardoba-cream uzbek-pattern section-glow">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div
          ref={headerRef}
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-800 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-sardoba-gold/10 text-sardoba-gold-dark text-sm font-medium mb-4">
            14 модулей в одной платформе
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-sardoba-dark mb-4 text-balance">
            Всё что нужно для{' '}
            <span className="text-gradient">управления отелем</span>
          </h2>
          <p className="text-lg text-sardoba-dark/50">
            От бронирования до аналитики — каждый модуль создан для
            бутик-отелей Узбекистана
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
