'use client';

import { useState, useEffect, useRef } from 'react';

export function UpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Reload the page once the new SW takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker.ready.then((reg) => {
      // Check if a waiting worker already exists (e.g. from a previous visit)
      if (reg.waiting && navigator.serviceWorker.controller) {
        waitingWorkerRef.current = reg.waiting;
        setUpdateAvailable(true);
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            waitingWorkerRef.current = newWorker;
            setUpdateAvailable(true);
          }
        });
      });
    });
  }, []);

  const handleUpdate = () => {
    const waiting = waitingWorkerRef.current;
    if (waiting) {
      waiting.postMessage('SKIP_WAITING');
    } else {
      // Fallback: just reload
      window.location.reload();
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-blue-600 text-white rounded-xl p-3
                    flex items-center justify-between shadow-lg">
      <span className="text-sm">Доступно обновление</span>
      <button
        onClick={handleUpdate}
        className="text-xs bg-white text-blue-600 px-3 py-1 rounded-lg font-medium hover:bg-blue-50"
      >
        Обновить
      </button>
    </div>
  );
}
