'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/utils/money';
import { formatDate } from '@/lib/utils/dates';
import {
  publicBookingApi,
  type BookingConfirmation,
} from '@/lib/api/public-booking';

/* ═══════════════════════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════════════════════ */

function IconCheckCircle({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="64" height="64" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" className="animate-[drawCircle_0.6s_ease-out_forwards]" strokeDasharray="63" strokeDashoffset="63" style={{ animation: 'drawCircle 0.6s ease-out 0.2s forwards' }} />
      <polyline points="8 12 11 15 16 9" stroke="currentColor" strokeWidth="2" strokeDasharray="20" strokeDashoffset="20" style={{ animation: 'drawCheck 0.4s ease-out 0.7s forwards' }} />
    </svg>
  );
}

function IconCopy({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCalendar({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconBed({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" />
    </svg>
  );
}

function IconUser({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconMoon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconArrowLeft({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IconSpinner({ className = '' }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function IconStar({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ConfirmationPage() {
  const params = useParams();
  const slug = params.slug as string;
  const bookingNumber = params.bookingNumber as string;

  const [data, setData] = useState<BookingConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    publicBookingApi
      .getConfirmation(slug, bookingNumber)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError('Бронирование не найдено');
        setLoading(false);
      });
  }, [slug, bookingNumber]);

  function copyBookingNumber() {
    navigator.clipboard.writeText(bookingNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  /* ── Loading ───────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sardoba-cream">
        <div className="text-center">
          <IconSpinner className="w-10 h-10 text-sardoba-gold mx-auto mb-4" />
          <p className="text-gray-500">Загрузка подтверждения...</p>
        </div>
      </div>
    );
  }

  /* ── Error ─────────────────────────────────────────────────────────────── */
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sardoba-cream">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-sardoba-dark mb-2">{error}</h1>
          <p className="text-gray-500 mb-6">Проверьте правильность ссылки.</p>
          <Link
            href={`/book/${slug}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sardoba-blue text-white rounded-lg font-medium hover:bg-sardoba-blue-light transition-colors"
          >
            <IconArrowLeft />
            На страницу отеля
          </Link>
        </div>
      </div>
    );
  }

  /* ── Success ───────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-sardoba-cream">
      {/* Decorative background */}
      <div className="fixed inset-0 uzbek-pattern opacity-20 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen py-12 px-4">
        {/* Check animation keyframes injected via style tag */}
        <style>{`
          @keyframes drawCircle {
            to { stroke-dashoffset: 0; }
          }
          @keyframes drawCheck {
            to { stroke-dashoffset: 0; }
          }
          @keyframes confettiFall {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(60px) rotate(360deg); opacity: 0; }
          }
        `}</style>

        <div className="w-full max-w-lg mx-auto">
          {/* Card */}
          <div className="glass-card-light overflow-hidden animate-scale-in">
            {/* Green header strip */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 py-8 px-6 text-center relative overflow-hidden">
              {/* Confetti dots */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ['#D4A843', '#fff', '#F5E6C8', '#1E3A5F'][i % 4],
                    left: `${10 + i * 12}%`,
                    top: '-8px',
                    animation: `confettiFall 1.5s ease-out ${0.2 + i * 0.15}s forwards`,
                    opacity: 0,
                  }}
                />
              ))}

              <IconCheckCircle className="mx-auto text-white mb-3" />
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Бронирование подтверждено!
              </h1>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8">
              {/* Booking number */}
              <div className="text-center mb-6">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Номер бронирования</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl sm:text-3xl font-bold text-sardoba-dark tracking-widest font-mono">
                    {data.booking_number}
                  </span>
                  <button
                    onClick={copyBookingNumber}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-sardoba-gold transition-colors"
                    title="Скопировать"
                  >
                    {copied ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <IconCopy />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600 mt-1 animate-fade-in">Скопировано!</p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-gray-200 my-6 relative">
                <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-6 h-6 bg-sardoba-cream rounded-full" />
                <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-6 h-6 bg-sardoba-cream rounded-full" />
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <IconBed className="text-sardoba-gold shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Номер</p>
                    <p className="font-semibold text-sardoba-dark">{data.room_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <IconCalendar className="text-sardoba-gold shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Даты</p>
                    <p className="font-semibold text-sardoba-dark">
                      {formatDate(data.check_in, 'd MMMM yyyy')} — {formatDate(data.check_out, 'd MMMM yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <IconMoon className="text-sardoba-gold shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Ночей</p>
                    <p className="font-semibold text-sardoba-dark">{data.nights}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <IconUser className="text-sardoba-gold shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Гость</p>
                    <p className="font-semibold text-sardoba-dark">{data.guest_name}</p>
                  </div>
                </div>

                {/* Extras */}
                {data.extras && data.extras.length > 0 && (
                  <div className="flex items-start gap-3">
                    <IconStar className="text-sardoba-gold shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400">Доп. услуги</p>
                      {data.extras.map((ext, i) => (
                        <p key={i} className="text-sm text-sardoba-dark">
                          {ext.name} — <span className="font-medium">{formatMoney(ext.total_price)}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="mt-6 p-4 rounded-xl bg-sardoba-gold/10 border border-sardoba-gold/20">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-sardoba-dark">Итого к оплате</span>
                  <span className="text-2xl font-bold text-sardoba-gold">
                    {formatMoney(data.total_amount)}
                  </span>
                </div>
              </div>

              {/* Status badge */}
              <div className="mt-4 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  {data.status === 'confirmed' ? 'Подтверждено' : data.status}
                </span>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="mt-6 text-center">
            <Link
              href={`/book/${slug}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-sardoba-blue hover:text-sardoba-blue-light transition-colors"
            >
              <IconArrowLeft className="w-4 h-4" />
              Вернуться на страницу отеля
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              Powered by <span className="font-semibold">Sardoba PMS</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
