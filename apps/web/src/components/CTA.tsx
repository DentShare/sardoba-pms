'use client';

import { useScrollReveal } from '@/lib/hooks';
import { ArrowRightIcon, SendIcon } from './icons';

export function CTA() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="contact" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-hero-pattern" />
      <div className="absolute inset-0 uzbek-pattern opacity-50" />

      {/* Floating orbs */}
      <div className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-sardoba-gold/10 blur-3xl animate-float" />
      <div className="absolute bottom-20 right-[10%] w-80 h-80 rounded-full bg-sardoba-blue-light/10 blur-3xl animate-float-delayed" />

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <div
          ref={ref}
          className={`text-center transition-all duration-800 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full glass-card text-sardoba-gold text-sm font-medium mb-6">
            Готовы начать?
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 text-balance">
            Переведите ваш отель{' '}
            <span className="text-gradient">на новый уровень</span>
          </h2>

          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10">
            14 дней бесплатного периода. Полная настройка за 30 минут.
            Поддержка на русском и узбекском языках.
          </p>

          {/* Contact form */}
          <div className="glass-card p-8 max-w-lg mx-auto">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Ваше имя"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-sardoba-gold/50 transition-colors"
              />
              <input
                type="tel"
                placeholder="+998 __ ___ __ __"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-sardoba-gold/50 transition-colors"
              />
              <input
                type="text"
                placeholder="Название отеля"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-sardoba-gold/50 transition-colors"
              />
              <button className="w-full btn-gold flex items-center justify-center gap-2 text-lg">
                <SendIcon size={18} />
                Получить демо-доступ
              </button>
            </div>
            <p className="text-white/20 text-xs mt-4">
              Нажимая кнопку, вы соглашаетесь с обработкой персональных данных
            </p>
          </div>

          {/* Alternative */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8">
            <a
              href="https://t.me/sardoba_pms"
              className="flex items-center gap-2 text-white/40 hover:text-sardoba-gold transition-colors cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Написать в Telegram
            </a>
            <a
              href="tel:+998901234567"
              className="flex items-center gap-2 text-white/40 hover:text-sardoba-gold transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
