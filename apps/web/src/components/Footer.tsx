'use client';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const links = {
    product: [
      { label: 'Возможности', href: '#features' },
      { label: 'Тарифы', href: '#pricing' },
      { label: 'Демо', href: '#dashboard' },
      { label: 'Отзывы', href: '#testimonials' },
    ],
    company: [
      { label: 'О нас', href: '#' },
      { label: 'Блог', href: '#' },
      { label: 'Вакансии', href: '#' },
      { label: 'Контакты', href: '#contact' },
    ],
    legal: [
      { label: 'Политика конфиденциальности', href: '#' },
      { label: 'Условия использования', href: '#' },
      { label: 'Оферта', href: '#' },
    ],
  };

  return (
    <footer className="bg-sardoba-dark border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sardoba-gold to-sardoba-gold-dark flex items-center justify-center">
                <span className="text-sardoba-dark font-bold text-xs">S</span>
              </div>
              <span className="text-white font-semibold text-lg">
                Sardoba<span className="text-sardoba-gold">.pms</span>
              </span>
            </div>
            <p className="text-white/30 text-sm leading-relaxed mb-4">
              Современная PMS-платформа для бутик-отелей и гостевых домов Узбекистана.
            </p>
            {/* Social */}
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-sardoba-gold/20 hover:text-sardoba-gold transition-all cursor-pointer" aria-label="Telegram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-sardoba-gold/20 hover:text-sardoba-gold transition-all cursor-pointer" aria-label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-sardoba-gold/20 hover:text-sardoba-gold transition-all cursor-pointer" aria-label="YouTube">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Продукт</h4>
            <ul className="space-y-2.5">
              {links.product.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-white/35 text-sm hover:text-sardoba-gold transition-colors cursor-pointer">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Компания</h4>
            <ul className="space-y-2.5">
              {links.company.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-white/35 text-sm hover:text-sardoba-gold transition-colors cursor-pointer">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Правовая информация</h4>
            <ul className="space-y-2.5">
              {links.legal.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-white/35 text-sm hover:text-sardoba-gold transition-colors cursor-pointer">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-white/20 text-sm">
            &copy; {currentYear} Sardoba PMS. Все права защищены.
          </span>
          <span className="text-white/20 text-xs">
            Сделано с любовью в Узбекистане
          </span>
        </div>
      </div>
    </footer>
  );
}
