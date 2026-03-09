# AGENT-18: Housekeeping — Управление горничными и статусы номеров

**Wave:** 5 (после MVP)
**Приоритет:** P1 — конкурентный паритет с Shelter PMS
**Зависит от:** AGENT-01 (infra), AGENT-02 (db), AGENT-03 (auth), AGENT-04 (rooms), AGENT-05 (bookings), AGENT-09 (telegram)
**Блокирует:** AGENT-14 (testing)
**Тариф:** Professional+

---

## Зачем этот модуль

Shelter PMS предоставляет полноценный модуль управления горничными с мобильным WEB-приложением.
Для отелей с 30+ номерами управление уборкой — ежедневная операционная задача. Без автоматизации:
- Менеджер не знает, какие номера готовы к заселению
- Горничные получают задания устно или на бумаге
- Нет контроля качества и времени уборки

Sardoba PMS добавляет этот модуль с уникальным преимуществом — **управление через Telegram** (без отдельного приложения).

---

## Задача

Реализовать:
1. **Room Status System** — статусы чистоты номеров на шахматке и отдельной странице
2. **Task Management** — формирование и назначение задач на уборку
3. **Telegram Integration** — уведомления и отметки горничных через Telegram-бот
4. **Reports** — отчёты по уборкам

**Читать перед стартом:** `API_CONVENTIONS.md`, `SHARED_TYPES.md`, `ERROR_CODES.md`

---

## Файловая структура

```
apps/api/src/modules/housekeeping/
├── housekeeping.module.ts
├── housekeeping.controller.ts
├── housekeeping.service.ts
├── room-status.service.ts
├── cleaning-task.service.ts
├── dto/
│   ├── update-room-status.dto.ts
│   ├── create-cleaning-task.dto.ts
│   ├── assign-task.dto.ts
│   └── complete-task.dto.ts
└── entities/
    ├── room-status.entity.ts
    └── cleaning-task.entity.ts

apps/web/src/app/(dashboard)/housekeeping/
├── page.tsx                    # Доска статусов номеров
├── tasks/page.tsx              # Список задач на уборку
└── reports/page.tsx            # Отчёты по уборкам
```

---

## База данных

### Таблица room_statuses

```sql
CREATE TABLE IF NOT EXISTS room_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'clean',
  -- clean | dirty | cleaning | inspection | do_not_disturb | out_of_order
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(property_id, room_id)
);
CREATE INDEX idx_room_statuses_property ON room_statuses(property_id);
CREATE INDEX idx_room_statuses_status ON room_statuses(property_id, status);
```

### Таблица cleaning_tasks

```sql
CREATE TABLE IF NOT EXISTS cleaning_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id),
  task_type VARCHAR(20) NOT NULL DEFAULT 'standard',
  -- standard | checkout | deep | turndown
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending | assigned | in_progress | completed | verified | cancelled
  assigned_to UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  priority INTEGER DEFAULT 0, -- 0=normal, 1=high, 2=urgent
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_cleaning_tasks_property_date ON cleaning_tasks(property_id, scheduled_date);
CREATE INDEX idx_cleaning_tasks_assigned ON cleaning_tasks(assigned_to, status);
CREATE INDEX idx_cleaning_tasks_room ON cleaning_tasks(room_id, scheduled_date);
```

### Таблица staff_members (расширение users)

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_role VARCHAR(20);
-- housekeeper | supervisor | maintenance
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
```

---

## API эндпоинты

### Room Statuses

```
GET    /housekeeping/rooms                    # Все номера со статусами
PUT    /housekeeping/rooms/:roomId/status     # Обновить статус номера
```

**GET /housekeeping/rooms**

Response:
```json
{
  "rooms": [
    {
      "room_id": "uuid",
      "room_name": "101",
      "room_type": "double",
      "floor": 1,
      "status": "dirty",
      "current_guest": "Ахмедов А.",
      "checkout_today": true,
      "checkin_today": false,
      "last_cleaned_at": "2026-02-24T14:30:00Z",
      "last_cleaned_by": "Гулнора",
      "active_task": {
        "id": "uuid",
        "type": "checkout",
        "assigned_to": "Гулнора",
        "status": "assigned"
      }
    }
  ],
  "summary": {
    "total": 45,
    "clean": 28,
    "dirty": 12,
    "cleaning": 3,
    "inspection": 2,
    "do_not_disturb": 0,
    "out_of_order": 0
  }
}
```

**PUT /housekeeping/rooms/:roomId/status**

Body:
```json
{
  "status": "clean",
  "notes": "Генеральная уборка выполнена"
}
```

### Cleaning Tasks

```
GET    /housekeeping/tasks                    # Список задач (фильтры: date, status, assigned_to)
POST   /housekeeping/tasks                    # Создать задачу
POST   /housekeeping/tasks/generate           # Автогенерация задач на день
PUT    /housekeeping/tasks/:id/assign         # Назначить горничную
PUT    /housekeeping/tasks/:id/start          # Начать уборку
PUT    /housekeeping/tasks/:id/complete       # Завершить уборку
PUT    /housekeeping/tasks/:id/verify         # Подтвердить (менеджер)
DELETE /housekeeping/tasks/:id                # Отменить задачу
```

**POST /housekeeping/tasks/generate**

Автоматическое создание задач на текущий день:
1. Все номера с checkout сегодня → задача типа `checkout`
2. Все занятые номера → задача типа `standard` (ежедневная уборка)
3. Номера со статусом `dirty` без задач → задача типа `standard`

Body:
```json
{
  "date": "2026-02-25",
  "auto_assign": true
}
```

Логика `auto_assign`:
- Равномерно распределить задачи между горничными с `staff_role = 'housekeeper'`
- Приоритет: checkout > dirty > standard
- Учитывать этаж (горничная обслуживает свой этаж)

**PUT /housekeeping/tasks/:id/complete**

Body:
```json
{
  "notes": "Заменено бельё, пополнен мини-бар"
}
```

Логика:
1. Обновить статус задачи → `completed`
2. Обновить статус номера → `inspection` (ожидает проверки менеджера)
3. Уведомить менеджера в Telegram: «Номер 101 убран, ожидает проверки»

### Reports

```
GET    /housekeeping/reports/daily            # Отчёт за день
GET    /housekeeping/reports/staff            # Отчёт по горничным
```

**GET /housekeeping/reports/daily**

Query: `date=2026-02-25`

Response:
```json
{
  "date": "2026-02-25",
  "total_tasks": 32,
  "completed": 28,
  "pending": 4,
  "avg_duration_minutes": 35,
  "by_type": {
    "standard": { "total": 20, "completed": 18 },
    "checkout": { "total": 10, "completed": 8 },
    "deep": { "total": 2, "completed": 2 }
  },
  "by_staff": [
    { "name": "Гулнора", "completed": 8, "avg_duration": 32 },
    { "name": "Дилноза", "completed": 7, "avg_duration": 38 }
  ]
}
```

---

## Telegram-бот интеграция

Расширить существующий Telegram-бот (AGENT-09) командами для горничных:

### Команды горничной

```
/tasks          → Мои задачи на сегодня
/start <номер>  → Начать уборку номера
/done <номер>   → Завершить уборку номера
/status         → Сводка по номерам
```

### Формат сообщения «Мои задачи»

```
📋 Задачи на 25.02.2026

🔴 Выезд:
  101 — Checkout уборка (приоритет!)
  205 — Checkout уборка

🟡 Ежедневная:
  102 — Стандартная уборка
  103 — Стандартная уборка
  204 — Стандартная уборка

Всего: 5 номеров
Отметить начало: /start 101
```

### Уведомления менеджеру

- Горничная начала уборку: «🧹 Гулнора начала уборку номера 101»
- Горничная завершила: «✅ Номер 101 убран. Гулнора, 32 мин. Ожидает проверки»
- Задачи не назначены: «⚠️ 5 номеров без назначенной горничной на 25.02»
- Утренний дайджест (08:00): сводка задач на день

---

## Frontend

### Страница «Housekeeping» (/housekeeping)

Визуальная доска статусов номеров в виде сетки:

```
┌─────────────────────────────────────────────────────┐
│ Housekeeping              [Автогенерация задач] [📊]│
├──────┬──────┬──────┬──────┬──────┬──────┬──────────-│
│ Все  │Чист. │Грязн.│Уборка│Провер│DND   │Не раб.   │
│ (45) │ (28) │ (12) │ (3)  │ (2)  │ (0)  │ (0)      │
├──────┴──────┴──────┴──────┴──────┴──────┴──────────-│
│                                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │ 101  │ │ 102  │ │ 103  │ │ 104  │ │ 105  │      │
│  │🟢чист│ │🔴гряз│ │🟡убор│ │🟢чист│ │🟢чист│      │
│  │      │ │Гулн. │ │Дилн. │ │      │ │      │      │
│  │ DBL  │ │ SGL  │ │ DBL  │ │ FAM  │ │ SGL  │      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │
│                                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │ 201  │ │ 202  │ │ 203  │ │ 204  │ │ 205  │      │
│  │🔴гряз│ │🟢чист│ │🔴гряз│ │🟡убор│ │🔵пров│      │
│  │      │ │      │ │Ахмед.│ │Гулн. │ │Дилн. │      │
│  │ DBL  │ │ SGL  │ │ LUX  │ │ DBL  │ │ SGL  │      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │
└─────────────────────────────────────────────────────┘
```

Клик на номер → боковая панель с:
- Текущий статус (с возможностью изменить)
- Активная задача и назначенная горничная
- Текущий гость (если занят)
- Заезд/выезд сегодня
- История уборок (последние 5)
- Кнопка «Назначить горничную»

### Интеграция с шахматкой

На основной шахматке добавить индикатор статуса чистоты:
- Маленькая цветная точка в углу ячейки номера
- 🟢 чистый | 🔴 грязный | 🟡 уборка | 🔵 проверка

---

## Автоматические правила

1. **Выезд гостя** → статус номера автоматически меняется на `dirty`
2. **Заезд в грязный номер** → предупреждение администратору
3. **Утро (08:00)** → автогенерация задач если `auto_generate_tasks = true` в настройках
4. **Задача не начата > 2 часов** → уведомление менеджеру
5. **Все задачи дня выполнены** → уведомление менеджеру: «Все номера убраны ✅»

---

## ENV переменные

```env
HOUSEKEEPING_AUTO_GENERATE=true
HOUSEKEEPING_MORNING_REPORT_TIME=08:00
HOUSEKEEPING_TASK_TIMEOUT_HOURS=2
```

---

## Новые типы (добавить в SHARED_TYPES.md)

```typescript
export type RoomCleaningStatus = 'clean' | 'dirty' | 'cleaning' | 'inspection' | 'do_not_disturb' | 'out_of_order';

export type CleaningTaskType = 'standard' | 'checkout' | 'deep' | 'turndown';

export type CleaningTaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'verified' | 'cancelled';

export interface RoomStatusInfo {
  room_id: string;
  room_name: string;
  room_type: RoomType;
  floor?: number;
  status: RoomCleaningStatus;
  current_guest?: string;
  checkout_today: boolean;
  checkin_today: boolean;
  last_cleaned_at?: string;
  last_cleaned_by?: string;
  active_task?: CleaningTaskSummary;
}

export interface CleaningTask {
  id: string;
  property_id: string;
  room_id: string;
  room_name: string;
  task_type: CleaningTaskType;
  status: CleaningTaskStatus;
  assigned_to?: { id: string; name: string };
  priority: number;
  scheduled_date: string;
  started_at?: string;
  completed_at?: string;
  verified_by?: string;
  notes?: string;
  duration_minutes?: number;
}
```

---

## Тесты

```typescript
describe('Housekeeping', () => {
  it('GET /housekeeping/rooms — возвращает все номера со статусами', ...);
  it('PUT /housekeeping/rooms/:id/status — обновляет статус номера', ...);
  it('POST /housekeeping/tasks/generate — генерирует задачи на день', ...);
  it('POST /housekeeping/tasks/generate — создаёт checkout задачи для выездов', ...);
  it('PUT /housekeeping/tasks/:id/complete — меняет статус номера на inspection', ...);
  it('PUT /housekeeping/tasks/:id/verify — меняет статус номера на clean', ...);
  it('Выезд гостя автоматически ставит dirty', ...);
  it('Telegram /tasks — отправляет список задач горничной', ...);
  it('Telegram /done — завершает задачу и уведомляет менеджера', ...);
  it('Отчёт по горничным корректно считает среднее время уборки', ...);
});
```

---

## Сигнал завершения

Агент завершил работу когда:
- [ ] Статусы номеров отображаются на отдельной странице /housekeeping
- [ ] Статусы видны на шахматке (цветные индикаторы)
- [ ] Задачи генерируются автоматически утром
- [ ] Горничная может получить задачи и отметить выполнение через Telegram
- [ ] Менеджер получает уведомления о выполнении
- [ ] Отчёт по уборкам за день работает
- [ ] Выезд гостя автоматически ставит статус «грязный»
- [ ] TypeScript компилируется без ошибок
- [ ] Все тесты проходят
