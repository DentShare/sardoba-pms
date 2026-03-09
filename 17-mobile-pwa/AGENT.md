# AGENT-17: Mobile PWA — Мобильное приложение (Progressive Web App)

**Wave:** 4 (параллельно с AGENT-11, 12, 13, 15, 16)
**Приоритет:** P2
**Зависит от:** AGENT-12 (frontend-core), AGENT-13 (frontend-modules)
**Блокирует:** AGENT-14 (testing)

---

## Зачем этот модуль

Все конкуренты (SmartBooking, Bnovo, Cloudbeds) имеют нативные приложения iOS + Android.
Разработка нативных приложений займёт 3–4 месяца. PWA (Progressive Web App) — промежуточное решение
которое даёт 80% возможностей нативного приложения за 2–3 недели работы:

- Устанавливается на телефон (иконка на рабочем столе)
- Работает оффлайн (базовые данные кешируются)
- Push-уведомления (как у нативного, кроме iOS до 16.4)
- Работает без App Store и Google Play

**Целевая аудитория:** владелец и администратор отеля — управление с телефона, уведомления о новых бронях.

---

## Задача

Превратить существующее Next.js приложение (AGENT-12, 13) в полноценный PWA:
1. **Manifest + Service Worker** — installable на Android и iOS
2. **Мобильная навигация** — нижний tab-bar вместо sidebar
3. **Оффлайн-режим** — ключевые данные доступны без интернета
4. **Push-уведомления** — Web Push API для новых броней
5. **Оптимизация** — Lighthouse PWA score ≥ 90

**Читать перед стартом:** `API_CONVENTIONS.md`, `SHARED_TYPES.md`, `ENV_VARIABLES.md`

---

## Файловая структура

```
apps/web/
├── public/
│   ├── manifest.json               # Web App Manifest
│   ├── sw.js                       # Service Worker (генерируется Workbox)
│   ├── icons/
│   │   ├── icon-72x72.png
│   │   ├── icon-96x96.png
│   │   ├── icon-128x128.png
│   │   ├── icon-144x144.png
│   │   ├── icon-152x152.png
│   │   ├── icon-192x192.png
│   │   ├── icon-384x384.png
│   │   └── icon-512x512.png
│   └── screenshots/                # Для install prompt
│       ├── mobile-chess.png
│       └── mobile-bookings.png
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Добавить PWA meta tags
│   │   └── (dashboard)/
│   │       └── layout.tsx          # Mobile: нижняя навигация
│   ├── components/
│   │   ├── pwa/
│   │   │   ├── InstallPrompt.tsx   # Кнопка "Установить приложение"
│   │   │   ├── OfflineBanner.tsx   # Баннер при потере сети
│   │   │   └── UpdatePrompt.tsx    # "Доступно обновление"
│   │   └── layout/
│   │       ├── MobileTabBar.tsx    # Нижняя навигация (мобильный)
│   │       └── Sidebar.tsx         # Боковая навигация (десктоп) — уже есть
│   ├── hooks/
│   │   ├── usePWA.ts               # Install prompt, online/offline
│   │   └── usePushNotifications.ts # Web Push подписка
│   └── lib/
│       └── workbox-config.js       # Конфигурация кеширования
```

---

## Web App Manifest

```json
// public/manifest.json
{
  "name": "Sardoba PMS",
  "short_name": "Sardoba",
  "description": "Система управления отелем",
  "start_url": "/dashboard",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FFFFFF",
  "theme_color": "#2E7D32",
  "lang": "ru",
  "categories": ["business", "productivity"],
  "icons": [
    { "src": "/icons/icon-72x72.png",   "sizes": "72x72",   "type": "image/png" },
    { "src": "/icons/icon-96x96.png",   "sizes": "96x96",   "type": "image/png" },
    { "src": "/icons/icon-128x128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "/icons/icon-144x144.png", "sizes": "144x144", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-152x152.png", "sizes": "152x152", "type": "image/png" },
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-384x384.png", "sizes": "384x384", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "screenshots": [
    {
      "src": "/screenshots/mobile-chess.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Шахматка бронирований"
    },
    {
      "src": "/screenshots/mobile-bookings.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Список бронирований"
    }
  ],
  "shortcuts": [
    {
      "name": "Новая бронь",
      "url": "/bookings/new",
      "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
    },
    {
      "name": "Сегодня",
      "url": "/dashboard?filter=today",
      "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
    }
  ]
}
```

---

## Meta-теги в layout.tsx

```tsx
// apps/web/src/app/layout.tsx — добавить в <head>
export const metadata: Metadata = {
  title: 'Sardoba PMS',
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
    maximumScale: 1,  // запретить зум — как нативное приложение
    userScalable: false,
  },
};

// Дополнительные apple-specific теги (вставить вручную в <head>):
// <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
// <link rel="apple-touch-startup-image" href="/splash.png" />
// <meta name="apple-mobile-web-app-capable" content="yes" />
// <meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

---

## Service Worker (Workbox)

```javascript
// next.config.js — добавить next-pwa
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Кешировать API ответы
    {
      urlPattern: /^https:\/\/api\.sardoba\.uz\/v1\/(rooms|guests)/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'api-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 300 }, // 5 минут
      },
    },
    // Кешировать фото номеров (Cloudinary)
    {
      urlPattern: /^https:\/\/res\.cloudinary\.com\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: { maxEntries: 200, maxAgeSeconds: 86400 * 7 }, // 7 дней
      },
    },
    // Страницы — NetworkFirst (свежие данные если есть сеть)
    {
      urlPattern: /^https:\/\/app\.sardoba\.uz\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 20 },
      },
    },
  ],
});

module.exports = withPWA({ /* остальной next.config.js */ });
```

**Установить:** `npm install next-pwa workbox-webpack-plugin`

---

## Мобильная навигация

Заменить sidebar на нижний tab-bar при ширине экрана < 768px:

```tsx
// src/components/layout/MobileTabBar.tsx
const tabs = [
  { href: '/dashboard',  icon: BarChart2,  label: 'Главная',  labelUz: 'Bosh' },
  { href: '/calendar',   icon: Grid,       label: 'Шахматка', labelUz: 'Jadval' },
  { href: '/bookings',   icon: Calendar,   label: 'Брони',    labelUz: 'Bronlar' },
  { href: '/guests',     icon: Users,      label: 'Гости',    labelUz: 'Mehmonlar' },
  { href: '/settings',   icon: Settings,   label: 'Ещё',      labelUz: 'Ko\'proq' },
];

export function MobileTabBar() {
  const pathname = usePathname();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200
                    flex md:hidden safe-area-inset-bottom">
      {tabs.map(tab => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            'flex-1 flex flex-col items-center justify-center py-2 text-xs gap-1',
            pathname.startsWith(tab.href)
              ? 'text-green-700'
              : 'text-gray-500'
          )}
        >
          <tab.icon size={22} />
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
```

В `(dashboard)/layout.tsx`:
```tsx
<div className="pb-16 md:pb-0">  {/* отступ для нижней навигации на мобильных */}
  {children}
</div>
<MobileTabBar />
```

---

## Оффлайн-режим

### Что работает оффлайн:
- Просмотр шахматки (данные из кеша, 5-минутный TTL)
- Список бронирований
- Карточки гостей
- Дашборд с последними данными

### Что требует сети:
- Создание/изменение бронирований
- Синхронизация с OTA
- Отправка уведомлений

### Баннер оффлайн:

```tsx
// src/components/pwa/OfflineBanner.tsx
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (isOnline) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-2 text-sm">
      ⚡ Нет подключения — показаны кешированные данные
    </div>
  );
}
```

---

## Push-уведомления (Web Push)

### Backend — эндпоинты

```
POST /properties/:id/push/subscribe    → сохранить подписку устройства
DELETE /properties/:id/push/subscribe  → отписаться
POST /properties/:id/push/test         → тестовое уведомление
```

```sql
-- Добавить таблицу
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (endpoint)
);
```

```typescript
// В NotificationsService (AGENT-10) — добавить метод
async sendWebPush(propertyId: string, payload: WebPushPayload): Promise<void> {
  const subscriptions = await this.pushSubscriptionsRepo.find({ propertyId });
  
  const webpush = require('web-push');
  webpush.setVapidDetails(
    'mailto:support@sardoba.uz',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err) {
      if (err.statusCode === 410) {
        // Подписка устарела — удалить
        await this.pushSubscriptionsRepo.delete(sub.id);
      }
    }
  }
}
```

Установить: `npm install web-push`

### Типы уведомлений

```typescript
// Отправлять при тех же событиях что и Telegram:
// - Новая бронь
// - Отмена брони
// - Оплата получена
// - Сегодняшние заезды (утренний дайджест)

interface WebPushPayload {
  title: string;       // "Новая бронь от Алишер"
  body: string;        // "Стандарт, 3 ночи, 12–15 июня"
  icon: string;        // "/icons/icon-192x192.png"
  badge: string;       // "/icons/icon-72x72.png"
  tag: string;         // "booking-BK-2025-0042" (группировка)
  data: {
    url: string;       // "/bookings/uuid" — куда перейти при клике
    booking_id?: string;
  };
}
```

### Frontend — хук

```typescript
// src/hooks/usePushNotifications.ts
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push not supported');
      return;
    }
    
    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result !== 'granted') return;
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });
    
    // Отправить подписку на сервер
    await apiClient.post('/properties/{id}/push/subscribe', subscription.toJSON());
    setIsSubscribed(true);
  };
  
  return { permission, isSubscribed, subscribe };
}
```

### Prompt в настройках уведомлений

Добавить в страницу настроек уведомлений (AGENT-13) блок:

```
📱 Push-уведомления в браузере
Получайте уведомления о новых бронях прямо на этом устройстве,
даже когда вкладка закрыта.

[Включить уведомления]   ← кнопка вызывает subscribe()
```

---

## Install Prompt

```tsx
// src/components/pwa/InstallPrompt.tsx
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
      <img src="/icons/icon-72x72.png" alt="" className="w-12 h-12 rounded-xl" />
      <div className="flex-1">
        <p className="font-semibold text-sm">Установить Sardoba PMS</p>
        <p className="text-xs text-gray-500">Работает как приложение</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setDismissed(true)} className="text-gray-400 text-xs">Нет</button>
        <button onClick={install} className="bg-green-700 text-white text-xs px-3 py-1 rounded-lg">
          Да
        </button>
      </div>
    </div>
  );
}
```

Показывать автоматически через 30 секунд после первого входа.

---

## Update Prompt

```tsx
// src/components/pwa/UpdatePrompt.tsx
export function UpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      });
    }
  }, []);
  
  if (!updateAvailable) return null;
  
  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-blue-600 text-white rounded-xl p-3
                    flex items-center justify-between shadow-lg">
      <span className="text-sm">🆕 Доступно обновление</span>
      <button
        onClick={() => window.location.reload()}
        className="text-xs bg-white text-blue-600 px-3 py-1 rounded-lg font-medium"
      >
        Обновить
      </button>
    </div>
  );
}
```

---

## Оптимизация Lighthouse

Добавить в `next.config.js`:

```javascript
const nextConfig = {
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
  headers: async () => [{
    source: '/(.*)',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    ],
  }],
};
```

---

## ENV переменные (добавить в ENV_VARIABLES.md)

```env
# Web Push (VAPID)
VAPID_PUBLIC_KEY=       # генерировать: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=   # тот же публичный ключ
```

Генерация ключей:
```bash
npx web-push generate-vapid-keys
```

---

## Мобильные оптимизации шахматки

Шахматка (AGENT-13) на мобильных должна:
- Показывать только 7 дней (вместо 30) — горизонтальный скролл
- Ячейки минимум 48×48px (tap target)
- Drag & drop заменить на «long press → tap target» на мобильных
- Zoom in/out жестами на шахматке

```tsx
// Добавить в CalendarGrid.tsx
const isMobile = useMediaQuery('(max-width: 768px)');
const defaultDays = isMobile ? 7 : 30;
```

---

## Checklist Lighthouse PWA

После реализации проверить:
- [ ] Installable: manifest.json корректный, SW зарегистрирован
- [ ] Performance ≥ 80 на мобильных (Lighthouse)
- [ ] PWA score ≥ 90
- [ ] HTTPS (обязательно для SW и Push)
- [ ] Иконки всех размеров присутствуют
- [ ] `start_url` работает оффлайн
- [ ] Время загрузки < 3s на 4G

---

## Тесты

```typescript
describe('PWA', () => {
  it('manifest.json доступен и корректный', ...);
  it('service worker регистрируется', ...);
  it('InstallPrompt показывается при beforeinstallprompt', ...);
  it('OfflineBanner показывается при offline event', ...);
  it('Push subscribe сохраняет подписку в БД', ...);
  it('Push отправляется при BookingCreatedEvent', ...);
  it('Устаревшая подписка (410) удаляется', ...);
});

// E2E (Playwright — добавить в AGENT-14)
test('PWA install flow', async ({ page }) => {
  // Проверить что manifest доступен
  const manifest = await page.goto('/manifest.json');
  expect(manifest?.status()).toBe(200);
  
  // Проверить meta-теги
  const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
  expect(themeColor).toBe('#2E7D32');
});
```

---

## Сигнал завершения

Агент завершил работу когда:
- [ ] `manifest.json` корректный, все иконки присутствуют
- [ ] Service Worker зарегистрирован, кеширование работает
- [ ] На Android Chrome появляется «Добавить на главный экран»
- [ ] На iOS Safari — инструкция по добавлению (нет автопромпта на iOS)
- [ ] `InstallPrompt` компонент работает
- [ ] `OfflineBanner` показывается при отключении сети
- [ ] `UpdatePrompt` показывается при выходе новой версии
- [ ] Нижний tab-bar работает на экранах < 768px
- [ ] Шахматка на мобильных показывает 7 дней, ячейки ≥ 48px
- [ ] Push-уведомления: subscribe/unsubscribe работает
- [ ] Push отправляется при новой брони (тест через /push/test)
- [ ] Lighthouse PWA score ≥ 90
- [ ] Lighthouse Performance ≥ 80 на мобильных
- [ ] TypeScript компилируется без ошибок
- [ ] Все тесты проходят
- [ ] `README.md` модуля обновлён
