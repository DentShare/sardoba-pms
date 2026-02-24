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
  title: 'Sardoba PMS — Управление отелем нового поколения',
  description:
    'Современная PMS-платформа для бутик-отелей Узбекистана. Бронирования, Booking.com, Payme, Telegram-уведомления, аналитика — всё в одном месте.',
  keywords: [
    'PMS', 'отель', 'гостиница', 'Узбекистан', 'бронирование',
    'hotel management', 'property management', 'Booking.com',
    'Самарканд', 'Бухара', 'Ташкент',
  ],
  openGraph: {
    title: 'Sardoba PMS — Управление отелем нового поколения',
    description: 'Современная PMS-платформа для бутик-отелей Узбекистана.',
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
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
