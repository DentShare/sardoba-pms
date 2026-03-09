'use client';

import { useState, useEffect } from 'react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const install = async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80
                    bg-white rounded-xl shadow-lg border p-4 z-40 flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
        S
      </div>
      <div className="flex-1">
        <p className="font-semibold text-sm text-gray-900">Установить Sardoba PMS</p>
        <p className="text-xs text-gray-500">Работает как приложение</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 text-xs hover:text-gray-600"
        >
          Нет
        </button>
        <button
          onClick={install}
          className="bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-800"
        >
          Да
        </button>
      </div>
    </div>
  );
}
