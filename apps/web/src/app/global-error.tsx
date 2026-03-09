'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js root error boundary.
 * Catches errors in the root layout itself.
 * Must include its own <html> and <body> tags since it replaces the root layout.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[GlobalError] Root layout error:', error);
  }, [error]);

  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          fontFamily: "'Inter', system-ui, sans-serif",
          background: '#FFFDF7',
          color: '#1A1A2E',
        }}
      >
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4A843' fill-opacity='0.06'%3E%3Cpath d='M30 0l30 30-30 30L0 30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              margin: '0 16px',
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(212, 168, 67, 0.15)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
              padding: '32px',
              textAlign: 'center' as const,
            }}
          >
            {/* Error icon */}
            <div
              style={{
                margin: '0 auto 24px',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
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

            <h2
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#1A1A2E',
                marginBottom: '12px',
              }}
            >
              Критическая ошибка
            </h2>

            <p
              style={{
                color: 'rgba(26, 26, 46, 0.6)',
                marginBottom: '8px',
                lineHeight: 1.6,
              }}
            >
              Произошла серьёзная ошибка при загрузке приложения.
              Пожалуйста, попробуйте обновить страницу.
            </p>

            {error.digest && (
              <p
                style={{
                  fontSize: '12px',
                  color: 'rgba(26, 26, 46, 0.4)',
                  marginBottom: '24px',
                  fontFamily: 'monospace',
                }}
              >
                Код ошибки: {error.digest}
              </p>
            )}

            {!error.digest && <div style={{ marginBottom: '24px' }} />}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column' as const,
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <button
                onClick={reset}
                style={{
                  padding: '12px 32px',
                  background: '#D4A843',
                  color: '#1A1A2E',
                  fontWeight: 600,
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  width: '100%',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) =>
                  ((e.target as HTMLButtonElement).style.background = '#E8C97A')
                }
                onMouseOut={(e) =>
                  ((e.target as HTMLButtonElement).style.background = '#D4A843')
                }
              >
                Попробовать снова
              </button>
              <a
                href="/"
                style={{
                  padding: '12px 32px',
                  border: '2px solid #D4A843',
                  color: '#D4A843',
                  fontWeight: 600,
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontSize: '16px',
                  width: '100%',
                  boxSizing: 'border-box' as const,
                  textAlign: 'center' as const,
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  const el = e.target as HTMLAnchorElement;
                  el.style.background = '#D4A843';
                  el.style.color = '#1A1A2E';
                }}
                onMouseOut={(e) => {
                  const el = e.target as HTMLAnchorElement;
                  el.style.background = 'transparent';
                  el.style.color = '#D4A843';
                }}
              >
                На главную
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
