'use client';

import { useScrollReveal } from '@/lib/hooks';
import {
  ShieldIcon, BedIcon, CalendarIcon, UsersIcon, TagIcon,
  CreditCardIcon, GlobeIcon, BellIcon, ChartIcon,
} from './icons';

const FEATURES = [
  {
    icon: ShieldIcon,
    title: 'Авторизация и роли',
    desc: 'JWT-аутентификация с ролями: владелец, админ, наблюдатель. Полная безопасность данных.',
    color: 'from-blue-500/20 to-indigo-500/20',
    border: 'group-hover:border-blue-400/30',
  },
  {
    icon: BedIcon,
    title: 'Управление номерами',
    desc: 'Типы номеров, удобства, фото через Cloudinary. Полная карточка каждого номера.',
    color: 'from-emerald-500/20 to-teal-500/20',
    border: 'group-hover:border-emerald-400/30',
  },
  {
    icon: CalendarIcon,
    title: 'Бронирования',
    desc: 'Визуальный календарь, статусы, check-in/check-out. Защита от овербукинга.',
    color: 'from-sardoba-gold/20 to-amber-500/20',
    border: 'group-hover:border-sardoba-gold/30',
  },
  {
    icon: UsersIcon,
    title: 'База гостей',
    desc: 'Профили, история визитов, VIP-статусы. Шифрование паспортных данных.',
    color: 'from-violet-500/20 to-purple-500/20',
    border: 'group-hover:border-violet-400/30',
  },
  {
    icon: TagIcon,
    title: 'Гибкие тарифы',
    desc: 'Сезонные, выходные, long-stay тарифы. Автоматический расчёт стоимости.',
    color: 'from-rose-500/20 to-pink-500/20',
    border: 'group-hover:border-rose-400/30',
  },
  {
    icon: CreditCardIcon,
    title: 'Платежи Payme / Click',
    desc: 'Приём онлайн-оплат через Payme и Click. Наличные и переводы тоже учтены.',
    color: 'from-cyan-500/20 to-sky-500/20',
    border: 'group-hover:border-cyan-400/30',
  },
  {
    icon: GlobeIcon,
    title: 'Channel Manager',
    desc: 'Синхронизация с Booking.com, Airbnb, Ostrovok. iCal и API интеграция.',
    color: 'from-orange-500/20 to-amber-500/20',
    border: 'group-hover:border-orange-400/30',
  },
  {
    icon: BellIcon,
    title: 'Telegram-уведомления',
    desc: 'Новые брони, отмены, дайджест дня — всё мгновенно в Telegram-бот.',
    color: 'from-sky-500/20 to-blue-500/20',
    border: 'group-hover:border-sky-400/30',
  },
  {
    icon: ChartIcon,
    title: 'Аналитика и отчёты',
    desc: 'Загрузка, ADR, RevPAR, выручка. Понятные графики для принятия решений.',
    color: 'from-lime-500/20 to-green-500/20',
    border: 'group-hover:border-lime-400/30',
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[0];
  index: number;
}) {
  const { ref, isVisible } = useScrollReveal(0.1);
  const Icon = feature.icon;

  return (
    <div
      ref={ref}
      className={`group relative p-6 rounded-2xl border border-sardoba-sand-dark/30 bg-white
        transition-all duration-500 cursor-pointer
        hover:shadow-card-hover hover:-translate-y-1 hover:border-transparent
        ${feature.border}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      {/* Icon with gradient bg */}
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}
      >
        <Icon size={22} className="text-sardoba-dark" />
      </div>

      <h3 className="text-lg font-semibold text-sardoba-dark mb-2">
        {feature.title}
      </h3>
      <p className="text-sm text-sardoba-dark/60 leading-relaxed">
        {feature.desc}
      </p>

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sardoba-gold/0 to-sardoba-gold/0 group-hover:from-sardoba-gold/[0.02] group-hover:to-transparent transition-all duration-500 pointer-events-none" />
    </div>
  );
}

export function Features() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal();

  return (
    <section id="features" className="py-24 lg:py-32 bg-sardoba-cream uzbek-pattern">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div
          ref={headerRef}
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-800 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-sardoba-gold/10 text-sardoba-gold-dark text-sm font-medium mb-4">
            9 модулей в одной платформе
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
