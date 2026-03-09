# AGENT-15: Booking Widget — Виджет бронирования и мини-сайт отеля

**Wave:** 4 (параллельно с AGENT-11, 12, 13)
**Приоритет:** P1 — конкурентное преимущество
**Зависит от:** AGENT-01 (infra), AGENT-02 (db), AGENT-03 (auth), AGENT-04 (rooms), AGENT-05 (bookings), AGENT-07 (rates), AGENT-08 (payments)
**Блокирует:** AGENT-14 (testing)

---

## Зачем этот модуль

Все прямые конкуренты (SmartBooking, Bnovo, Cloudbeds) предоставляют отелю публичную страницу
с формой бронирования. Это позволяет отелю принимать **прямые брони без комиссии OTA** (15–25%).
Без этой функции Sardoba PMS проигрывает по ключевому аргументу продаж.

Каждый отель получает поддомен: `https://{slug}.sardoba.uz`

---

## Задача

Реализовать:
1. **Public Booking Widget** — встраиваемый JS-виджет (iframe / script tag) для любого сайта
2. **Hotel Mini-Site** — готовая публичная страница отеля на поддомене `{slug}.sardoba.uz`
3. **Backend API** — публичные эндпоинты без авторизации для поиска доступности и создания брони

**Читать перед стартом:** `API_CONVENTIONS.md`, `SHARED_TYPES.md`, `ERROR_CODES.md`, `ENV_VARIABLES.md`

---

## Файловая структура

```
apps/web/src/app/
└── [hotelSlug]/                    # Next.js dynamic route → {slug}.sardoba.uz или /hotel/{slug}
    ├── page.tsx                    # Главная страница мини-сайта
    ├── layout.tsx                  # Layout без sidebar (публичный)
    ├── rooms/
    │   └── [roomId]/page.tsx       # Страница конкретного номера
    └── booking/
        ├── page.tsx                # Форма бронирования (шаг 1: выбор дат)
        ├── confirm/page.tsx        # Подтверждение (шаг 2: данные гостя)
        └── success/page.tsx        # Успешное бронирование (шаг 3)

apps/api/src/modules/public-booking/
├── public-booking.module.ts
├── public-booking.controller.ts    # Публичные эндпоинты (без JWT)
├── public-booking.service.ts
└── dto/
    ├── search-availability.dto.ts
    └── create-public-booking.dto.ts

apps/widget/                        # Отдельный mini-bundle для embed
├── index.html                      # Демо-страница
├── src/
│   ├── widget.tsx                  # React-компонент виджета
│   └── embed.ts                    # Точка входа для <script> тега
└── vite.config.ts                  # Build → один JS-файл
```

---

## База данных

Добавить в таблицу `properties` (миграция):

```sql
ALTER TABLE properties ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS widget_enabled BOOLEAN DEFAULT true;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS mini_site_enabled BOOLEAN DEFAULT true;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS mini_site_config JSONB DEFAULT '{}';

-- mini_site_config структура:
-- {
--   "hero_title": "Добро пожаловать в отель Малика",
--   "hero_subtitle": "В сердце старого Самарканда",
--   "primary_color": "#2E7D32",
--   "show_prices": true,
--   "google_maps_link": "https://maps.google.com/...",
--   "phone": "+998901234567",
--   "whatsapp": "+998901234567",
--   "instagram": "hotel_malika_samarkand",
--   "languages": ["ru", "uz", "en"]
-- }

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);
```

---

## Public API эндпоинты (без авторизации)

### GET /public/{slug}
Публичная информация об отеле для мини-сайта.

**Response:**
```json
{
  "id": "uuid",
  "slug": "hotel-malika",
  "name": "Отель Малика",
  "description": "...",
  "address": "ул. Регистан, 1, Самарканд",
  "phone": "+998901234567",
  "whatsapp": "+998901234567",
  "mini_site_config": { ... },
  "rooms": [
    {
      "id": "uuid",
      "name": "Стандарт двухместный",
      "type": "double",
      "capacity": 2,
      "description": "...",
      "amenities": ["wifi", "ac", "tv"],
      "photos": ["https://res.cloudinary.com/..."],
      "base_price": 50000000  // тийины
    }
  ]
}
```

**Ошибки:** 404 если slug не найден или mini_site_enabled = false

---

### GET /public/{slug}/availability
Поиск доступных номеров.

**Query params:**
```
check_in:   2025-06-01   (обязательно, YYYY-MM-DD)
check_out:  2025-06-05   (обязательно, YYYY-MM-DD)
adults:     2            (опционально, default: 1)
children:   0            (опционально, default: 0)
```

**Валидация:**
- check_in >= сегодня
- check_out > check_in
- max период: 90 дней
- adults: 1–10

**Response:**
```json
{
  "check_in": "2025-06-01",
  "check_out": "2025-06-05",
  "nights": 4,
  "available_rooms": [
    {
      "id": "uuid",
      "name": "Стандарт двухместный",
      "type": "double",
      "capacity": 2,
      "photos": ["..."],
      "amenities": ["wifi", "ac"],
      "price_per_night": 50000000,
      "total_price": 200000000,
      "rate_name": "Стандартный",
      "breakfast_included": false,
      "available": true
    }
  ]
}
```

**Логика:** использует существующий `availability.service.ts` из AGENT-05. Номера с `status != 'active'` не показывать. Применять тарифы через `RatesService.calculate()`.

---

### POST /public/{slug}/bookings
Создание брони из виджета.

**Body:**
```json
{
  "room_id": "uuid",
  "check_in": "2025-06-01",
  "check_out": "2025-06-05",
  "adults": 2,
  "children": 0,
  "guest": {
    "first_name": "Алишер",
    "last_name": "Навоий",
    "phone": "+998901234567",
    "email": "guest@example.com",
    "citizenship": "UZ"
  },
  "special_requests": "Поздний заезд после 22:00",
  "payment_method": "on_arrival"  // или "online" если Payme/Click
}
```

**Response (201):**
```json
{
  "booking_id": "uuid",
  "booking_number": "BK-2025-0042",
  "status": "confirmed",
  "total_amount": 200000000,
  "payment_method": "on_arrival",
  "message": "Бронирование подтверждено! Мы ожидаем вас 1 июня."
}
```

**Логика:**
1. Валидация входных данных
2. Проверить что отель существует и widget_enabled = true
3. PostgreSQL advisory lock (тот же механизм что в AGENT-05 BookingsService)
4. Создать/найти гостя (по телефону)
5. Рассчитать стоимость через RatesService
6. Создать бронь с `source = 'direct_widget'`
7. Emit BookingCreatedEvent (→ Telegram уведомление владельцу)
8. Отправить WhatsApp гостю (если подключён в AGENT-10)
9. Release lock

**Rate limiting:** 10 запросов/минуту с одного IP на /public/* эндпоинты

---

## Мини-сайт (Next.js)

---

## 🎨 ДИЗАЙН-ТРЕБОВАНИЯ — ОБЯЗАТЕЛЬНО ПРОЧИТАТЬ ПЕРЕД КОДОМ

> Конкурент SmartBooking.uz уже выпустил красивый luxury-сайт для отелей (тёмная тема,
> золотые акценты, hero на весь экран). Sardoba должен выглядеть **не хуже или лучше**.
> Минимализм и дешёвый вид — недопустимы. Это витрина продукта для продаж.

### Визуальное направление: «Шёлковый путь Luxury»

**Эстетика:** тёмная тема (почти чёрный фон #0A0A08), золотые акценты (#C9A96E),
утончённая типографика с засечками в заголовках, Montserrat в тексте.
Атмосфера дорогого бутик-отеля в историческом Самарканде.

**Эталонный прототип:** файл `hotel-site-prototype.html` — показывает точный уровень
качества. Агент должен реализовать React/Next.js компоненты на этом же визуальном уровне.

### Палитра (CSS-переменные)

```css
:root {
  --gold:        #C9A96E;   /* основной акцент — все важные элементы */
  --gold-light:  #E8D5A3;   /* hover состояния */
  --gold-dark:   #8B6914;   /* активные состояния */
  --dark:        #0A0A08;   /* фон страницы */
  --dark-2:      #131310;   /* карточки секций */
  --dark-3:      #1C1C18;   /* форма, вложенные блоки */
  --dark-4:      #252520;   /* hover карточек */
  --text:        #F0EDE6;   /* основной текст */
  --text-muted:  #8A8778;   /* вторичный текст */
  --text-subtle: #5A5A50;   /* подсказки, метки */
}
```

### Типографика

```css
/* Заголовки — с характером, исторически-люксовые */
font-family: 'Cormorant Garamond', Georgia, serif;
/* Все заголовки h1/h2: font-weight: 300, курсив для ключевых слов */

/* Интерфейс — чистый, современный */
font-family: 'Montserrat', sans-serif;
/* Навигация, кнопки, метки: font-weight: 500-600, letter-spacing: 0.15em, uppercase */
```

Подключение:
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
```

### Hero секция — стандарты качества

- **Фон:** если у отеля нет фото — генерировать атмосферный градиент-фон
  (не белый! не серый! тёмный + золотые радиальные градиенты как в прототипе)
- **Зернистая текстура** поверх фото/градиента — через SVG feTurbulence filter, opacity 0.03
- **Форма поиска** прямо в hero — на стекле (glassmorphism: backdrop-filter blur + тёмный фон)
- **Размытый оверлей** на фото: `linear-gradient(135deg, rgba(10,10,8,.85) 0%, rgba(10,10,8,.3) 50%)`
- **Полоска удобств** внизу hero — иконки Wi-Fi, завтрак, TV, кондиционер, трансфер, парковка
- **Слайдер точки** для смены фото (анимированные)

### Навигация

```tsx
// Фиксированная, прозрачная с blur
// Левый блок: иконка-квадрат с буквой + название отеля (Cormorant Garamond)
// Центр: ссылки UPPERCASE, letter-spacing .15em, цвет muted
// Правый блок: переключатель языка + кнопка "Забронировать" (золотая)
// При скролле: border-bottom появляется

position: fixed; backdrop-filter: blur(12px);
background: linear-gradient(180deg, rgba(10,10,8,.95) 0%, transparent 100%);
border-bottom: 1px solid rgba(201,169,110,.08);
```

### Карточки номеров

- **Grid 3 колонки** на десктопе, 1 на мобильном
- **Aspect ratio 3:4** — вертикальные карточки
- **Фон без фото:** уникальный для каждого типа градиент (тёплый/холодный/нейтральный)
  + радиальный золотой свет внутри
- **Оверлей:** `linear-gradient(0deg, rgba(10,10,8,.95) 0%, transparent 60%)` снизу
- **Hover:** scale(1.04) на фоне + появление кнопки-стрелки
- **Содержимое карточки (снизу):** тип (золотой), название (Cormorant), метаданные, цена

### Форма бронирования

- **Двухколоночный layout:** левый — преимущества прямого бронирования, правый — форма
- **Инпуты:** тёмные, border золотой при focus, без белого фона
- **Живой пересчёт суммы:** при смене дат/номера — итоговая сумма обновляется
- **Бейдж «Прямое бронирование»** с пульсирующей зелёной точкой

### Анимации

```css
/* Базовая: появление снизу */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Hero элементы: последовательные задержки */
.hero-location  { animation: fadeUp .8s 0s ease both; }
.hero-title     { animation: fadeUp .8s .1s ease both; }
.hero-subtitle  { animation: fadeUp .8s .2s ease both; }
.search-form    { animation: fadeUp .8s .3s ease both; }

/* Карточки, контакты, перки: IntersectionObserver scroll reveal */
```

### Мобильная адаптация

- Навигация: скрыть центральные ссылки, оставить логотип + кнопку Забронировать
- Hero: убрать полоску удобств, форма поиска — вертикальная
- Номера: 1 колонка, aspect-ratio 4:3
- Форма: 1 колонка, все поля на всю ширину

### Footer

```
[Название отеля]  [© 2025]  [Работает на Sardoba PMS ←]
```

Ссылка «Sardoba PMS» — золотая, ведёт на sardoba.uz. Это маркетинг продукта.

---

### Роутинг

Два варианта (оба поддерживать):
- **Поддомен:** `hotel-malika.sardoba.uz` → middleware читает hostname → определяет slug
- **Путь:** `sardoba.uz/hotel/hotel-malika` → fallback для сред без wildcard DNS

```typescript
// apps/web/src/middleware.ts — добавить к существующему
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];
  
  // Если поддомен не 'www', 'app', 'api' — это slug отеля
  const appSubdomains = ['www', 'app', 'api', 'localhost'];
  if (!appSubdomains.includes(subdomain) && hostname.includes('sardoba.uz')) {
    const url = request.nextUrl.clone();
    url.pathname = `/hotel/${subdomain}${url.pathname}`;
    return NextResponse.rewrite(url);
  }
}
```

### Страница отеля (`/hotel/[slug]/page.tsx`)

Секции (в порядке сверху вниз):
1. **Hero** — фото, название, кнопка «Забронировать»
2. **Форма поиска** — календарь check_in/check_out + кол-во гостей → список номеров
3. **Номера** — карточки с фото, описанием, ценой, кнопкой «Выбрать»
4. **О нас** — описание отеля
5. **Расположение** — ссылка на Google Maps
6. **Контакты** — телефон, WhatsApp, Instagram
7. **Footer** — «Работает на Sardoba PMS»

SEO:
```typescript
export async function generateMetadata({ params }) {
  const hotel = await fetchHotelPublic(params.slug);
  return {
    title: `${hotel.name} — Бронирование онлайн`,
    description: hotel.description?.slice(0, 160),
    openGraph: { images: [hotel.rooms[0]?.photos[0]] }
  };
}
```

### Форма бронирования (3 шага)

**Шаг 1: Выбор номера**
- Два datepicker (check_in, check_out)
- Счётчик гостей
- Кнопка «Найти» → GET /public/{slug}/availability
- Список доступных номеров с ценами

**Шаг 2: Данные гостя**
- Имя, фамилия (обязательно)
- Телефон +998XXXXXXXXX (обязательно)
- Email (опционально)
- Гражданство (select)
- Особые пожелания (textarea)
- Итоговая сумма (ночи × цена)
- Кнопка «Подтвердить бронирование»

**Шаг 3: Успех**
- Номер брони BK-XXXX-XXXX
- Детали (даты, номер, сумма)
- Кнопка «Поделиться в WhatsApp»
- QR-код с деталями брони (опционально)

**Локализация:** поддержать ru / uz / en в зависимости от `mini_site_config.languages`

---

## Embed-виджет (apps/widget/)

Виджет для встройки на **любой сайт отеля**. Собирается в один JS-файл.

### Код встройки для отельера

```html
<!-- Вставить перед </body> на сайте отеля -->
<script>
  window.SardobaWidget = { slug: 'hotel-malika', lang: 'ru' };
</script>
<script src="https://widget.sardoba.uz/embed.js" async></script>
```

### Поведение виджета

```typescript
// apps/widget/src/embed.ts
(function() {
  const config = window.SardobaWidget || {};
  if (!config.slug) return;
  
  // Создать кнопку "Забронировать"
  const btn = document.createElement('button');
  btn.textContent = config.lang === 'uz' ? 'Bron qilish' : 'Забронировать';
  btn.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    background: #2E7D32; color: white; border: none; border-radius: 50px;
    padding: 14px 28px; font-size: 16px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  
  // При клике — открыть iframe-модалку
  btn.onclick = () => openModal(config.slug, config.lang);
  document.body.appendChild(btn);
})();
```

Iframe URL: `https://widget.sardoba.uz/form?slug={slug}&lang={lang}`

Размер iframe: 480×640px, responsive на мобильных

---

## Настройки мини-сайта в PMS (Frontend)

Добавить в `apps/web/src/app/(dashboard)/settings/mini-site/page.tsx`:

```
Настройки мини-сайта
├── Включить/выключить (toggle)
├── Адрес сайта: hotel-malika.sardoba.uz [скопировать ссылку]
├── Основной цвет (color picker)
├── Заголовок и подзаголовок Hero
├── Описание отеля
├── Контакты (телефон, WhatsApp, Instagram)
├── Ссылка на Google Maps
├── Показывать цены: да/нет
└── Код виджета для вставки (textarea, readonly)
    <script>window.SardobaWidget={slug:'hotel-malika'};</script>
    <script src="https://widget.sardoba.uz/embed.js"></script>
```

API эндпоинты для настроек:
```
GET  /properties/:id/mini-site          → текущие настройки
PUT  /properties/:id/mini-site          → обновить настройки
POST /properties/:id/mini-site/slug     → установить/изменить slug
GET  /properties/:id/mini-site/stats    → количество просмотров и броней с виджета
```

---

## ENV переменные (добавить в ENV_VARIABLES.md)

```env
# Mini-site / Widget
WIDGET_URL=https://widget.sardoba.uz
NEXT_PUBLIC_WIDGET_URL=https://widget.sardoba.uz
WIDGET_RATE_LIMIT=10   # запросов/минуту с одного IP
```

---

## Новые типы (добавить в SHARED_TYPES.md)

```typescript
// packages/shared/src/types/index.ts

export interface PublicHotelInfo {
  id: string;
  slug: string;
  name: string;
  description?: string;
  address: string;
  phone?: string;
  whatsapp?: string;
  mini_site_config: MiniSiteConfig;
  rooms: PublicRoomInfo[];
}

export interface MiniSiteConfig {
  hero_title?: string;
  hero_subtitle?: string;
  primary_color?: string;
  show_prices?: boolean;
  google_maps_link?: string;
  languages?: ('ru' | 'uz' | 'en')[];
}

export interface PublicRoomInfo {
  id: string;
  name: string;
  type: RoomType;
  capacity: number;
  description?: string;
  amenities: string[];
  photos: string[];
  base_price: number; // тийины
}

export interface PublicAvailabilityResult {
  check_in: string;
  check_out: string;
  nights: number;
  available_rooms: PublicAvailableRoom[];
}

export interface PublicAvailableRoom extends PublicRoomInfo {
  price_per_night: number;
  total_price: number;
  rate_name: string;
  breakfast_included: boolean;
  available: boolean;
}

export interface CreatePublicBookingDto {
  room_id: string;
  check_in: string;
  check_out: string;
  adults: number;
  children?: number;
  guest: {
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    citizenship?: string;
  };
  special_requests?: string;
  payment_method: 'on_arrival' | 'online';
}
```

Добавить в `BookingSource` enum:
```typescript
direct_widget = 'direct_widget'
```

---

## Аналитика виджета

Трекать события в отдельной таблице для аналитики:

```sql
CREATE TABLE IF NOT EXISTS widget_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  event_type VARCHAR(50) NOT NULL,  -- 'page_view', 'search', 'booking_started', 'booking_completed'
  room_id UUID,
  meta JSONB DEFAULT '{}',
  ip_hash VARCHAR(64),              -- SHA256 от IP (приватность)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_widget_events_property_date ON widget_events(property_id, created_at);
```

Добавить в аналитику AGENT-11:
- Количество просмотров мини-сайта
- Конверсия: просмотры → брони
- Выручка с прямого канала (direct_widget)

---

## Тесты

```typescript
describe('Public Booking', () => {
  it('GET /public/{slug} — возвращает публичную инфо отеля', ...);
  it('GET /public/{slug} — 404 если slug не найден', ...);
  it('GET /public/{slug}/availability — список доступных номеров', ...);
  it('GET /public/{slug}/availability — пустой список если всё занято', ...);
  it('POST /public/{slug}/bookings — успешное создание брони', ...);
  it('POST /public/{slug}/bookings — 409 если овербукинг', ...);
  it('POST /public/{slug}/bookings — rate limit 429 при > 10 запросах/мин', ...);
  it('Бронь с source=direct_widget попадает в аналитику по каналам', ...);
});
```

---

## Сигнал завершения

Агент завершил работу когда:
- [ ] `GET /public/{slug}` возвращает данные отеля
- [ ] `GET /public/{slug}/availability` возвращает доступные номера с ценами
- [ ] `POST /public/{slug}/bookings` создаёт бронь и эмитит события
- [ ] Мини-сайт открывается на `sardoba.uz/hotel/{slug}` без авторизации
- [ ] Форма бронирования проходит 3 шага и показывает номер брони
- [ ] Embed-виджет собирается в один JS-файл и встраивается через `<script>`
- [ ] Настройки мини-сайта доступны в Dashboard → Настройки
- [ ] Rate limiting работает (429 при превышении)
- [ ] TypeScript компилируется без ошибок
- [ ] Все тесты проходят
- [ ] `README.md` модуля обновлён
