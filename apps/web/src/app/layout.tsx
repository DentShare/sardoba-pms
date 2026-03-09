import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Sardoba PMS — Панель управления отелем',
  description:
    'Панель управления для директоров отелей. Бронирования, номера, гости, каналы продаж, аналитика — полный контроль над вашим отелем.',
  manifest: '/manifest.json',
  themeColor: '#2E7D32',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sardoba PMS',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  keywords: [
    'PMS', 'отель', 'гостиница', 'Узбекистан', 'бронирование',
    'hotel management', 'property management', 'Booking.com',
    'Самарканд', 'Бухара', 'Ташкент',
  ],
  openGraph: {
    title: 'Sardoba PMS — Панель управления отелем',
    description: 'Панель управления для директоров отелей Узбекистана.',
    type: 'website',
    locale: 'ru_RU',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('[SW] Registered, scope:', reg.scope);
                  }).catch(function(err) {
                    console.warn('[SW] Registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
