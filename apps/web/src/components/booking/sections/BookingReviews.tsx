'use client';

import { useBookingTheme } from '@/lib/themes';

/**
 * Reviews section matching hotel-site-cozy.html:
 * Header with overall score, 3-column review cards grid.
 * Uses placeholder reviews since backend doesn't have reviews data yet.
 */

const DEMO_REVIEWS = [
  {
    name: 'Дмитрий К.',
    location: 'Москва',
    date: 'Март 2025',
    text: '«Отличное место! Встретили нас с горячим чаем. Утром — свежий хлеб и домашнее варенье. Это не отель — это дом. Хочется вернуться.»',
    source: 'Booking.com',
    avatarColor: 'var(--t-primary)',
    initial: 'Д',
    stars: 5,
  },
  {
    name: 'Emma S.',
    location: 'Berlin',
    date: 'February 2025',
    text: '«The courtyard is magical in the morning. The hosts gave us a hand-drawn map of the best places in the city. This is exactly why I travel.»',
    source: 'Airbnb',
    avatarColor: 'var(--t-secondary, #4A7C59)',
    initial: 'E',
    stars: 5,
  },
  {
    name: 'Азиза М.',
    location: 'Ташкент',
    date: 'Январь 2025',
    text: '«Брали номер на 3 ночи, остались на 6. Не хотелось уходить. Тихий дворик, атмосфера абсолютно живая. Рекомендуем всем!»',
    source: 'Google Maps',
    avatarColor: '#7B68A8',
    initial: 'А',
    stars: 5,
  },
];

export function BookingReviews() {
  const { theme } = useBookingTheme();

  return (
    <section className="pb-16 sm:pb-24 px-5 sm:px-8 lg:px-14" style={{ background: 'var(--t-surface)' }}>
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-9 gap-4">
          <div>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{
                backgroundColor: 'rgba(var(--t-secondary-rgb, 74,124,89), 0.1)',
                color: 'var(--t-secondary, var(--t-primary))',
              }}
            >
              Отзывы гостей
            </span>
            <h2
              className="text-3xl sm:text-4xl lg:text-[46px] leading-[1.2] tracking-tight"
              style={{ fontFamily: 'var(--t-font-heading)', fontWeight: 400, letterSpacing: '-0.02em' }}
            >
              Что говорят<br />те кто <em className="italic text-t-primary">уже был</em>
            </h2>
          </div>
          <div className="flex items-center gap-3.5">
            <span
              className="text-5xl leading-none"
              style={{ fontFamily: 'var(--t-font-heading)', fontWeight: 400 }}
            >
              4.9
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-amber-400 text-lg tracking-wider">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
              <span className="text-[13px] text-t-text-subtle font-medium">214 отзывов</span>
            </div>
          </div>
        </div>

        {/* Review cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {DEMO_REVIEWS.map((review) => (
            <div
              key={review.name}
              className="p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{
                background: 'var(--t-bg)',
                borderColor: 'var(--t-border-subtle)',
              }}
            >
              {/* Top: avatar, name, stars */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base shrink-0"
                  style={{ background: review.avatarColor, fontFamily: 'var(--t-font-heading)', fontWeight: 400 }}
                >
                  {review.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-t-text">{review.name}</div>
                  <div className="text-[11px] text-t-text-subtle">{review.location} &middot; {review.date}</div>
                </div>
                <span className="text-amber-400 text-xs tracking-wider shrink-0">
                  {'★'.repeat(review.stars)}
                </span>
              </div>

              {/* Review text */}
              <p className="text-sm leading-[1.7] text-t-text-muted">{review.text}</p>

              {/* Source */}
              <div className="flex items-center gap-1.5 mt-3.5 text-[11px] text-t-text-subtle font-medium">
                <span className="w-1 h-1 rounded-full" style={{ background: 'var(--t-border-subtle)' }} />
                {review.source}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
