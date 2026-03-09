'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { usePropertyId } from '@/lib/hooks/use-property-id';
import { api } from '@/lib/api';

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

  useEffect(() => {
    if (propertyId) loadRules();
  }, [propertyId]);

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
    </div>
  );
}
