'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/layout/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { usePropertyId } from '@/lib/hooks/use-property-id';
import { api } from '@/lib/api';
import {
  listMinNightsRules,
  createMinNightsRule,
  deleteMinNightsRule,
  type MinNightsRule,
} from '@/lib/api/rates';
import {
  listHolidays,
  createHoliday,
  deleteHoliday,
  seedHolidays,
  type HolidayRule,
} from '@/lib/api/holidays';

interface PricingRule {
  id: string;
  name: string;
  is_active: boolean;
  priority: number;
  trigger_type: string;
  trigger_config: Record<string, any>;
  action_type: string;
  action_value: number;
  apply_to: string;
  min_price: number | null;
  max_price: number | null;
}

const TRIGGER_LABELS: Record<string, string> = {
  occupancy_high: 'Загрузка выше порога',
  occupancy_low: 'Загрузка ниже порога',
  days_before: 'Дней до заезда',
  day_of_week: 'День недели',
};

const ACTION_LABELS: Record<string, string> = {
  increase_percent: 'Повысить на',
  decrease_percent: 'Понизить на',
  set_fixed: 'Установить',
};

function formatTrigger(rule: PricingRule): string {
  const c = rule.trigger_config;
  switch (rule.trigger_type) {
    case 'occupancy_high':
      return `Загрузка > ${c.threshold}% за ${c.period_days} дней`;
    case 'occupancy_low':
      return `Загрузка < ${c.threshold}% за ${c.period_days} дней`;
    case 'days_before':
      return `${c.days_min}–${c.days_max} дней до заезда`;
    case 'day_of_week': {
      const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      return (c.days as number[]).map((d: number) => dayNames[d]).join(', ');
    }
    default:
      return rule.trigger_type;
  }
}

function formatAction(rule: PricingRule): string {
  switch (rule.action_type) {
    case 'increase_percent':
      return `+${rule.action_value}%`;
    case 'decrease_percent':
      return `−${rule.action_value}%`;
    case 'set_fixed':
      return `${(rule.action_value / 100).toLocaleString()} сум`;
    default:
      return String(rule.action_value);
  }
}

export default function PricingSettingsPage() {
  const propertyId = usePropertyId();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'occupancy_high',
    threshold: 80,
    period_days: 7,
    days_min: 1,
    days_max: 3,
    days: [5, 6, 0] as number[],
    action_type: 'increase_percent',
    action_value: 20,
    priority: 10,
  });

  // ── Min Nights Rules state ──────────────────────────────────────────────
  const [minNightsRules, setMinNightsRules] = useState<MinNightsRule[]>([]);
  const [showMinNightsModal, setShowMinNightsModal] = useState(false);
  const [mnDateFrom, setMnDateFrom] = useState('');
  const [mnDateTo, setMnDateTo] = useState('');
  const [mnMinNights, setMnMinNights] = useState('2');

  // ── Holidays state ──────────────────────────────────────────────────────
  const [holidays, setHolidays] = useState<HolidayRule[]>([]);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [hlName, setHlName] = useState('');
  const [hlDateFrom, setHlDateFrom] = useState('');
  const [hlDateTo, setHlDateTo] = useState('');
  const [hlBoostPercent, setHlBoostPercent] = useState('20');
  const [hlMinNights, setHlMinNights] = useState('1');
  const [hlRecurYearly, setHlRecurYearly] = useState(true);

  // ── Load min nights rules ──────────────────────────────────────────────
  const loadMinNightsRules = useCallback(async () => {
    if (!propertyId) return;
    try {
      const data = await listMinNightsRules(propertyId);
      setMinNightsRules(data);
    } catch {
      /* silent */
    }
  }, [propertyId]);

  // ── Load holidays ──────────────────────────────────────────────────────
  const loadHolidays = useCallback(async () => {
    if (!propertyId) return;
    try {
      const data = await listHolidays(propertyId);
      setHolidays(data);
    } catch {
      /* silent */
    }
  }, [propertyId]);

  useEffect(() => {
    if (propertyId) {
      loadRules();
      loadMinNightsRules();
      loadHolidays();
    }
  }, [propertyId, loadMinNightsRules, loadHolidays]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/properties/${propertyId}/pricing-rules`);
      setRules(res.data.data);
    } catch {
      toast.error('Не удалось загрузить правила');
    } finally {
      setLoading(false);
    }
  };

  const createRule = async () => {
    if (!propertyId || !formData.name.trim()) return;

    let trigger_config: Record<string, any> = {};
    switch (formData.trigger_type) {
      case 'occupancy_high':
      case 'occupancy_low':
        trigger_config = { threshold: formData.threshold, period_days: formData.period_days };
        break;
      case 'days_before':
        trigger_config = { days_min: formData.days_min, days_max: formData.days_max };
        break;
      case 'day_of_week':
        trigger_config = { days: formData.days };
        break;
    }

    try {
      await api.post(`/properties/${propertyId}/pricing-rules`, {
        name: formData.name,
        trigger_type: formData.trigger_type,
        trigger_config,
        action_type: formData.action_type,
        action_value: formData.action_value,
        priority: formData.priority,
      });
      toast.success('Правило создано');
      setShowForm(false);
      loadRules();
    } catch {
      toast.error('Ошибка создания');
    }
  };

  const toggleRule = async (ruleId: string) => {
    try {
      await api.patch(`/pricing-rules/${ruleId}/toggle?property_id=${propertyId}`);
      loadRules();
    } catch {
      toast.error('Ошибка');
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Удалить правило?')) return;
    try {
      await api.delete(`/pricing-rules/${ruleId}?property_id=${propertyId}`);
      toast.success('Правило удалено');
      loadRules();
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const runNow = async () => {
    try {
      await api.post(`/properties/${propertyId}/pricing-rules/run-now`);
      toast.success('Пересчёт запущен');
    } catch {
      toast.error('Ошибка запуска');
    }
  };

  const addTemplates = async () => {
    try {
      const res = await api.get('/pricing-rules/templates');
      for (const tmpl of res.data.data) {
        await api.post(`/properties/${propertyId}/pricing-rules`, {
          ...tmpl,
          is_active: false,
        });
      }
      toast.success('Шаблоны добавлены');
      loadRules();
    } catch {
      toast.error('Ошибка');
    }
  };

  // ── Min Nights handlers ────────────────────────────────────────────────
  const handleCreateMinNightsRule = async () => {
    if (!mnDateFrom || !mnDateTo || !mnMinNights) return;
    try {
      await createMinNightsRule({
        date_from: mnDateFrom,
        date_to: mnDateTo,
        min_nights: Number(mnMinNights),
      });
      toast.success('Правило создано');
      setShowMinNightsModal(false);
      setMnDateFrom('');
      setMnDateTo('');
      setMnMinNights('2');
      loadMinNightsRules();
    } catch {
      toast.error('Ошибка создания');
    }
  };

  const handleDeleteMinNightsRule = async (id: number) => {
    if (!confirm('Удалить правило?')) return;
    try {
      await deleteMinNightsRule(id);
      toast.success('Удалено');
      loadMinNightsRules();
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  // ── Holiday handlers ───────────────────────────────────────────────────
  const handleCreateHoliday = async () => {
    if (!hlName.trim() || !hlDateFrom || !hlDateTo) return;
    try {
      await createHoliday({
        name: hlName.trim(),
        date_from: hlDateFrom,
        date_to: hlDateTo,
        price_boost_percent: Number(hlBoostPercent),
        min_nights: Number(hlMinNights) || undefined,
        recur_yearly: hlRecurYearly,
      });
      toast.success('Праздник добавлен');
      setShowHolidayModal(false);
      setHlName('');
      setHlDateFrom('');
      setHlDateTo('');
      setHlBoostPercent('20');
      setHlMinNights('1');
      setHlRecurYearly(true);
      loadHolidays();
    } catch {
      toast.error('Ошибка создания');
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!confirm('Удалить праздник?')) return;
    try {
      await deleteHoliday(id);
      toast.success('Удалено');
      loadHolidays();
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const handleSeedHolidays = async () => {
    if (!propertyId) return;
    try {
      await seedHolidays(propertyId);
      toast.success('Шаблон праздников загружен');
      loadHolidays();
    } catch {
      toast.error('Ошибка загрузки шаблона');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="Динамическое ценообразование" />
        <div className="flex justify-center mt-12"><Spinner /></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        title="Динамическое ценообразование"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={runNow} size="sm">
              Запустить сейчас
            </Button>
            <Button onClick={() => setShowForm(true)} size="sm">
              + Добавить правило
            </Button>
          </div>
        }
      />

      {rules.length === 0 && !showForm && (
        <div className="mt-8 text-center py-12 bg-white rounded-xl border">
          <p className="text-gray-500 mb-4">Нет правил ценообразования</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => setShowForm(true)}>Создать правило</Button>
            <Button variant="secondary" onClick={addTemplates}>
              Добавить шаблоны
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mt-6 bg-white rounded-xl border p-5 space-y-4">
          <h3 className="font-semibold">Новое правило</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Высокий сезон"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Триггер</label>
            <Select
              value={formData.trigger_type}
              onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
              options={Object.entries(TRIGGER_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            />
          </div>

          {(formData.trigger_type === 'occupancy_high' || formData.trigger_type === 'occupancy_low') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Порог, %</label>
                <Input
                  type="number"
                  value={formData.threshold}
                  onChange={(e) => setFormData({ ...formData, threshold: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Период, дней</label>
                <Input
                  type="number"
                  value={formData.period_days}
                  onChange={(e) => setFormData({ ...formData, period_days: Number(e.target.value) })}
                />
              </div>
            </div>
          )}

          {formData.trigger_type === 'days_before' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">От (дней)</label>
                <Input
                  type="number"
                  value={formData.days_min}
                  onChange={(e) => setFormData({ ...formData, days_min: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">До (дней)</label>
                <Input
                  type="number"
                  value={formData.days_max}
                  onChange={(e) => setFormData({ ...formData, days_max: Number(e.target.value) })}
                />
              </div>
            </div>
          )}

          {formData.trigger_type === 'day_of_week' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Дни недели</label>
              <div className="flex gap-2 flex-wrap">
                {['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'].map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const days = formData.days.includes(idx)
                        ? formData.days.filter((d) => d !== idx)
                        : [...formData.days, idx];
                      setFormData({ ...formData, days });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${
                      formData.days.includes(idx)
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Действие</label>
              <Select
                value={formData.action_type}
                onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
                options={Object.entries(ACTION_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.action_type === 'set_fixed' ? 'Сумма (тийин)' : 'Процент'}
              </label>
              <Input
                type="number"
                value={formData.action_value}
                onChange={(e) => setFormData({ ...formData, action_value: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
            <Input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
              min={1}
              max={100}
            />
            <p className="text-xs text-gray-500 mt-1">Чем меньше — тем раньше применяется</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={createRule}>Сохранить</Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      {rules.length > 0 && (
        <div className="mt-6 space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white rounded-xl border p-4 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 truncate">{rule.name}</h4>
                  <Badge variant={rule.is_active ? 'success' : 'default'}>
                    {rule.is_active ? 'Активно' : 'Выкл'}
                  </Badge>
                  <span className="text-xs text-gray-400">Приоритет: {rule.priority}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {formatTrigger(rule)} → {formatAction(rule)}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => toggleRule(rule.id)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {rule.is_active ? 'Выкл' : 'Вкл'}
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rules.length > 0 && (
        <div className="mt-4">
          <a
            href={`/settings/pricing/history`}
            className="text-sm text-green-700 hover:underline"
          >
            История изменений цен →
          </a>
        </div>
      )}

      {/* ── Min Nights Rules ──────────────────────────────────────────────── */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Минимальное количество ночей</h2>
            <p className="text-sm text-gray-500 mt-0.5">Правила минимального срока проживания по датам</p>
          </div>
          <Button size="sm" onClick={() => setShowMinNightsModal(true)}>
            + Правило
          </Button>
        </div>

        {minNightsRules.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">Нет правил минимального срока</p>
          </div>
        ) : (
          <div className="space-y-3">
            {minNightsRules.map((rule) => (
              <div
                key={rule.id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {rule.dateFrom} — {rule.dateTo}
                    </span>
                    <Badge variant="info">мин. {rule.minNights} ночей</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {rule.appliesToRooms && rule.appliesToRooms.length > 0
                      ? `Номера: ${rule.appliesToRooms.join(', ')}`
                      : 'Все номера'}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteMinNightsRule(rule.id)}
                  className="text-sm text-red-500 hover:text-red-700 ml-4"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Min Nights Modal */}
      <Modal
        open={showMinNightsModal}
        onClose={() => setShowMinNightsModal(false)}
        title="Новое правило мин. ночей"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Дата от"
              type="date"
              value={mnDateFrom}
              onChange={(e) => setMnDateFrom(e.target.value)}
            />
            <Input
              label="Дата до"
              type="date"
              value={mnDateTo}
              onChange={(e) => setMnDateTo(e.target.value)}
            />
          </div>
          <Input
            label="Минимум ночей"
            type="number"
            value={mnMinNights}
            onChange={(e) => setMnMinNights(e.target.value)}
            min={1}
          />
          <div className="flex gap-2 pt-2">
            <Button onClick={handleCreateMinNightsRule}>Создать</Button>
            <Button variant="secondary" onClick={() => setShowMinNightsModal(false)}>
              Отмена
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Holiday Calendar ──────────────────────────────────────────────── */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Праздничный календарь</h2>
            <p className="text-sm text-gray-500 mt-0.5">Наценки и мин. ночи на праздничные даты</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleSeedHolidays}>
              Заполнить шаблон
            </Button>
            <Button size="sm" onClick={() => setShowHolidayModal(true)}>
              + Добавить
            </Button>
          </div>
        </div>

        {holidays.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">Нет праздников</p>
          </div>
        ) : (
          <div className="space-y-3">
            {holidays.map((h) => (
              <div
                key={h.id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{h.name}</span>
                    <Badge variant="warning">+{h.priceBoostPercent}%</Badge>
                    {h.minNights > 1 && (
                      <Badge variant="info">мин. {h.minNights} ночей</Badge>
                    )}
                    {h.recurYearly && (
                      <Badge variant="default">ежегодный</Badge>
                    )}
                    <Badge variant={h.isActive ? 'success' : 'default'}>
                      {h.isActive ? 'Активен' : 'Выкл'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {h.dateFrom} — {h.dateTo}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteHoliday(h.id)}
                  className="text-sm text-red-500 hover:text-red-700 ml-4"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Holiday Modal */}
      <Modal
        open={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        title="Добавить праздник"
      >
        <div className="space-y-4">
          <Input
            label="Название"
            value={hlName}
            onChange={(e) => setHlName(e.target.value)}
            placeholder="Навруз"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Дата от"
              type="date"
              value={hlDateFrom}
              onChange={(e) => setHlDateFrom(e.target.value)}
            />
            <Input
              label="Дата до"
              type="date"
              value={hlDateTo}
              onChange={(e) => setHlDateTo(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Наценка, %"
              type="number"
              value={hlBoostPercent}
              onChange={(e) => setHlBoostPercent(e.target.value)}
              min={0}
            />
            <Input
              label="Мин. ночей"
              type="number"
              value={hlMinNights}
              onChange={(e) => setHlMinNights(e.target.value)}
              min={1}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hlRecurYearly}
              onChange={(e) => setHlRecurYearly(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Повторять ежегодно</span>
          </label>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleCreateHoliday}>Создать</Button>
            <Button variant="secondary" onClick={() => setShowHolidayModal(false)}>
              Отмена
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
