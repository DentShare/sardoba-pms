import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-sardoba-dark flex items-center justify-center p-4">
      {/* Decorative background pattern */}
      <div className="fixed inset-0 uzbek-pattern opacity-30 pointer-events-none" />

      {/* Decorative glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sardoba-gold/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Sardoba <span className="text-sardoba-gold">PMS</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Система управления отелем
          </p>
        </div>

        {/* Card */}
        <div className="bg-sardoba-dark-light border border-sardoba-gold/20 rounded-2xl shadow-xl p-8">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-500">
          Sardoba PMS v0.1.0
        </p>
      </div>
    </div>
  );
}
