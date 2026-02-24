'use client';

import { useTypingEffect } from '@/lib/hooks';
import { ArrowRightIcon, SparkleIcon, ChevronDownIcon } from './icons';

const TYPING_TEXTS = [
  'бронирования',
  'аналитику',
  'платежи',
  'каналы продаж',
  'уведомления',
];

export function Hero() {
  const typedText = useTypingEffect(TYPING_TEXTS, 90, 60, 1800);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-hero-pattern wave-divider">
      {/* Animated floating shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-sardoba-gold/10 blur-3xl animate-float" />
        <div className="absolute bottom-32 right-[15%] w-96 h-96 rounded-full bg-sardoba-blue-light/15 blur-3xl animate-float-delayed" />
        <div className="absolute top-1/3 right-[30%] w-48 h-48 rounded-full bg-sardoba-gold/5 blur-2xl animate-float-slow" />

        {/* Geometric decorations */}
        <div className="absolute top-32 right-[20%] w-16 h-16 border border-sardoba-gold/20 rotate-45 animate-spin-slow" />
        <div className="absolute bottom-40 left-[15%] w-12 h-12 border border-white/10 rounded-full animate-bounce-subtle" />
        <div className="absolute top-[60%] right-[10%] w-8 h-8 bg-sardoba-gold/10 rounded animate-float" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(212,168,67,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,67,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24 pb-32">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8 animate-fade-in">
          <SparkleIcon size={16} className="text-sardoba-gold" />
          <span className="text-sardoba-sand text-sm font-medium">
            PMS нового поколения для Узбекистана
          </span>
        </div>

        {/* Main heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6 animate-slide-up">
          Управляйте отелем
          <br />
          <span className="text-gradient">как профессионалы</span>
        </h1>

        {/* Typing subtitle */}
        <div className="text-lg sm:text-xl md:text-2xl text-white/60 mb-4 animate-fade-in h-8">
          Автоматизируйте{' '}
          <span className="text-sardoba-gold font-semibold inline-block min-w-[200px] text-left">
            {typedText}
            <span className="inline-block w-0.5 h-6 bg-sardoba-gold ml-0.5 animate-pulse" />
          </span>
        </div>

        <p className="text-base sm:text-lg text-white/40 max-w-2xl mx-auto mb-10 animate-fade-in">
          Единая платформа для бутик-отелей и гостевых домов.
          Booking.com, Payme, Telegram — всё в одном месте.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up">
          <a href="#contact" className="btn-gold flex items-center gap-2 text-lg">
            Попробовать бесплатно
            <ArrowRightIcon size={20} />
          </a>
          <a href="#dashboard" className="btn-outline flex items-center gap-2 text-lg">
            Смотреть демо
          </a>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-8 text-white/30 text-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sardoba-gold/60">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            14 дней бесплатно
          </div>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sardoba-gold/60">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Без привязки карты
          </div>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sardoba-gold/60">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Поддержка на русском и узбекском
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce-subtle">
        <span className="text-white/30 text-xs uppercase tracking-widest">Узнать больше</span>
        <ChevronDownIcon size={20} className="text-sardoba-gold/50" />
      </div>
    </section>
  );
}
