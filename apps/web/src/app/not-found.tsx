import Link from 'next/link';

/**
 * Next.js 404 Not Found page.
 * Displays a friendly "Страница не найдена" message
 * with Sardoba design styling and uzbek-pattern background.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sardoba-cream uzbek-pattern relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-sardoba-gold/5 blur-3xl" />
        <div className="absolute bottom-20 right-[10%] w-96 h-96 rounded-full bg-sardoba-blue/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg w-full mx-4 text-center">
        {/* Large 404 number */}
        <div className="mb-6">
          <span className="text-[10rem] sm:text-[12rem] font-bold leading-none select-none bg-gradient-to-br from-sardoba-gold via-sardoba-gold-light to-sardoba-gold bg-clip-text text-transparent opacity-90">
            404
          </span>
        </div>

        <div className="glass-card-light p-8">
          {/* Compass icon */}
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-sardoba-gold/10 flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#D4A843"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-sardoba-dark mb-3">
            Страница не найдена
          </h1>

          <p className="text-sardoba-dark/60 mb-8 leading-relaxed">
            Запрашиваемая страница не существует или была перемещена.
            Проверьте правильность адреса или вернитесь на главную.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="btn-gold w-full sm:w-auto text-center flex items-center justify-center gap-2"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Вернуться на главную
            </Link>
          </div>
        </div>

        {/* Subtle decorative divider */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="w-8 h-px bg-sardoba-gold/20" />
          <div className="w-2 h-2 rounded-full bg-sardoba-gold/20" />
          <div className="w-8 h-px bg-sardoba-gold/20" />
        </div>
      </div>
    </div>
  );
}
