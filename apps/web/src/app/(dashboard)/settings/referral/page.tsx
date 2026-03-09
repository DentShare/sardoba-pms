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
  listReferrals,
  createReferral,
  getReferralStats,
  applyReferralBonus,
  type Referral,
  type ReferralStats,
} from '@/lib/api/referrals';

/* ── Icon ───────────────────────────────────────────────────────────────── */

function UsersLinkIcon({ className = '' }: { className?: string }) {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function formatBonusType(type: string): string {
  switch (type) {
    case 'percent':
      return 'Процент';
    case 'fixed':
      return 'Фиксированная';
    case 'free_night':
      return 'Бесплатная ночь';
    default:
      return type;
  }
}

function formatBonusValue(type: string, value: number): string {
  if (type === 'percent') return `${value}%`;
  if (type === 'free_night') return `${value} ночь`;
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
   REFERRAL PROGRAM PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ReferralPage() {
  const propertyId = usePropertyId();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ── Form fields ──────────────────────────────────────────────────────── */
  const [referrerGuestId, setReferrerGuestId] = useState('');
  const [bonusType, setBonusType] = useState<'percent' | 'fixed' | 'free_night'>('percent');
  const [bonusValue, setBonusValue] = useState('10');

  /* ── Load data ────────────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const [referralsList, referralStats] = await Promise.all([
        listReferrals(propertyId),
        getReferralStats(propertyId),
      ]);
      setReferrals(referralsList);
      setStats(referralStats);
    } catch {
      toast.error('Ошибка загрузки данных');
    }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Create ───────────────────────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!referrerGuestId) {
      toast.error('Укажите ID гостя');
      return;
    }

    setSaving(true);
    try {
      await createReferral({
        referrer_guest_id: Number(referrerGuestId),
        bonus_type: bonusType,
        bonus_value: Number(bonusValue),
      });
      toast.success('Реферал создан');
      setShowModal(false);
      setReferrerGuestId('');
      setBonusType('percent');
      setBonusValue('10');
      loadData();
    } catch {
      toast.error('Ошибка создания');
    }
    setSaving(false);
  };

  /* ── Apply bonus ──────────────────────────────────────────────────────── */
  const handleApplyBonus = async (id: number) => {
    try {
      await applyReferralBonus(id);
      toast.success('Бонус применён');
      loadData();
    } catch {
      toast.error('Ошибка применения бонуса');
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="Реферальная программа" />
        <div className="flex justify-center mt-12"><Spinner /></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        title="Реферальная программа"
        subtitle="Управление реферальными бонусами для гостей"
        actions={
          <Button size="sm" onClick={() => setShowModal(true)}>
            + Создать
          </Button>
        }
      />

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      {stats && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Всего рефералов</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalReferrals}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Применённые бонусы</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.appliedBonuses}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Сумма бонусов</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {(stats.totalBonusValue / 100).toLocaleString('ru-RU')} сум
            </p>
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {referrals.length === 0 && (
        <div className="mt-8 text-center py-12 bg-white rounded-xl border border-gray-200">
          <UsersLinkIcon className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">Нет рефералов</p>
          <Button onClick={() => setShowModal(true)}>Создать первый реферал</Button>
        </div>
      )}

      {/* ── Referrals list ────────────────────────────────────────────────── */}
      {referrals.length > 0 && (
        <div className="mt-6 space-y-3">
          {referrals.map((ref) => (
            <div
              key={ref.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-gray-900 text-sm bg-gray-100 px-2 py-0.5 rounded">
                    {ref.referralCode}
                  </span>
                  <Badge variant="info">
                    {formatBonusType(ref.bonusType)}
                  </Badge>
                  <Badge variant={ref.bonusType === 'percent' ? 'warning' : 'gold'}>
                    {formatBonusValue(ref.bonusType, ref.bonusValue)}
                  </Badge>
                  <Badge variant={ref.bonusApplied ? 'success' : 'default'}>
                    {ref.bonusApplied ? 'Применён' : 'Не применён'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>Гость #{ref.referrerGuestId}</span>
                  {ref.referredGuestId && (
                    <span>Приглашённый #{ref.referredGuestId}</span>
                  )}
                  <span>Создан: {formatDate(ref.createdAt)}</span>
                  {ref.usedAt && <span>Использован: {formatDate(ref.usedAt)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                {!ref.bonusApplied && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleApplyBonus(ref.id)}
                  >
                    Применить бонус
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Modal ──────────────────────────────────────────────────── */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Новый реферал"
      >
        <div className="space-y-4">
          <Input
            label="ID гостя-реферера"
            type="number"
            value={referrerGuestId}
            onChange={(e) => setReferrerGuestId(e.target.value)}
            placeholder="123"
            min={1}
          />

          <Select
            label="Тип бонуса"
            value={bonusType}
            onChange={(e) => setBonusType(e.target.value as 'percent' | 'fixed' | 'free_night')}
            options={[
              { value: 'percent', label: 'Процент (%)' },
              { value: 'fixed', label: 'Фиксированная сумма (сум)' },
              { value: 'free_night', label: 'Бесплатная ночь' },
            ]}
          />

          <Input
            label={
              bonusType === 'percent'
                ? 'Процент скидки'
                : bonusType === 'free_night'
                  ? 'Количество ночей'
                  : 'Сумма бонуса (тийин)'
            }
            type="number"
            value={bonusValue}
            onChange={(e) => setBonusValue(e.target.value)}
            min={1}
          />

          <div className="flex gap-2 pt-2">
            <Button onClick={handleCreate} loading={saving}>
              Создать
            </Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Отмена
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
