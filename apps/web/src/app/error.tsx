'use client';

import { useEffect } from 'react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js App Router error boundary.
 * Catches errors in route segments and displays a recovery UI.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[ErrorPage] Route error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-sardoba-cream uzbek-pattern">
      <div className="max-w-lg w-full mx-4">
        <div className="glass-card-light p-8 text-center">
          {/* Error icon */}
          <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E53E3E"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-sardoba-dark mb-3">
            Произошла ошибка
          </h2>

          <p className="text-sardoba-dark/60 mb-2">
            При загрузке страницы произошла непредвиденная ошибка.
          </p>

          {error.digest && (
            <p className="text-xs text-sardoba-dark/40 mb-6 font-mono">
              Код ошибки: {error.digest}
            </p>
          )}

          {!error.digest && <div className="mb-6" />}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={reset}
              className="btn-gold w-full sm:w-auto text-center"
            >
              Попробовать снова
            </button>
            <a
              href="/"
              className="btn-outline w-full sm:w-auto text-center"
            >
              На главную
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
