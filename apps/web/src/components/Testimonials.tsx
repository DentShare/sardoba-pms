'use client';

import { useState, useEffect } from 'react';
import { useScrollReveal } from '@/lib/hooks';
import { StarIcon, QuoteIcon } from './icons';

const TESTIMONIALS = [
  {
    name: 'Акбар Рахимов',
    role: 'Владелец, Hotel Registan',
    city: 'Самарканд',
    text: 'За 3 месяца загрузка выросла на 25%. Channel Manager с Booking.com работает безупречно — все брони приходят моментально.',
    rating: 5,
    avatar: 'АР',
  },
  {
    name: 'Наталья Ким',
    role: 'Менеджер, Bukhara Palace',
    city: 'Бухара',
    text: 'Раньше тратили час на сверку платежей. Теперь Payme и Click интегрированы прямо в систему — всё автоматически.',
    rating: 5,
    avatar: 'НК',
  },
  {
    name: 'Дмитрий Ли',
    role: 'Директор, Khiva Guest House',
    city: 'Хива',
    text: 'Telegram-уведомления — это must have. Утром получаю дайджест дня, а о новых бронях узнаю мгновенно.',
    rating: 5,
    avatar: 'ДЛ',
  },
  {
    name: 'Фарход Усманов',
    role: 'Владелец, Tashkent Boutique',
    city: 'Ташкент',
    text: 'Аналитика показала, что мы теряли деньги на тарифах выходных. Исправили — и выручка выросла на 18%.',
    rating: 5,
    avatar: 'ФУ',
  },
];

export function Testimonials() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal();
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  return (
    <section id="testimonials" className="py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-800 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-sardoba-gold/10 text-sardoba-gold-dark text-sm font-medium mb-4">
            Отзывы клиентов
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-sardoba-dark mb-4 text-balance">
            Нам доверяют <span className="text-gradient">отельеры</span>
          </h2>
          <p className="text-lg text-sardoba-dark/50">
            Реальные истории от владельцев отелей по всему Узбекистану
          </p>
        </div>

        {/* Carousel */}
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${current * 100}%)` }}
            >
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="w-full flex-shrink-0 px-4">
                  <div className="relative bg-sardoba-cream/50 rounded-2xl p-8 md:p-12 border border-sardoba-sand-dark/20">
                    {/* Quote icon */}
                    <QuoteIcon size={48} className="text-sardoba-gold/15 absolute top-6 right-8" />

                    {/* Stars */}
                    <div className="flex gap-1 mb-6">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <StarIcon key={j} size={18} className="text-sardoba-gold" />
                      ))}
                    </div>

                    {/* Quote text */}
                    <p className="text-lg md:text-xl text-sardoba-dark/80 leading-relaxed mb-8 relative z-10">
                      &ldquo;{t.text}&rdquo;
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sardoba-gold to-sardoba-gold-dark flex items-center justify-center">
                        <span className="text-sardoba-dark font-bold text-sm">{t.avatar}</span>
                      </div>
                      <div>
                        <span className="block font-semibold text-sardoba-dark">{t.name}</span>
                        <span className="text-sm text-sardoba-dark/40">
                          {t.role} — {t.city}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots navigation */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrent(i);
                  setIsAutoPlaying(false);
                }}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  i === current
                    ? 'w-8 h-2.5 bg-sardoba-gold'
                    : 'w-2.5 h-2.5 bg-sardoba-dark/15 hover:bg-sardoba-dark/30'
                }`}
                aria-label={`Отзыв ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
