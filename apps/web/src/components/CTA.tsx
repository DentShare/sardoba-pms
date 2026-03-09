'use client';

import { useState } from 'react';
import { useScrollReveal } from '@/lib/hooks';
import { SendIcon } from './icons';

interface FloatingOrb {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

function FloatingOrbs() {
  const [orbs] = useState<FloatingOrb[]>(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 200 + 100,
      duration: Math.random() * 4 + 6,
      delay: Math.random() * -8,
      color: i % 2 === 0 ? 'rgba(212, 168, 67, 0.08)' : 'rgba(30, 58, 95, 0.08)',
    }))
  );

  return (
    <>
      {orbs.map((orb) => (
        <div
          key={orb.id}
          className="absolute rounded-full blur-3xl animate-morph"
          style={{
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            background: orb.color,
            animationDuration: `${orb.duration}s`,
            animationDelay: `${orb.delay}s`,
          }}
        />
      ))}
    </>
  );
}

export function CTA() {
  const { ref, isVisible } = useScrollReveal();
  const [formState, setFormState] = useState({ name: '', phone: '', hotel: '' });
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission logic would go here
  };

  return (
    <section id="contact" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-hero-pattern" />
      <div className="absolute inset-0 uzbek-pattern opacity-50" />
      <div className="absolute inset-0 noise-overlay" />

      {/* Floating orbs */}
      <FloatingOrbs />

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <div
          ref={ref}
          className={`text-center transition-all duration-800 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full glass-card-premium text-sardoba-gold text-sm font-medium mb-6 animated-border">
            Готовы начать?
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 text-balance">
            Переведите ваш отель{' '}
            <span className="text-gradient-premium">на новый уровень</span>
          </h2>

          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10">
            14 дней бесплатного периода. Полная настройка за 30 минут.
            Поддержка на русском и узбекском языках.
          </p>

          {/* Contact form with glass morphism */}
          <form onSubmit={handleSubmit} className="glass-card-premium p-8 max-w-lg mx-auto">
            <div className="space-y-4">
              {[
                { key: 'name', placeholder: 'Ваше имя', type: 'text' },
                { key: 'phone', placeholder: '+998 __ ___ __ __', type: 'tel' },
                { key: 'hotel', placeholder: 'Название отеля', type: 'text' },
              ].map((field) => (
                <div key={field.key} className="relative">
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={formState[field.key as keyof typeof formState]}
                    onChange={(e) => setFormState((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    onFocus={() => setFocusedField(field.key)}
                    onBlur={() => setFocusedField(null)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-sardoba-gold/50 transition-all duration-300 focus:bg-white/8 focus:shadow-inner-glow"
                  />
                  {focusedField === field.key && (
                    <div className="absolute inset-0 rounded-xl border border-sardoba-gold/20 pointer-events-none animate-glow-pulse" />
                  )}
                </div>
              ))}
              <button
                type="submit"
                className="group w-full btn-gold flex items-center justify-center gap-2 text-lg relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <SendIcon size={18} />
                  Получить демо-доступ
                </span>
                {/* Shimmer on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
            </div>
            <p className="text-white/20 text-xs mt-4">
              Нажимая кнопку, вы соглашаетесь с обработкой персональных данных
            </p>
          </form>

          {/* Alternative contact methods */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8">
            <a
              href="https://t.me/sardoba_pms"
              className="group/link flex items-center gap-2 text-white/40 hover:text-sardoba-gold transition-colors cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="transition-transform group-hover/link:scale-110">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Написать в Telegram
            </a>
            <a
              href="tel:+998901234567"
              className="group/link flex items-center gap-2 text-white/40 hover:text-sardoba-gold transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover/link:scale-110">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              +998 90 123 45 67
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
