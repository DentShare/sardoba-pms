'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/utils/money';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/layout/PageHeader';

/* ── Types ───────────────────────────────────────────────────────────────── */

interface Extra {
  id: number;
  name: string;
  name_uz: string | null;
  description: string | null;
  price: number; // tiyin
  price_type: 'per_booking' | 'per_night' | 'per_person';
  icon: string | null;
  is_active: boolean;
  sort_order: number;
}

type ExtraFormData = {
  name: string;
  name_uz: string;
  description: string;
  price: string; // user types in sum
  price_type: string;
  icon: string;
  is_active: boolean;
};

const EMPTY_FORM: ExtraFormData = {
  name: '',
  name_uz: '',
  description: '',
  price: '',
  price_type: 'per_booking',
  icon: '',
  is_active: true,
};

const PRICE_TYPE_OPTIONS = [
  { value: 'per_booking', label: 'За бронирование' },
  { value: 'per_night', label: 'За ночь' },
  { value: 'per_person', label: 'За гостя' },
];

const ICON_OPTIONS = [
  { value: '', label: 'Без иконки' },
  { value: 'breakfast', label: 'Завтрак' },
  { value: 'transfer', label: 'Трансфер' },
  { value: 'parking', label: 'Парковка' },
  { value: 'spa', label: 'Спа' },
  { value: 'laundry', label: 'Стирка' },
  { value: 'excursion', label: 'Экскурсия' },
  { value: 'minibar', label: 'Мини-бар' },
  { value: 'late_checkout', label: 'Поздний выезд' },
  { value: 'early_checkin', label: 'Ранний заезд' },
  { value: 'baby_crib', label: 'Детская кроватка' },
  { value: 'extra_bed', label: 'Доп. кровать' },
];

const PRICE_TYPE_LABELS: Record<string, string> = {
  per_booking: 'за бронь',
  per_night: 'за ночь',
  per_person: 'за гостя',
};

/* ── Icons ───────────────────────────────────────────────────────────────── */

function IconGrip({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

function IconEdit({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconTrash({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconPlus({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconService({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXTRAS MANAGEMENT PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ExtrasSettingsPage() {
  const [extras, setExtras] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ExtraFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  /* ── Load extras ───────────────────────────────────────────────────────── */
  const loadExtras = useCallback(async () => {
    try {
      const { data } = await api.get('/extras');
      setExtras(Array.isArray(data) ? data : data.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExtras();
  }, [loadExtras]);

  /* ── Open modal ────────────────────────────────────────────────────────── */
  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(extra: Extra) {
    setEditId(extra.id);
    setForm({
      name: extra.name,
      name_uz: extra.name_uz || '',
      description: extra.description || '',
      price: String(extra.price / 100), // tiyin -> sum for display
      price_type: extra.price_type,
      icon: extra.icon || '',
      is_active: extra.is_active,
    });
    setFormErrors({});
    setModalOpen(true);
  }

  /* ── Validate ──────────────────────────────────────────────────────────── */
  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Введите название';
    if (!form.price || Number(form.price) <= 0) errors.price = 'Введите корректную цену';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /* ── Save ───────────────────────────────────────────────────────────────── */
  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      name_uz: form.name_uz.trim() || null,
      description: form.description.trim() || null,
      price: Math.round(Number(form.price) * 100), // sum -> tiyin
      price_type: form.price_type,
      icon: form.icon || null,
      is_active: form.is_active,
    };

    try {
      if (editId) {
        await api.patch(`/extras/${editId}`, payload);
      } else {
        await api.post('/extras', payload);
      }
      setModalOpen(false);
      loadExtras();
    } catch {
      setFormErrors({ submit: 'Ошибка сохранения. Попробуйте ещё раз.' });
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete ────────────────────────────────────────────────────────────── */
  async function handleDelete(id: number) {
    try {
      await api.delete(`/extras/${id}`);
      setDeleteConfirm(null);
      loadExtras();
    } catch {
      // silently fail
    }
  }

  /* ── Toggle active ─────────────────────────────────────────────────────── */
  async function toggleActive(extra: Extra) {
    try {
      await api.patch(`/extras/${extra.id}`, { is_active: !extra.is_active });
      loadExtras();
    } catch {
      // silently fail
    }
  }

  /* ── Drag and drop reorder ─────────────────────────────────────────────── */
  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;

    const newExtras = [...extras];
    const [moved] = newExtras.splice(dragIdx, 1);
    newExtras.splice(idx, 0, moved);
    setExtras(newExtras);
    setDragIdx(idx);
  }

  async function handleDragEnd() {
    setDragIdx(null);
    // Persist new order
    const sortOrders = extras.map((ex, idx) => ({ id: ex.id, sort_order: idx }));
    try {
      await api.patch('/extras/reorder', { items: sortOrders });
    } catch {
      // Reload to revert on failure
      loadExtras();
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Дополнительные услуги"
        subtitle="Управляйте услугами, которые гости могут добавить при бронировании"
      />

      {/* Action bar */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {extras.length} {extras.length === 1 ? 'услуга' : extras.length < 5 ? 'услуги' : 'услуг'}
        </p>
        <Button onClick={openCreate} icon={<IconPlus />}>
          Добавить услугу
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Загрузка...</div>
      ) : extras.length === 0 ? (
        <div className="text-center py-20">
          <IconService className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">Нет услуг</h3>
          <p className="text-sm text-gray-400 mb-4">
            Добавьте дополнительные услуги: завтрак, трансфер, парковку и другие
          </p>
          <Button onClick={openCreate} icon={<IconPlus />}>
            Добавить услугу
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {extras.map((extra, idx) => (
            <div
              key={extra.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                'flex items-center gap-4 p-4 bg-white rounded-xl border transition-all duration-200',
                dragIdx === idx ? 'border-sardoba-gold shadow-glow-gold scale-[1.02]' : 'border-gray-200 hover:border-gray-300',
                !extra.is_active && 'opacity-60',
              )}
            >
              {/* Drag handle */}
              <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400">
                <IconGrip />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-sardoba-dark truncate">{extra.name}</span>
                  {!extra.is_active && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Неактивна</span>
                  )}
                </div>
                {extra.description && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{extra.description}</p>
                )}
              </div>

              {/* Price */}
              <div className="text-right shrink-0">
                <span className="font-bold text-sm text-sardoba-gold">{formatMoney(extra.price)}</span>
                <span className="block text-xs text-gray-400">{PRICE_TYPE_LABELS[extra.price_type]}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Active toggle */}
                <button
                  onClick={() => toggleActive(extra)}
                  className={cn(
                    'relative w-10 h-5 rounded-full transition-colors duration-200',
                    extra.is_active ? 'bg-green-500' : 'bg-gray-300',
                  )}
                  title={extra.is_active ? 'Деактивировать' : 'Активировать'}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                      extra.is_active ? 'translate-x-5' : 'translate-x-0.5',
                    )}
                  />
                </button>

                <button
                  onClick={() => openEdit(extra)}
                  className="p-2 text-gray-400 hover:text-sardoba-blue rounded-lg hover:bg-gray-50 transition-colors"
                  title="Редактировать"
                >
                  <IconEdit />
                </button>

                <button
                  onClick={() => setDeleteConfirm(extra.id)}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  title="Удалить"
                >
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create/Edit Modal ──────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Редактировать услугу' : 'Новая услуга'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editId ? 'Сохранить' : 'Создать'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Название"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Например: Завтрак"
            error={formErrors.name}
            required
          />

          <Input
            label="Название (узб.)"
            value={form.name_uz}
            onChange={(e) => setForm({ ...form, name_uz: e.target.value })}
            placeholder="Nonushta"
            hint="Необязательно"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Краткое описание услуги"
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Цена (сум)"
              type="number"
              min="0"
              step="1000"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="50000"
              error={formErrors.price}
              required
            />

            <Select
              label="Тип цены"
              value={form.price_type}
              onChange={(e) => setForm({ ...form, price_type: e.target.value })}
              options={PRICE_TYPE_OPTIONS}
            />
          </div>

          <Select
            label="Иконка"
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            options={ICON_OPTIONS}
          />

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Активна</p>
              <p className="text-xs text-gray-400">Показывать на странице бронирования</p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors duration-200',
                form.is_active ? 'bg-green-500' : 'bg-gray-300',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                  form.is_active ? 'translate-x-5' : 'translate-x-0.5',
                )}
              />
            </button>
          </div>

          {formErrors.submit && (
            <p className="text-sm text-red-600">{formErrors.submit}</p>
          )}
        </div>
      </Modal>

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Удалить услугу?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Эта услуга будет удалена. Это действие нельзя отменить.
        </p>
      </Modal>
    </div>
  );
}
