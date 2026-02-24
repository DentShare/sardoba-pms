'use client';

import { useState } from 'react';
import { useScrollReveal } from '@/lib/hooks';
import { CheckIcon, SparkleIcon, ArrowRightIcon } from './icons';

const PLANS = [
  {
    name: 'Старт',
    desc: 'Для небольших гостевых домов',
    priceMonthly: 290_000,
    priceYearly: 249_000,
    rooms: 'до 10 номеров',
    features: [
      'Управление номерами',
      'Бронирования',
      'База гостей',
      'Telegram-уведомления',
      'Базовая аналитика',
    ],
    cta: 'Начать бесплатно',
    popular: false,
  },
  {
    name: 'Бизнес',
    desc: 'Для бутик-отелей',
    priceMonthly: 690_000,
    priceYearly: 590_000,
    rooms: 'до 50 номеров',
    features: [
      'Всё из тарифа Старт',
      'Payme / Click платежи',
      'Channel Manager (Booking.com)',
      'Гибкие тарифы',
      'Расширенная аналитика',
      '3 пользователя',
    ],
    cta: 'Попробовать бесплатно',
    popular: true,
  },
  {
    name: 'Премиум',
    desc: 'Для сетей отелей',
    priceMonthly: 1_290_000,
    priceYearly: 990_000,
    rooms: 'без ограничений',
    features: [
      'Всё из тарифа Бизнес',
      'Все OTA каналы',
      'API интеграция',
      'White-label опция',
      'Приоритетная поддержка',
      'Безлимит пользователей',
    ],
    cta: 'Связаться с нами',
    popular: false,
  },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price);
}

export function Pricing() {
  const [isYearly, setIsYearly] = useState(true);
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal();

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-sardoba-cream uzbek-pattern">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center max-w-3xl mx-auto mb-12 transition-all duration-800 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-sardoba-gold/10 text-sardoba-gold-dark text-sm font-medium mb-4">
            Прозрачные тарифы
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-sardoba-dark mb-4 text-balance">
            Выберите свой <span className="text-gradient">тариф</span>
          </h2>
          <p className="text-lg text-sardoba-dark/50 mb-8">
            14 дней бесплатно на любом тарифе. Без привязки карты.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 p-1.5 rounded-xl bg-white border border-sardoba-sand-dark/30">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${
                !isYearly
                  ? 'bg-sardoba-dark text-white shadow-md'
                  : 'text-sardoba-dark/50 hover:text-sardoba-dark'
              }`}
            >
              Ежемесячно
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
                isYearly
                  ? 'bg-sardoba-dark text-white shadow-md'
                  : 'text-sardoba-dark/50 hover:text-sardoba-dark'
              }`}
            >
              Ежегодно
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sardoba-gold/20 text-sardoba-gold-dark font-semibold">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan, i) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              isYearly={isYearly}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  plan,
  isYearly,
  index,
}: {
  plan: (typeof PLANS)[0];
  isYearly: boolean;
  index: number;
}) {
  const { ref, isVisible } = useScrollReveal(0.1);
  const price = isYearly ? plan.priceYearly : plan.priceMonthly;

  return (
    <div
      ref={ref}
      className={`relative rounded-2xl p-8 transition-all duration-700 cursor-pointer
        ${plan.popular
          ? 'bg-sardoba-dark text-white shadow-2xl scale-[1.03] border-2 border-sardoba-gold/30'
          : 'bg-white text-sardoba-dark border border-sardoba-sand-dark/30 hover:shadow-card-hover hover:-translate-y-1'
        }
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-sardoba-gold text-sardoba-dark text-xs font-bold shadow-glow-gold">
            <SparkleIcon size={12} />
            Популярный
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className={`text-xl font-bold mb-1 ${plan.popular ? 'text-white' : 'text-sardoba-dark'}`}>
          {plan.name}
        </h3>
        <p className={`text-sm ${plan.popular ? 'text-white/50' : 'text-sardoba-dark/40'}`}>
          {plan.desc}
        </p>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className={`text-4xl font-bold ${plan.popular ? 'text-sardoba-gold' : 'text-sardoba-dark'}`}>
            {formatPrice(price)}
          </span>
          <span className={`text-sm ${plan.popular ? 'text-white/40' : 'text-sardoba-dark/40'}`}>
            сум/мес
          </span>
        </div>
        <p className={`text-xs mt-1 ${plan.popular ? 'text-white/30' : 'text-sardoba-dark/30'}`}>
          {plan.rooms}
        </p>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <CheckIcon
              size={18}
              className={`mt-0.5 shrink-0 ${plan.popular ? 'text-sardoba-gold' : 'text-emerald-500'}`}
            />
            <span className={`text-sm ${plan.popular ? 'text-white/70' : 'text-sardoba-dark/60'}`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a
        href="#contact"
        className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer ${
          plan.popular
            ? 'bg-sardoba-gold text-sardoba-dark hover:bg-sardoba-gold-light hover:shadow-glow-gold hover:-translate-y-0.5'
            : 'border-2 border-sardoba-dark/10 text-sardoba-dark hover:border-sardoba-gold hover:text-sardoba-gold hover:-translate-y-0.5'
        }`}
      >
        {plan.cta}
        <ArrowRightIcon size={16} />
      </a>
    </div>
  );
}
