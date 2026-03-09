# AGENT-16: Dynamic Pricing — Динамическое ценообразование

**Wave:** 4 (параллельно с AGENT-11, 12, 13, 15)
**Приоритет:** P2
**Зависит от:** AGENT-02 (db), AGENT-03 (auth), AGENT-04 (rooms), AGENT-07 (rates), AGENT-05 (bookings — для чтения загрузки)
**Блокирует:** AGENT-14 (testing)

---

## Зачем этот модуль

Конкуренты Bnovo и SmartBooking предлагают автоматическое изменение цен в зависимости от загрузки.
Без этой функции Sardoba PMS проигрывает по аргументу «зарабатывай больше в пиковый сезон».

Упрощённая реализация — не сложный Revenue Management System (RMS), а правила типа:
«если загрузка > 80% — поднять цену на 20%» и «если загрузка < 30% и до заезда > 7 дней — скидка 10%».

---

## Задача

Реализовать модуль динамического ценообразования:
1. **Правила (Rules)** — владелец задаёт условия и коэффициенты
2. **Scheduler** — каждые 6 часов пересчитывает цены и обновляет в channel manager
3. **История** — журнал изменений цен с причиной

**Читать перед стартом:** `API_CONVENTIONS.md`, `SHARED_TYPES.md`, `ERROR_CODES.md`, `ENV_VARIABLES.md`

---

## Файловая структура

```
apps/api/src/modules/dynamic-pricing/
├── dynamic-pricing.module.ts
├── dynamic-pricing.controller.ts
├── dynamic-pricing.service.ts      # Логика применения правил
├── pricing-scheduler.service.ts   # Bull cron-задача
├── dto/
│   ├── create-rule.dto.ts
│   └── update-rule.dto.ts
└── dynamic-pricing.service.spec.ts

apps/web/src/app/(dashboard)/settings/pricing/
├── page.tsx                        # Список правил
├── new/page.tsx                    # Создание правила
├── [ruleId]/page.tsx               # Редактирование правила
└── history/page.tsx                # История изменений цен
```

---

## База данных

```sql
-- Таблица правил динамического ценообразования
CREATE TABLE dynamic_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 10,            -- меньше = выше приоритет

  -- Тригеры (условия срабатывания)
  trigger_type VARCHAR(50) NOT NULL,
  -- Возможные значения:
  -- 'occupancy_high'    — загрузка выше порога
  -- 'occupancy_low'     — загрузка ниже порога
  -- 'days_before'       — N дней до заезда (last minute / early bird)
  -- 'day_of_week'       — день недели

  trigger_config JSONB NOT NULL,
  -- Для 'occupancy_high':  { "threshold": 80, "period_days": 7 }
  -- Для 'occupancy_low':   { "threshold": 30, "period_days": 14 }
  -- Для 'days_before':     { "days_min": 1, "days_max": 3 }  (last minute)
  --                         { "days_min": 30, "days_max": 999 } (early bird)
  -- Для 'day_of_week':     { "days": [5, 6, 7] }  (пятница, суббота, воскресенье)

  -- Действие
  action_type VARCHAR(50) NOT NULL,
  -- 'increase_percent'  — повысить цену на X%
  -- 'decrease_percent'  — понизить цену на X%
  -- 'set_fixed'         — установить фиксированную цену (тийины)

  action_value DECIMAL(10, 2) NOT NULL,   -- процент или сумма

  -- Область применения
  apply_to VARCHAR(50) DEFAULT 'all',     -- 'all' | 'room_type' | 'room'
  room_ids UUID[],                        -- если apply_to = 'room' или 'room_type'

  -- Лимиты безопасности
  min_price INTEGER,                      -- не опускаться ниже (тийины)
  max_price INTEGER,                      -- не подниматься выше (тийины)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dynamic_rules_property ON dynamic_pricing_rules(property_id, is_active);

-- Журнал изменений цен
CREATE TABLE pricing_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  room_id UUID REFERENCES rooms(id),
  rule_id UUID REFERENCES dynamic_pricing_rules(id),
  rule_name VARCHAR(255),
  date DATE NOT NULL,                     -- дата на которую изменилась цена
  old_price INTEGER,                      -- тийины
  new_price INTEGER,                      -- тийины
  trigger_value DECIMAL(10, 2),           -- фактическое значение тригера (например, occupancy = 85%)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pricing_log_property_date ON pricing_change_log(property_id, created_at DESC);
```

---

## API эндпоинты

### Управление правилами

```
GET    /properties/:id/pricing-rules          → список правил
POST   /properties/:id/pricing-rules          → создать правило
GET    /pricing-rules/:ruleId                 → одно правило
PUT    /pricing-rules/:ruleId                 → обновить
DELETE /pricing-rules/:ruleId                 → удалить
PATCH  /pricing-rules/:ruleId/toggle          → включить/выключить
POST   /properties/:id/pricing-rules/preview  → предпросмотр без сохранения
GET    /properties/:id/pricing-rules/history  → журнал изменений
POST   /properties/:id/pricing-rules/run-now  → запустить пересчёт вручную
```

### POST /properties/:id/pricing-rules

**Body:**
```json
{
  "name": "Повышение при высокой загрузке",
  "trigger_type": "occupancy_high",
  "trigger_config": {
    "threshold": 80,
    "period_days": 7
  },
  "action_type": "increase_percent",
  "action_value": 20,
  "apply_to": "all",
  "min_price": null,
  "max_price": null,
  "is_active": true
}
```

### POST /properties/:id/pricing-rules/preview

Показывает как изменятся цены на ближайшие 30 дней если правило применить. Не сохраняет изменения.

**Response:**
```json
{
  "preview_days": [
    {
      "date": "2025-06-01",
      "room_id": "uuid",
      "room_name": "Стандарт двухместный",
      "current_price": 50000000,
      "new_price": 60000000,
      "change_percent": 20,
      "trigger_value": 85.3,
      "rule_name": "Повышение при высокой загрузке"
    }
  ]
}
```

---

## Логика применения правил

```typescript
// dynamic-pricing.service.ts

@Injectable()
export class DynamicPricingService {
  
  async runPricingCalculation(propertyId: string): Promise<void> {
    const rules = await this.getActiveRules(propertyId);
    const rooms = await this.roomsService.findAll(propertyId);
    
    // Горизонт: ближайшие 90 дней
    const today = new Date();
    const horizon = addDays(today, 90);
    
    for (const room of rooms) {
      for (const date of eachDayOfInterval({ start: today, end: horizon })) {
        const basePrice = await this.ratesService.getBasePrice(room.id, date);
        let finalPrice = basePrice;
        
        // Применяем правила по приоритету (меньше priority → выше приоритет)
        const sortedRules = rules
          .filter(r => this.ruleAppliesTo(r, room))
          .sort((a, b) => a.priority - b.priority);
        
        for (const rule of sortedRules) {
          const triggerValue = await this.evaluateTrigger(rule, room, date, propertyId);
          
          if (triggerValue !== null) {
            // Правило срабатывает — применяем действие
            const newPrice = this.applyAction(finalPrice, rule, triggerValue);
            
            // Соблюдаем лимиты безопасности
            finalPrice = Math.max(
              rule.min_price ?? 0,
              Math.min(rule.max_price ?? Infinity, newPrice)
            );
            
            // Логируем изменение
            if (finalPrice !== basePrice) {
              await this.logPriceChange(room, rule, date, basePrice, finalPrice, triggerValue);
            }
          }
        }
        
        // Сохранить итоговую цену как dynamic override для этого дня
        await this.saveDynamicPrice(room.id, date, finalPrice);
      }
    }
  }
  
  private async evaluateTrigger(
    rule: DynamicPricingRule,
    room: Room,
    date: Date,
    propertyId: string
  ): Promise<number | null> {
    switch (rule.trigger_type) {
      case 'occupancy_high':
      case 'occupancy_low': {
        const { threshold, period_days } = rule.trigger_config;
        const periodStart = date;
        const periodEnd = addDays(date, period_days);
        
        // Считаем загрузку за период
        const occupancy = await this.calculateOccupancy(propertyId, periodStart, periodEnd);
        
        if (rule.trigger_type === 'occupancy_high' && occupancy >= threshold) {
          return occupancy;  // триггер сработал
        }
        if (rule.trigger_type === 'occupancy_low' && occupancy <= threshold) {
          return occupancy;
        }
        return null;  // не сработал
      }
      
      case 'days_before': {
        const { days_min, days_max } = rule.trigger_config;
        const daysUntil = differenceInDays(date, new Date());
        
        if (daysUntil >= days_min && daysUntil <= days_max) {
          return daysUntil;
        }
        return null;
      }
      
      case 'day_of_week': {
        const { days } = rule.trigger_config;  // [1..7]
        const dayOfWeek = getDay(date) || 7;  // 1=пн, 7=вс
        
        if (days.includes(dayOfWeek)) {
          return dayOfWeek;
        }
        return null;
      }
    }
  }
  
  private applyAction(basePrice: number, rule: DynamicPricingRule, _triggerValue: number): number {
    switch (rule.action_type) {
      case 'increase_percent':
        return Math.round(basePrice * (1 + rule.action_value / 100));
      case 'decrease_percent':
        return Math.round(basePrice * (1 - rule.action_value / 100));
      case 'set_fixed':
        return Math.round(rule.action_value);
    }
  }
  
  private async calculateOccupancy(
    propertyId: string,
    from: Date,
    to: Date
  ): Promise<number> {
    // Используем существующую логику из AGENT-11 AnalyticsService
    // Возвращает процент загрузки 0-100
    const { occupancy_rate } = await this.analyticsService.getOccupancySummary(
      propertyId, from, to
    );
    return occupancy_rate;
  }
}
```

---

## Хранение dynamic override цен

Добавить таблицу для хранения пересчитанных цен (чтобы не пересчитывать каждый раз):

```sql
CREATE TABLE dynamic_price_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price INTEGER NOT NULL,  -- тийины
  rule_ids UUID[],         -- какие правила применились
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (room_id, date)
);

CREATE INDEX idx_dynamic_overrides_room_date ON dynamic_price_overrides(room_id, date);
```

**Интеграция с RatesService (AGENT-07):**

В `RatesService.calculate()` добавить шаг: после применения тарифов проверить `dynamic_price_overrides` — если есть override на эту дату, использовать его (если он выше/ниже базы — по настройке владельца «override always» или «override only if higher»).

---

## Scheduler (Bull Queue)

```typescript
// pricing-scheduler.service.ts

@Injectable()
export class PricingSchedulerService {
  constructor(
    @InjectQueue('pricing') private pricingQueue: Queue,
  ) {}
  
  // Запускать каждые 6 часов
  @Cron('0 0,6,12,18 * * *', { timeZone: 'Asia/Tashkent' })
  async schedulePricingRun() {
    const properties = await this.propertiesService.findAllWithActivePricingRules();
    
    for (const property of properties) {
      await this.pricingQueue.add('run-pricing', {
        propertyId: property.id,
      }, {
        jobId: `pricing-${property.id}-${Date.now()}`,
        removeOnComplete: 100,
        removeOnFail: 50,
      });
    }
  }
}

// Bull processor
@Process('run-pricing')
async processPricing(job: Job<{ propertyId: string }>) {
  await this.dynamicPricingService.runPricingCalculation(job.data.propertyId);
  
  // После пересчёта — отправить обновлённые цены в channel manager
  await this.channelManagerService.syncPrices(job.data.propertyId);
}
```

---

## Предустановленные шаблоны правил

При создании нового отеля (или по кнопке «Добавить шаблоны») предлагать готовые правила:

```typescript
export const PRICING_RULE_TEMPLATES = [
  {
    name: '🔥 Высокий сезон (загрузка > 80%)',
    trigger_type: 'occupancy_high',
    trigger_config: { threshold: 80, period_days: 7 },
    action_type: 'increase_percent',
    action_value: 20,
  },
  {
    name: '💤 Низкий сезон (загрузка < 30%)',
    trigger_type: 'occupancy_low',
    trigger_config: { threshold: 30, period_days: 14 },
    action_type: 'decrease_percent',
    action_value: 10,
  },
  {
    name: '⚡ Last Minute (за 1-3 дня)',
    trigger_type: 'days_before',
    trigger_config: { days_min: 1, days_max: 3 },
    action_type: 'decrease_percent',
    action_value: 15,
  },
  {
    name: '📅 Early Bird (за 30+ дней)',
    trigger_type: 'days_before',
    trigger_config: { days_min: 30, days_max: 999 },
    action_type: 'decrease_percent',
    action_value: 10,
  },
  {
    name: '🎉 Выходные (пт-вс)',
    trigger_type: 'day_of_week',
    trigger_config: { days: [5, 6, 7] },
    action_type: 'increase_percent',
    action_value: 15,
  },
];
```

---

## Frontend (Dashboard)

### Список правил (`/settings/pricing`)

```
Динамическое ценообразование                [+ Добавить правило]
                                             [▶ Запустить сейчас]

┌─────────────────────────────────────────────────────────────┐
│ 🔥 Высокий сезон          Активно  [●]   Приор: 10  [✏][🗑] │
│ Загрузка > 80% за 7 дней → +20%                             │
├─────────────────────────────────────────────────────────────┤
│ ⚡ Last Minute            Активно  [●]   Приор: 20  [✏][🗑] │
│ 1-3 дня до заезда → -15%                                    │
└─────────────────────────────────────────────────────────────┘

История изменений цен → [перейти]
```

### Форма создания правила

```
Название: [________________________]

Тригер: [select: Загрузка / Дней до заезда / День недели]

  [если Загрузка]:
    Тип: (●) выше порога  ( ) ниже порога
    Порог: [80] %    За период: [7] дней

  [если Дней до заезда]:
    От [1] до [3] дней  — Last Minute
    или: От [30] до [999] дней — Early Bird

  [если День недели]:
    [✓] Пн  [ ] Вт  [ ] Ср  [ ] Чт  [✓] Пт  [✓] Сб  [✓] Вс

Действие:
  (●) Повысить на [20] %
  ( ) Понизить на [ ] %
  ( ) Установить фиксированно [ ] сум

Применить к: (●) всем номерам  ( ) категории  ( ) конкретным номерам

Лимиты безопасности (опционально):
  Не ниже: [_______] сум     Не выше: [_______] сум

Приоритет: [10]  (чем меньше — тем раньше применяется)

[Предпросмотр на 30 дней]    [Сохранить]
```

### Предпросмотр

Таблица: дата / номер / текущая цена / новая цена / изменение / причина.
Показывать только дни где цена изменится.

### История изменений

Таблица с фильтрами по периоду и номеру:
Дата | Номер | Старая цена | Новая цена | Изменение | Правило | Значение тригера

---

## Новые типы (добавить в SHARED_TYPES.md)

```typescript
export type DynamicPricingTriggerType =
  | 'occupancy_high'
  | 'occupancy_low'
  | 'days_before'
  | 'day_of_week';

export type DynamicPricingActionType =
  | 'increase_percent'
  | 'decrease_percent'
  | 'set_fixed';

export interface DynamicPricingRule {
  id: string;
  property_id: string;
  name: string;
  is_active: boolean;
  priority: number;
  trigger_type: DynamicPricingTriggerType;
  trigger_config: Record<string, number | number[]>;
  action_type: DynamicPricingActionType;
  action_value: number;
  apply_to: 'all' | 'room_type' | 'room';
  room_ids?: string[];
  min_price?: number;
  max_price?: number;
}

export interface PricingChangeLog {
  id: string;
  room_id: string;
  room_name: string;
  rule_id: string;
  rule_name: string;
  date: string;
  old_price: number;
  new_price: number;
  change_percent: number;
  trigger_value: number;
  created_at: string;
}
```

---

## Новые ошибки (добавить в ERROR_CODES.md)

```typescript
// Dynamic Pricing
PRICING_RULE_NOT_FOUND = 'PRICING_RULE_NOT_FOUND',
PRICING_RULE_CONFLICT = 'PRICING_RULE_CONFLICT',  // два правила одного типа с одним приоритетом
PRICING_MIN_EXCEEDS_MAX = 'PRICING_MIN_EXCEEDS_MAX',
```

---

## Тесты

```typescript
describe('DynamicPricingService', () => {
  it('occupancy_high: цена повышается при загрузке > 80%', ...);
  it('occupancy_low: цена снижается при загрузке < 30%', ...);
  it('days_before: last minute скидка за 1-3 дня', ...);
  it('day_of_week: надбавка в выходные дни', ...);
  it('min_price: цена не опускается ниже лимита', ...);
  it('max_price: цена не поднимается выше лимита', ...);
  it('priority: правило с меньшим приоритетом применяется первым', ...);
  it('preview: возвращает изменения без сохранения в БД', ...);
  it('run-now: запускает пересчёт вручную', ...);
  it('scheduler: запускается каждые 6 часов', ...);
});
```

---

## Сигнал завершения

Агент завершил работу когда:
- [ ] CRUD правил работает (GET/POST/PUT/DELETE/PATCH toggle)
- [ ] Все 4 типа тригеров реализованы и протестированы
- [ ] Scheduler запускается по расписанию (каждые 6 часов)
- [ ] `POST /run-now` запускает пересчёт вручную
- [ ] `POST /preview` возвращает предпросмотр без изменения БД
- [ ] Лимиты min_price / max_price соблюдаются
- [ ] pricing_change_log пишется корректно
- [ ] RatesService.calculate() учитывает dynamic overrides
- [ ] После пересчёта вызывается ChannelManagerService.syncPrices()
- [ ] Страница настроек доступна в Dashboard
- [ ] Шаблоны правил доступны в UI
- [ ] TypeScript компилируется без ошибок
- [ ] Все тесты проходят
- [ ] `README.md` модуля обновлён
