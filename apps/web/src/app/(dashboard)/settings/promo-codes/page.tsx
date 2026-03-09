'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { usePropertyId } from '@/lib/hooks/use-property-id';
import {
  listPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  type PromoCode,
} from '@/lib/api/promo-codes';

/* ── Icon ───────────────────────────────────────────────────────────────── */

function TicketIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function formatDiscount(type: string, value: number): string {
  if (type === 'percent') return `${value}%`;
  return `${(value / 100).toLocaleString('ru-RU')} сум`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROMO CODES PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function PromoCodesPage() {
  const propertyId = usePropertyId();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ── Form fields ──────────────────────────────────────────────────────── */
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [minNights, setMinNights] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');

  /* ── Load data ────────────────────────────────────────────────────────── */
  const loadCodes = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const data = await listPromoCodes(propertyId);
      setCodes(data);
    } catch {
      toast.error('Ошибка загрузки промокодов');
    }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    loadCodes();
  }, [loadCodes]);

  /* ── Reset form ───────────────────────────────────────────────────────── */
  function resetForm() {
    setCode('');
    setDiscountType('percent');
    setDiscountValue('');
    setMaxUses('');
    setMinNights('');
    setMinAmount('');
    setValidFrom('');
    setValidTo('');
  }

  /* ── Create ───────────────────────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!code.trim() || !discountValue) {
      toast.error('Заполните код и размер скидки');
      return;
    }

    setSaving(true);
    try {
      await createPromoCode({
        code: code.toUpperCase().trim(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        max_uses: maxUses ? Number(maxUses) : null,
        min_nights: minNights ? Number(minNights) : undefined,
        min_amount: minAmount ? Number(minAmount) * 100 : undefined,
        valid_from: validFrom || null,
        valid_to: validTo || null,
      });
      toast.success('Промокод создан');
      setShowModal(false);
      resetForm();
      loadCodes();
    } catch {
      toast.error('Ошибка создания промокода');
    }
    setSaving(false);
  };

  /* ── Toggle active ────────────────────────────────────────────────────── */
  const handleToggle = async (promo: PromoCode) => {
    try {
      await updatePromoCode(promo.id, { is_active: !promo.isActive });
      toast.success(promo.isActive ? 'Промокод деактивирован' : 'Промокод активирован');
      loadCodes();
    } catch {
      toast.error('Ошибка обновления');
    }
  };

  /* ── Delete ───────────────────────────────────────────────────────────── */
  const handleDelete = async (id: number) => {
    if (!confirm('Удалить промокод?')) return;
    try {
      await deletePromoCode(id);
      toast.success('Промокод удалён');
      loadCodes();
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="Промокоды" />
        <div className="flex justify-center mt-12"><Spinner /></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        title="Промокоды"
        subtitle="Управление скидочными кодами для гостей"
        actions={
          <Button size="sm" onClick={() => setShowModal(true)}>
            + Создать промокод
          </Button>
        }
      />

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {codes.length === 0 && (
        <div className="mt-8 text-center py-12 bg-white rounded-xl border border-gray-200">
          <TicketIcon className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">Нет промокодов</p>
          <Button onClick={() => setShowModal(true)}>Создать первый промокод</Button>
        </div>
      )}

      {/* ── Promo codes list ──────────────────────────────────────────────── */}
      {codes.length > 0 && (
        <div className="mt-6 space-y-3">
          {codes.map((promo) => (
            <div
              key={promo.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-gray-900 text-sm bg-gray-100 px-2 py-0.5 rounded">
                    {promo.code}
                  </span>
                  <Badge variant={promo.discountType === 'percent' ? 'warning' : 'info'}>
                    {formatDiscount(promo.discountType, promo.discountValue)}
                  </Badge>
                  <Badge variant={promo.isActive ? 'success' : 'default'}>
                    {promo.isActive ? 'Активен' : 'Выкл'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>
                    Использован: {promo.usedCount}
                    {promo.maxUses ? ` / ${promo.maxUses}` : ''}
                  </span>
                  {promo.minNights > 0 && (
                    <span>мин. {promo.minNights} ночей</span>
                  )}
                  {promo.minAmount > 0 && (
                    <span>от {(promo.minAmount / 100).toLocaleString('ru-RU')} сум</span>
                  )}
                  <span>
                    {formatDate(promo.validFrom)} — {formatDate(promo.validTo)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <button
                  onClick={() => handleToggle(promo)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {promo.isActive ? 'Выкл' : 'Вкл'}
                </button>
                <button
                  onClick={() => handleDelete(promo.id)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Modal ──────────────────────────────────────────────────── */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title="Новый промокод"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Код"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SUMMER2026"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Тип скидки"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
              options={[
                { value: 'percent', label: 'Процент (%)' },
                { value: 'fixed', label: 'Фиксированная сумма (сум)' },
              ]}
            />
            <Input
              label={discountType === 'percent' ? 'Процент скидки' : 'Сумма скидки (сум)'}
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percent' ? '10' : '50000'}
              min={0}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Макс. использований"
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Без ограничений"
              min={1}
            />
            <Input
              label="Мин. ночей"
              type="number"
              value={minNights}
              onChange={(e) => setMinNights(e.target.value)}
              placeholder="Любое"
              min={1}
            />
          </div>

          <Input
            label="Мин. сумма бронирования (сум)"
            type="number"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder="Без ограничений"
            min={0}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Действует от"
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />
            <Input
              label="Действует до"
              type="date"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleCreate} loading={saving}>
              Создать
            </Button>
            <Button
              variant="secondary"
              onClick={() => { setShowModal(false); resetForm(); }}
            >
              Отмена
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
