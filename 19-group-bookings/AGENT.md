# AGENT-19: Group Bookings — Групповые бронирования

**Wave:** 5 (после MVP)
**Приоритет:** P1 — критично для туристического рынка Узбекистана
**Зависит от:** AGENT-01 (infra), AGENT-02 (db), AGENT-03 (auth), AGENT-04 (rooms), AGENT-05 (bookings), AGENT-07 (rates), AGENT-08 (payments)
**Блокирует:** AGENT-14 (testing)
**Тариф:** Professional+

---

## Зачем этот модуль

Узбекистан — туристическое направление с высокой долей **групповых туров** (Самарканд, Бухара, Хива).
Турагентства и туроператоры бронируют группами от 5 до 40 человек. Текущий MVP не поддерживает
групповые бронирования — администратор вынужден создавать каждую бронь отдельно, что:
- Занимает 20–30 минут вместо 2–3 минут
- Приводит к ошибкам при расчёте общей суммы
- Не позволяет выставить один счёт туроператору
- Усложняет check-in/check-out всей группы

Shelter PMS поддерживает групповые бронирования. Без этой функции Sardoba теряет клиентов уровня L3+.

---

## Задача

Реализовать:
1. **Group Booking** — создание бронирования на группу с выбором нескольких номеров
2. **Rooming List** — ведомость рассадки гостей по номерам
3. **Group Invoice** — единый или раздельные счета
4. **Group Operations** — групповой check-in, check-out, отмена
5. **Agency Management** — справочник туроператоров и агентств

**Читать перед стартом:** `API_CONVENTIONS.md`, `SHARED_TYPES.md`, `ERROR_CODES.md`

---

## Файловая структура

```
apps/api/src/modules/group-bookings/
├── group-bookings.module.ts
├── group-bookings.controller.ts
├── group-bookings.service.ts
├── rooming-list.service.ts
├── agency.service.ts
├── dto/
│   ├── create-group-booking.dto.ts
│   ├── update-rooming-list.dto.ts
│   ├── create-agency.dto.ts
│   └── group-action.dto.ts
└── entities/
    ├── group-booking.entity.ts
    ├── rooming-list-entry.entity.ts
    └── agency.entity.ts

apps/web/src/app/(dashboard)/bookings/groups/
├── page.tsx                    # Список групповых бронирований
├── [id]/page.tsx               # Детали группы + rooming list
└── new/page.tsx                # Создание групповой брони
```

---

## База данных

### Таблица group_bookings

```sql
CREATE TABLE IF NOT EXISTS group_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  group_name VARCHAR(255) NOT NULL,
  agency_id UUID REFERENCES agencies(id),
  contact_name VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_rooms INTEGER NOT NULL,
  total_guests INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'tentative',
  -- tentative | confirmed | checked_in | checked_out | cancelled
  rate_type VARCHAR(20) DEFAULT 'standard',
  -- standard | corporate | tour_operator | custom
  total_amount BIGINT NOT NULL DEFAULT 0,
  paid_amount BIGINT NOT NULL DEFAULT 0,
  invoice_type VARCHAR(20) DEFAULT 'group',
  -- group (один счёт) | individual (на каждого гостя)
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_group_bookings_property ON group_bookings(property_id, check_in);
CREATE INDEX idx_group_bookings_agency ON group_bookings(agency_id);
CREATE INDEX idx_group_bookings_status ON group_bookings(property_id, status);
```

### Связь с существующей таблицей bookings

```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS group_booking_id UUID REFERENCES group_bookings(id);
CREATE INDEX idx_bookings_group ON bookings(group_booking_id);
```

### Таблица agencies (справочник туроператоров)

```sql
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  commission_percent DECIMAL(5,2) DEFAULT 0,
  rate_type VARCHAR(20) DEFAULT 'standard',
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_revenue BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_agencies_property ON agencies(property_id);
```

### Таблица rooming_list

```sql
CREATE TABLE IF NOT EXISTS rooming_list_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_booking_id UUID NOT NULL REFERENCES group_bookings(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id),
  room_id UUID REFERENCES rooms(id),
  guest_name VARCHAR(255),
  guest_phone VARCHAR(20),
  guest_citizenship VARCHAR(3),
  guest_document_number VARCHAR(50),
  notes TEXT,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX idx_rooming_list_group ON rooming_list_entries(group_booking_id);
```

---

## API эндпоинты

### Group Bookings

```
GET    /group-bookings                        # Список (фильтры: status, agency, date_range)
POST   /group-bookings                        # Создать группу
GET    /group-bookings/:id                    # Детали группы с rooming list
PUT    /group-bookings/:id                    # Обновить информацию
DELETE /group-bookings/:id                    # Отменить группу (каскадно)
POST   /group-bookings/:id/confirm            # Подтвердить все брони группы
POST   /group-bookings/:id/check-in           # Групповой check-in
POST   /group-bookings/:id/check-out          # Групповой check-out
GET    /group-bookings/:id/invoice            # Сгенерировать счёт (PDF)
```

### Rooming List

```
GET    /group-bookings/:id/rooming-list       # Ведомость рассадки
PUT    /group-bookings/:id/rooming-list       # Обновить рассадку
POST   /group-bookings/:id/rooming-list/import # Импорт из CSV/Excel
```

### Agencies

```
GET    /agencies                              # Справочник агентств
POST   /agencies                              # Добавить агентство
PUT    /agencies/:id                          # Обновить
GET    /agencies/:id/stats                    # Статистика по агентству
```

---

### POST /group-bookings

Body:
```json
{
  "group_name": "Группа TUI Uzbekistan #42",
  "agency_id": "uuid",
  "contact_name": "Каримов Шерзод",
  "contact_phone": "+998901234567",
  "check_in": "2026-04-10",
  "check_out": "2026-04-14",
  "rooms": [
    { "room_id": "uuid", "guest_name": "Ахмедов Алишер" },
    { "room_id": "uuid", "guest_name": "Петров Иван" },
    { "room_id": "uuid", "guest_name": "Schmidt Hans" },
    { "room_id": "uuid" },
    { "room_id": "uuid" }
  ],
  "rate_type": "tour_operator",
  "invoice_type": "group",
  "notes": "Группа из Германии, русскоговорящий гид"
}
```

Response (201):
```json
{
  "id": "uuid",
  "group_name": "Группа TUI Uzbekistan #42",
  "status": "tentative",
  "total_rooms": 5,
  "total_amount": 250000000,
  "bookings": [
    { "id": "uuid", "booking_number": "BK-2026-0134", "room_name": "101", "guest_name": "Ахмедов Алишер" },
    { "id": "uuid", "booking_number": "BK-2026-0135", "room_name": "102", "guest_name": "Петров Иван" }
  ]
}
```

Логика:
1. Валидация: все номера доступны на указанные даты
2. PostgreSQL advisory lock (как в AGENT-05)
3. Создать `group_booking` запись
4. Создать `N` записей в таблице `bookings` с `source = 'group'` и `group_booking_id`
5. Рассчитать цены через RatesService (корпоративный/туроператорский тариф)
6. Создать rooming_list_entries
7. Emit GroupBookingCreatedEvent → Telegram уведомление
8. Release lock

### POST /group-bookings/:id/check-in

Массовый check-in: изменить статус всех бронирований группы на `checked_in`.

Body:
```json
{
  "booking_ids": ["uuid1", "uuid2", "uuid3"],
  "skip_ids": ["uuid4"]
}
```

Если `booking_ids` пуст — check-in для всех бронирований группы.
`skip_ids` — бронирования которые пропустить (гость опоздал).

### GET /group-bookings/:id/invoice

Query: `format=pdf`

Генерирует PDF-счёт на группу:
- Реквизиты отеля
- Реквизиты агентства
- Список номеров, дат, гостей
- Расчёт: количество ночей × цена × кол-во номеров
- Скидка агентства (комиссия)
- Итого к оплате

---

## Frontend

### Страница «Групповые бронирования» (/bookings/groups)

```
┌────────────────────────────────────────────────────┐
│ Групповые бронирования           [+ Новая группа]  │
├────────────────────────────────────────────────────-│
│ 🔍 Поиск...  [Статус ▼] [Агентство ▼] [Даты ▼]   │
├────────────────────────────────────────────────────-│
│ #  │ Группа              │ Агентство │ Заезд     │ │
│    │                     │           │ Выезд     │ │
│────┼─────────────────────┼───────────┼───────────│ │
│ 1  │ TUI Uzbekistan #42  │ TUI UZ    │ 10.04 →   │ │
│    │ 5 номеров, 8 гостей │           │ 14.04     │ │
│    │ 🟢 Подтверждено     │           │ 250M UZS  │ │
│────┼─────────────────────┼───────────┼───────────│ │
│ 2  │ Корпоратив Samsung  │ Прямая    │ 15.04 →   │ │
│    │ 10 номеров, 10 гос. │           │ 17.04     │ │
│    │ 🟡 Предварительно   │           │ 400M UZS  │ │
└────────────────────────────────────────────────────┘
```

### Создание группы (/bookings/groups/new)

Пошаговая форма:

**Шаг 1: Информация о группе**
- Название группы
- Агентство (выбор из справочника или «Прямая бронь»)
- Контактное лицо, телефон, email
- Даты заезда/выезда
- Тариф (стандартный / корпоративный / туроператорский)

**Шаг 2: Выбор номеров**
- Шахматка с доступными номерами на выбранные даты
- Множественный выбор номеров (чекбоксы)
- Итого: кол-во номеров × цена × ночей

**Шаг 3: Rooming List**
- Таблица: Номер | Гость | Телефон | Паспорт
- Можно заполнить сейчас или позже
- Импорт из Excel (кнопка «Загрузить список»)

**Шаг 4: Подтверждение**
- Сводка: номера, гости, сумма
- Тип оплаты: группа / индивидуально
- Кнопка «Создать группу»

### Интеграция с шахматкой

На основной шахматке групповые бронирования отображаются:
- Единым блоком с названием группы
- Особый цвет (например, оранжевый для групп)
- При наведении — tooltip с названием группы и кол-вом номеров

---

## Telegram-уведомления

Расширить существующий Telegram-бот:

- **Новая группа:** «👥 Новая групповая бронь: TUI Uzbekistan #42, 5 номеров, 10-14.04, 250M UZS»
- **Группа подтверждена:** «✅ Группа TUI Uzbekistan #42 подтверждена. Check-in: 10.04»
- **Групповой check-in:** «🏨 Группа TUI Uzbekistan #42: check-in завершён (5/5 номеров)»
- **Отмена группы:** «❌ Групповая бронь отменена: TUI Uzbekistan #42, 5 номеров»

---

## Новые типы (добавить в SHARED_TYPES.md)

```typescript
export type GroupBookingStatus = 'tentative' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type GroupRateType = 'standard' | 'corporate' | 'tour_operator' | 'custom';
export type InvoiceType = 'group' | 'individual';

export interface GroupBooking {
  id: string;
  property_id: string;
  group_name: string;
  agency?: Agency;
  contact_name?: string;
  contact_phone?: string;
  check_in: string;
  check_out: string;
  total_rooms: number;
  total_guests: number;
  status: GroupBookingStatus;
  rate_type: GroupRateType;
  total_amount: number;
  paid_amount: number;
  invoice_type: InvoiceType;
  bookings: BookingSummary[];
  notes?: string;
}

export interface Agency {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  commission_percent: number;
  total_bookings: number;
  total_revenue: number;
}

export interface RoomingListEntry {
  id: string;
  booking_id?: string;
  room_id?: string;
  room_name?: string;
  guest_name?: string;
  guest_phone?: string;
  guest_citizenship?: string;
  guest_document_number?: string;
}
```

Добавить в `BookingSource` enum:
```typescript
group = 'group'
```

---

## Тесты

```typescript
describe('Group Bookings', () => {
  it('POST /group-bookings — создаёт группу и N отдельных бронирований', ...);
  it('POST /group-bookings — проверяет доступность всех номеров', ...);
  it('POST /group-bookings — 409 если один из номеров занят', ...);
  it('POST /group-bookings/:id/confirm — подтверждает все брони группы', ...);
  it('POST /group-bookings/:id/check-in — массовый check-in', ...);
  it('POST /group-bookings/:id/check-in — пропускает skip_ids', ...);
  it('DELETE /group-bookings/:id — каскадно отменяет все брони', ...);
  it('GET /group-bookings/:id/invoice — генерирует PDF', ...);
  it('PUT /group-bookings/:id/rooming-list — обновляет рассадку', ...);
  it('Групповые брони отображаются единым блоком на шахматке', ...);
  it('Отчёт по агентствам корректно считает выручку', ...);
});
```

---

## Сигнал завершения

Агент завершил работу когда:
- [ ] Создание групповой брони генерирует N отдельных бронирований
- [ ] Rooming list заполняется и импортируется из Excel
- [ ] Групповой check-in / check-out работает
- [ ] PDF-счёт на группу генерируется
- [ ] Справочник агентств работает (CRUD)
- [ ] Групповые бронирования видны на шахматке как блок
- [ ] Telegram-уведомления отправляются
- [ ] Корпоративные / туроператорские тарифы применяются
- [ ] TypeScript компилируется без ошибок
- [ ] Все тесты проходят
