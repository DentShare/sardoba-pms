# AGENT-20: SMS/Email Notifications — Автоматические рассылки гостям

**Wave:** 5 (после MVP)
**Приоритет:** P2 — удержание гостей, повторные визиты
**Зависит от:** AGENT-01 (infra), AGENT-02 (db), AGENT-03 (auth), AGENT-05 (bookings), AGENT-06 (guests)
**Блокирует:** —
**Тариф:** Professional+

---

## Зачем этот модуль

Shelter PMS поддерживает SMS и email-рассылки по событиям. Для отелей уровня L3+
автоматические сообщения гостям — стандарт обслуживания:
- **Pre-arrival SMS** (за 1 день до заезда) повышает удовлетворённость на 15%
- **Post-stay email** (через 1 день после выезда) увеличивает кол-во отзывов на 30%
- **Программа лояльности** — сообщения о скидках для повторных гостей

В Узбекистане SMS остаётся актуальным каналом (не все гости в WhatsApp),
а email критичен для иностранных туристов.

---

## Задача

Реализовать:
1. **Template Engine** — шаблоны сообщений с переменными
2. **Trigger System** — автоматические триггеры на события бронирования
3. **SMS Provider Integration** — отправка SMS через Eskiz.uz или PlayMobile
4. **Email Sender** — отправка email через SMTP
5. **Manual Campaigns** — ручная рассылка по сегментам
6. **Delivery Reports** — статистика доставки

**Читать перед стартом:** `API_CONVENTIONS.md`, `SHARED_TYPES.md`, `ERROR_CODES.md`

---

## Файловая структура

```
apps/api/src/modules/notifications/
├── notifications.module.ts
├── notifications.controller.ts
├── notifications.service.ts
├── template.service.ts
├── trigger.service.ts
├── channels/
│   ├── sms.provider.ts          # Eskiz.uz / PlayMobile
│   ├── email.provider.ts        # SMTP / Nodemailer
│   └── channel.interface.ts
├── dto/
│   ├── create-template.dto.ts
│   ├── create-trigger.dto.ts
│   ├── send-message.dto.ts
│   └── create-campaign.dto.ts
└── entities/
    ├── message-template.entity.ts
    ├── notification-trigger.entity.ts
    ├── sent-message.entity.ts
    └── campaign.entity.ts

apps/web/src/app/(dashboard)/notifications/
├── page.tsx                    # Дашборд рассылок
├── templates/page.tsx          # Управление шаблонами
├── triggers/page.tsx           # Настройка триггеров
├── campaigns/page.tsx          # Ручные рассылки
└── reports/page.tsx            # Отчёты по доставке
```

---

## База данных

### Таблица message_templates

```sql
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(10) NOT NULL, -- sms | email
  language VARCHAR(5) DEFAULT 'ru', -- ru | uz | en
  subject VARCHAR(500), -- только для email
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  -- ["guest_name", "check_in", "hotel_name", "room_name", "booking_number"]
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- системные шаблоны нельзя удалить
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_message_templates_property ON message_templates(property_id, channel);
```

### Таблица notification_triggers

```sql
CREATE TABLE IF NOT EXISTS notification_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  -- booking_confirmed | pre_arrival | check_in | check_out | post_stay | payment_received | birthday
  channel VARCHAR(10) NOT NULL, -- sms | email
  template_id UUID NOT NULL REFERENCES message_templates(id),
  delay_hours INTEGER DEFAULT 0, -- задержка после события
  -- pre_arrival: delay_hours = -24 (за 24 часа ДО check_in)
  -- post_stay: delay_hours = 24 (через 24 часа ПОСЛЕ check_out)
  is_active BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}',
  -- { "guest_citizenship": ["DE", "US"], "min_stay_nights": 3 }
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_triggers_property_event ON notification_triggers(property_id, event_type);
```

### Таблица sent_messages

```sql
CREATE TABLE IF NOT EXISTS sent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  template_id UUID REFERENCES message_templates(id),
  trigger_id UUID REFERENCES notification_triggers(id),
  campaign_id UUID REFERENCES campaigns(id),
  channel VARCHAR(10) NOT NULL,
  recipient VARCHAR(255) NOT NULL, -- phone or email
  guest_id UUID REFERENCES guests(id),
  booking_id UUID REFERENCES bookings(id),
  subject VARCHAR(500),
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  -- queued | sent | delivered | failed | bounced | unsubscribed
  provider_id VARCHAR(255), -- ID от провайдера SMS/email
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sent_messages_property ON sent_messages(property_id, created_at);
CREATE INDEX idx_sent_messages_status ON sent_messages(status, created_at);
CREATE INDEX idx_sent_messages_guest ON sent_messages(guest_id);
```

### Таблица campaigns (ручные рассылки)

```sql
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(10) NOT NULL,
  template_id UUID NOT NULL REFERENCES message_templates(id),
  segment JSONB DEFAULT '{}',
  -- { "citizenship": ["UZ", "RU"], "visited_after": "2025-01-01", "min_stays": 2 }
  status VARCHAR(20) DEFAULT 'draft',
  -- draft | scheduled | sending | completed | cancelled
  scheduled_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_campaigns_property ON campaigns(property_id, status);
```

### Email opt-out

```sql
ALTER TABLE guests ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN DEFAULT false;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS sms_opt_out BOOLEAN DEFAULT false;
```

---

## API эндпоинты

### Templates

```
GET    /notifications/templates                # Список шаблонов
POST   /notifications/templates                # Создать шаблон
PUT    /notifications/templates/:id            # Обновить
DELETE /notifications/templates/:id            # Удалить (не системные)
POST   /notifications/templates/:id/preview    # Превью с тестовыми данными
```

### Triggers

```
GET    /notifications/triggers                 # Список триггеров
POST   /notifications/triggers                 # Создать триггер
PUT    /notifications/triggers/:id             # Обновить
PUT    /notifications/triggers/:id/toggle      # Вкл/выкл
DELETE /notifications/triggers/:id             # Удалить
```

### Send

```
POST   /notifications/send                     # Отправить сообщение вручную
POST   /notifications/send/test                # Тестовое сообщение (себе)
```

### Campaigns

```
GET    /notifications/campaigns                # Список рассылок
POST   /notifications/campaigns                # Создать рассылку
PUT    /notifications/campaigns/:id            # Обновить
POST   /notifications/campaigns/:id/send       # Запустить рассылку
POST   /notifications/campaigns/:id/cancel     # Отменить
GET    /notifications/campaigns/:id/stats      # Статистика
```

### Reports

```
GET    /notifications/stats                    # Общая статистика
GET    /notifications/sent                     # Лог отправленных (фильтры)
```

---

### POST /notifications/templates

Body:
```json
{
  "name": "Pre-arrival SMS (рус)",
  "channel": "sms",
  "language": "ru",
  "body": "Здравствуйте, {guest_name}! Ждём вас завтра в {hotel_name}. Заезд с 14:00. Адрес: {hotel_address}. Номер брони: {booking_number}."
}
```

### POST /notifications/templates/:id/preview

Body:
```json
{
  "variables": {
    "guest_name": "Алишер Ахмедов",
    "hotel_name": "Grand Hotel",
    "hotel_address": "ул. Регистан, 10",
    "booking_number": "BK-2026-0042"
  }
}
```

Response:
```json
{
  "rendered": "Здравствуйте, Алишер Ахмедов! Ждём вас завтра в Grand Hotel. Заезд с 14:00. Адрес: ул. Регистан, 10. Номер брони: BK-2026-0042.",
  "character_count": 142,
  "sms_segments": 1
}
```

---

## Системные шаблоны (создаются при онбординге)

| Шаблон | Канал | Триггер | Задержка |
|---|---|---|---|
| Подтверждение брони | SMS | booking_confirmed | 0 |
| Pre-arrival напоминание | SMS | pre_arrival | -24ч |
| Добро пожаловать | SMS | check_in | 0 |
| Благодарность + отзыв | Email | post_stay | +24ч |
| Подтверждение оплаты | SMS | payment_received | 0 |

### Шаблоны по умолчанию

**SMS: Подтверждение брони (ru)**
```
Бронь {booking_number} подтверждена! {hotel_name}, {room_name}. Заезд: {check_in}, выезд: {check_out}. Сумма: {total_amount} сум.
```

**SMS: Pre-arrival (ru)**
```
{guest_name}, завтра ждём вас в {hotel_name}! Заезд с 14:00. Адрес: {hotel_address}. Вопросы: {hotel_phone}
```

**SMS: Pre-arrival (uz)**
```
{guest_name}, ertaga sizni {hotel_name}da kutamiz! Kirish 14:00 dan. Manzil: {hotel_address}. Savollar: {hotel_phone}
```

**Email: Post-stay (ru)**
```
Subject: Спасибо за пребывание в {hotel_name}!

Здравствуйте, {guest_name}!

Благодарим вас за пребывание в {hotel_name} ({check_in} — {check_out}).

Будем рады видеть вас снова! Оставьте отзыв — это помогает нам стать лучше.

С уважением,
{hotel_name}
```

---

## Переменные шаблонов

| Переменная | Описание | Пример |
|---|---|---|
| `{guest_name}` | Полное имя гостя | Ахмедов Алишер |
| `{guest_first_name}` | Имя | Алишер |
| `{hotel_name}` | Название отеля | Grand Hotel |
| `{hotel_address}` | Адрес | ул. Регистан, 10 |
| `{hotel_phone}` | Телефон отеля | +998901234567 |
| `{room_name}` | Название номера | Стандарт двухместный |
| `{booking_number}` | Номер брони | BK-2026-0042 |
| `{check_in}` | Дата заезда | 10.04.2026 |
| `{check_out}` | Дата выезда | 14.04.2026 |
| `{nights}` | Количество ночей | 4 |
| `{total_amount}` | Сумма | 200 000 000 |
| `{unsubscribe_url}` | Ссылка отписки (email) | https://... |

---

## SMS-провайдер: Eskiz.uz

Интеграция с локальным SMS-провайдером Узбекистана.

```typescript
// apps/api/src/modules/notifications/channels/sms.provider.ts

interface EskizConfig {
  email: string;       // аккаунт Eskiz
  password: string;    // пароль Eskiz
  sender: string;      // имя отправителя (зарегистрировано в Eskiz)
}

// API:
// POST https://notify.eskiz.uz/api/auth/login  → получить token
// POST https://notify.eskiz.uz/api/message/sms/send
//   { mobile_phone: "998901234567", message: "...", from: "SardobaPMS" }
// GET  https://notify.eskiz.uz/api/message/sms/get-status/{id}  → статус доставки
```

Стоимость: ~50–100 сум за SMS (~$0.004).

Fallback: PlayMobile (playmobile.uz) — альтернативный провайдер.

---

## Bull Queue для обработки

Использовать Bull (уже в стеке) для отложенных и массовых рассылок:

```typescript
// Очередь для отправки сообщений
@Processor('notifications')
export class NotificationProcessor {
  @Process('send-sms')
  async handleSms(job: Job<SendSmsPayload>) { ... }

  @Process('send-email')
  async handleEmail(job: Job<SendEmailPayload>) { ... }

  @Process('trigger-check')
  async handleTriggerCheck(job: Job<TriggerCheckPayload>) { ... }
}
```

### Cron-задачи

```typescript
// Каждые 15 минут: проверить триггеры с delay
@Cron('*/15 * * * *')
async checkScheduledTriggers() {
  // Найти бронирования с check_in завтра → запустить pre_arrival
  // Найти бронирования с check_out вчера → запустить post_stay
}
```

---

## Frontend

### Страница «Рассылки» (/notifications)

Дашборд:
- Отправлено сегодня / за неделю / за месяц
- Доставлено / Ошибки
- Активные триггеры
- Последние 10 отправленных

### Управление шаблонами (/notifications/templates)

Список шаблонов + редактор с:
- Название, канал (SMS/email), язык
- Текст с подсветкой переменных `{guest_name}`
- Превью справа (рендер с тестовыми данными)
- Счётчик символов и сегментов SMS

### Настройка триггеров (/notifications/triggers)

Список триггеров с toggle вкл/выкл:

```
┌────────────────────────────────────────────────────────┐
│ Автоматические рассылки                                │
├────────────────────────────────────────────────────────-│
│ ✅ Подтверждение брони          SMS  │ booking_confirmed│
│ ✅ Pre-arrival напоминание      SMS  │ за 24ч до заезда │
│ ✅ Благодарность + отзыв        Email│ через 24ч после  │
│ ⬜ Поздравление с ДР            Email│ в день рождения  │
│ ✅ Подтверждение оплаты         SMS  │ при оплате       │
└────────────────────────────────────────────────────────-┘
```

### Ручная рассылка (/notifications/campaigns)

Форма:
1. Выбрать шаблон
2. Настроить сегмент: гражданство, даты визита, кол-во визитов
3. Превью: кол-во получателей
4. Отправить сейчас или запланировать

---

## ENV переменные

```env
# SMS Provider
SMS_PROVIDER=eskiz                    # eskiz | playmobile
ESKIZ_EMAIL=hotel@example.com
ESKIZ_PASSWORD=***
ESKIZ_SENDER=SardobaPMS

# Email (SMTP, уже должен быть)
SMTP_HOST=smtp.mail.uz
SMTP_PORT=587
SMTP_USER=noreply@sardoba.uz
SMTP_PASS=***
EMAIL_FROM_NAME=Sardoba PMS
EMAIL_FROM_ADDRESS=noreply@sardoba.uz

# Rate limits
SMS_RATE_LIMIT_PER_HOUR=100           # SMS в час на один отель
EMAIL_RATE_LIMIT_PER_HOUR=500         # Email в час на один отель
```

---

## Новые типы (добавить в SHARED_TYPES.md)

```typescript
export type NotificationChannel = 'sms' | 'email';
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'unsubscribed';
export type TriggerEvent = 'booking_confirmed' | 'pre_arrival' | 'check_in' | 'check_out' | 'post_stay' | 'payment_received' | 'birthday';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';

export interface MessageTemplate {
  id: string;
  name: string;
  channel: NotificationChannel;
  language: string;
  subject?: string;
  body: string;
  variables: string[];
  is_active: boolean;
  is_system: boolean;
}

export interface NotificationTrigger {
  id: string;
  name: string;
  event_type: TriggerEvent;
  channel: NotificationChannel;
  template_id: string;
  template_name: string;
  delay_hours: number;
  is_active: boolean;
  conditions: Record<string, unknown>;
}

export interface SentMessage {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  guest_name?: string;
  subject?: string;
  body: string;
  status: MessageStatus;
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: NotificationChannel;
  template_name: string;
  status: CampaignStatus;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  scheduled_at?: string;
}

export interface NotificationStats {
  today: { sent: number; delivered: number; failed: number };
  week: { sent: number; delivered: number; failed: number };
  month: { sent: number; delivered: number; failed: number };
  by_channel: {
    sms: { sent: number; delivered: number; cost: number };
    email: { sent: number; delivered: number };
  };
}
```

---

## Тесты

```typescript
describe('Notifications', () => {
  it('POST /notifications/templates — создаёт шаблон', ...);
  it('POST /notifications/templates/:id/preview — рендерит переменные', ...);
  it('POST /notifications/triggers — создаёт триггер', ...);
  it('booking_confirmed триггер отправляет SMS при подтверждении брони', ...);
  it('pre_arrival триггер отправляет SMS за 24ч до заезда', ...);
  it('post_stay триггер отправляет email через 24ч после выезда', ...);
  it('SMS не отправляется гостю с sms_opt_out=true', ...);
  it('Email содержит ссылку отписки', ...);
  it('POST /notifications/campaigns/:id/send — отправляет массовую рассылку', ...);
  it('Rate limit: не более 100 SMS/час на отель', ...);
  it('Eskiz.uz провайдер корректно обрабатывает ответы', ...);
  it('Ошибка провайдера записывается в sent_messages с error_message', ...);
});
```

---

## Сигнал завершения

Агент завершил работу когда:
- [ ] Шаблоны SMS/Email создаются и рендерятся с переменными
- [ ] Триггеры на события бронирования работают автоматически
- [ ] Pre-arrival SMS отправляется за 24ч до заезда
- [ ] Post-stay email отправляется через 24ч после выезда
- [ ] Ручная рассылка по сегментам работает
- [ ] Интеграция с Eskiz.uz отправляет SMS
- [ ] Email отправляется через SMTP
- [ ] Opt-out (отписка) работает для email и SMS
- [ ] Статистика доставки отображается
- [ ] Bull Queue обрабатывает отложенные отправки
- [ ] TypeScript компилируется без ошибок
- [ ] Все тесты проходят
