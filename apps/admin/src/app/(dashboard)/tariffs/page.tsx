'use client';

import { useState, useMemo } from 'react';
import {
  Check,
  Minus,
  Edit3,
  X,
  Save,
  Users,
  DoorOpen,
  Wifi,
  TrendingUp,
  Calculator,
  Crown,
  Star,
  Zap,
  Building2,
} from 'lucide-react';
import { planConfigs, PlanId, formatUZS } from '@/lib/mock-data';

const ALL_PLANS: PlanId[] = ['starter', 'standard', 'professional', 'enterprise'];

const planIcons: Record<PlanId, typeof Star> = {
  starter: Star,
  standard: Zap,
  professional: Crown,
  enterprise: Building2,
};

const subscriberCounts: Record<PlanId, number> = {
  starter: 8,
  standard: 15,
  professional: 12,
  enterprise: 5,
};

interface FeatureRow {
  name: string;
  plans: Record<PlanId, boolean>;
}

const featureMatrix: FeatureRow[] = [
  { name: 'Шахматка 90 дней', plans: { starter: false, standard: true, professional: true, enterprise: true } },
  { name: 'Drag & drop', plans: { starter: false, standard: true, professional: true, enterprise: true } },
  { name: 'Channel Manager', plans: { starter: false, standard: true, professional: true, enterprise: true } },
  { name: 'Booking.com', plans: { starter: false, standard: true, professional: true, enterprise: true } },
  { name: 'Airbnb', plans: { starter: false, standard: true, professional: true, enterprise: true } },
  { name: 'Expedia', plans: { starter: false, standard: false, professional: true, enterprise: true } },
  { name: 'Payme/Click', plans: { starter: false, standard: true, professional: true, enterprise: true } },
  { name: 'Housekeeping', plans: { starter: false, standard: false, professional: true, enterprise: true } },
  { name: 'Групповые брони', plans: { starter: false, standard: false, professional: true, enterprise: true } },
  { name: 'Онлайн-бронирование', plans: { starter: false, standard: false, professional: true, enterprise: true } },
  { name: 'SMS/Email', plans: { starter: false, standard: false, professional: true, enterprise: true } },
  { name: 'Фискализация', plans: { starter: false, standard: false, professional: true, enterprise: true } },
  { name: 'Revenue Management', plans: { starter: false, standard: false, professional: false, enterprise: true } },
  { name: 'Мульти-объект', plans: { starter: false, standard: false, professional: false, enterprise: true } },
  { name: 'Логи действий', plans: { starter: false, standard: false, professional: true, enterprise: true } },
  { name: '2FA', plans: { starter: false, standard: false, professional: false, enterprise: true } },
  { name: 'API доступ', plans: { starter: false, standard: false, professional: false, enterprise: true } },
];

interface EditState {
  monthlyPrice: number;
  yearlyPrice: number;
  discountPercent: number;
  maxRooms: number | null;
  maxUsers: number | null;
  maxOtaChannels: number | null;
  features: Record<string, boolean>;
}

export default function TariffsPage() {
  const [editingPlan, setEditingPlan] = useState<PlanId | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [simulatorCounts, setSimulatorCounts] = useState<Record<PlanId, number>>({
    starter: 10,
    standard: 20,
    professional: 15,
    enterprise: 5,
  });

  const openEditModal = (planId: PlanId) => {
    const plan = planConfigs[planId];
    const discount = plan.price > 0
      ? Math.round((1 - plan.yearlyPrice / (plan.price * 12)) * 100)
      : 20;
    setEditState({
      monthlyPrice: plan.price,
      yearlyPrice: plan.yearlyPrice,
      discountPercent: discount,
      maxRooms: plan.maxRooms,
      maxUsers: plan.maxUsers,
      maxOtaChannels: plan.maxOtaChannels,
      features: Object.fromEntries(featureMatrix.map((f) => [f.name, f.plans[planId]])),
    });
    setEditingPlan(planId);
  };

  const closeModal = () => {
    setEditingPlan(null);
    setEditState(null);
  };

  const updateMonthlyPrice = (value: number) => {
    if (!editState) return;
    const yearly = Math.round(value * 12 * (1 - editState.discountPercent / 100));
    setEditState({ ...editState, monthlyPrice: value, yearlyPrice: yearly });
  };

  const updateDiscount = (value: number) => {
    if (!editState) return;
    const yearly = Math.round(editState.monthlyPrice * 12 * (1 - value / 100));
    setEditState({ ...editState, discountPercent: value, yearlyPrice: yearly });
  };

  const simulation = useMemo(() => {
    let mrr = 0;
    for (const plan of ALL_PLANS) {
      mrr += simulatorCounts[plan] * planConfigs[plan].price;
    }
    const arr = mrr * 12;
    const totalHotels = Object.values(simulatorCounts).reduce((a, b) => a + b, 0);
    const arpu = totalHotels > 0 ? Math.round(mrr / totalHotels) : 0;
    return { mrr, arr, totalHotels, arpu };
  }, [simulatorCounts]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Управление тарифами</h1>
        <p className="text-sm text-gray-500 mt-1">Тарифные планы, фича-матрица и моделирование выручки</p>
      </div>

      {/* Plan comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {ALL_PLANS.map((planId) => {
          const plan = planConfigs[planId];
          const Icon = planIcons[planId];
          const subs = subscriberCounts[planId];
          const discount = plan.price > 0
            ? Math.round((1 - plan.yearlyPrice / (plan.price * 12)) * 100)
            : 20;

          return (
            <div key={planId} className="bg-white rounded-xl border p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: plan.color + '18' }}
                  >
                    <Icon className="w-4 h-4" style={{ color: plan.color }} />
                  </div>
                  <span className={plan.badgeClass}>{plan.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Users className="w-3.5 h-3.5" />
                  {subs}
                </div>
              </div>

              <div className="mb-4">
                {plan.price > 0 ? (
                  <>
                    <p className="text-2xl font-bold text-gray-900">{formatUZS(plan.price)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">в месяц</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className="text-sm text-gray-500">{formatUZS(plan.yearlyPrice)}/год</p>
                      <span className="badge badge-green text-[10px]">-{discount}%</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-gray-900">Индивидуально</p>
                    <p className="text-xs text-gray-400 mt-0.5">по запросу</p>
                  </>
                )}
              </div>

              <div className="space-y-2 mb-4 border-t pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <DoorOpen className="w-3.5 h-3.5" /> Номеров
                  </span>
                  <span className="font-medium">до {plan.maxRooms ?? '∞'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Пользователей
                  </span>
                  <span className="font-medium">{plan.maxUsers ?? '∞'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5" /> OTA-каналов
                  </span>
                  <span className="font-medium">{plan.maxOtaChannels === 0 ? '—' : plan.maxOtaChannels ?? '50+'}</span>
                </div>
              </div>

              <div className="flex-1 border-t pt-3 mb-4">
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => openEditModal(planId)}
                className="btn-secondary w-full justify-center text-sm"
              >
                <Edit3 className="w-4 h-4" />
                Редактировать
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature flags matrix */}
      <div className="table-container">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-gray-900">Матрица функций</h2>
          <p className="text-xs text-gray-500 mt-0.5">Сравнение возможностей по тарифным планам</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-500 min-w-[200px]">Функция</th>
                {ALL_PLANS.map((planId) => (
                  <th key={planId} className="text-center px-4 py-3 font-medium min-w-[120px]">
                    <span className={planConfigs[planId].badgeClass}>{planConfigs[planId].name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureMatrix.map((row, i) => (
                <tr key={row.name} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-700">{row.name}</td>
                  {ALL_PLANS.map((planId) => (
                    <td key={planId} className="px-4 py-2.5 text-center">
                      {row.plans[planId] ? (
                        <Check className="w-4.5 h-4.5 text-emerald-500 mx-auto" />
                      ) : (
                        <Minus className="w-4.5 h-4.5 text-gray-300 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue simulator */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-brand-600" />
          <div>
            <h2 className="font-semibold text-gray-900">Симулятор выручки</h2>
            <p className="text-xs text-gray-500">Прогноз MRR/ARR на основе ожидаемого количества отелей</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">Ожидаемое количество отелей</p>
            {ALL_PLANS.map((planId) => {
              const plan = planConfigs[planId];
              return (
                <div key={planId} className="flex items-center gap-3">
                  <span className={`${plan.badgeClass} w-28 text-center`}>{plan.name}</span>
                  <input
                    type="number"
                    min={0}
                    value={simulatorCounts[planId]}
                    onChange={(e) =>
                      setSimulatorCounts((prev) => ({
                        ...prev,
                        [planId]: Math.max(0, parseInt(e.target.value) || 0),
                      }))
                    }
                    className="input-field w-24 text-center"
                  />
                  <span className="text-sm text-gray-400">
                    × {plan.price > 0 ? formatUZS(plan.price) : '—'}
                  </span>
                  <span className="text-sm font-medium ml-auto">
                    {plan.price > 0 ? formatUZS(simulatorCounts[planId] * plan.price) : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="stat-card">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <TrendingUp className="w-4 h-4 text-brand-600" />
                MRR (прогноз)
              </div>
              <p className="text-2xl font-bold text-brand-600">{formatUZS(simulation.mrr)}</p>
              <p className="text-xs text-gray-400 mt-1">Ежемесячная выручка</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                ARR (прогноз)
              </div>
              <p className="text-2xl font-bold text-emerald-600">{formatUZS(simulation.arr)}</p>
              <p className="text-xs text-gray-400 mt-1">Годовая выручка</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Building2 className="w-4 h-4 text-gray-500" />
                Всего отелей
              </div>
              <p className="text-2xl font-bold text-gray-900">{simulation.totalHotels}</p>
              <p className="text-xs text-gray-400 mt-1">По всем планам</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Users className="w-4 h-4 text-violet-500" />
                ARPU
              </div>
              <p className="text-2xl font-bold text-violet-600">{formatUZS(simulation.arpu)}</p>
              <p className="text-xs text-gray-400 mt-1">Средний чек / отель</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit plan modal */}
      {editingPlan && editState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Редактировать план</h2>
                <span className={planConfigs[editingPlan].badgeClass}>
                  {planConfigs[editingPlan].name}
                </span>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Plan name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название плана</label>
                <input
                  type="text"
                  value={planConfigs[editingPlan].name}
                  readOnly
                  className="input-field bg-gray-50 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Системные планы нельзя переименовывать</p>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Цена / месяц</label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={editState.monthlyPrice}
                    onChange={(e) => updateMonthlyPrice(parseInt(e.target.value) || 0)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Скидка (год), %</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={editState.discountPercent}
                    onChange={(e) => updateDiscount(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Цена / год</label>
                  <input
                    type="number"
                    value={editState.yearlyPrice}
                    readOnly
                    className="input-field bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Авто-расчёт</p>
                </div>
              </div>

              {/* Limits */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Лимиты</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Макс. номеров</label>
                    <input
                      type="text"
                      value={editState.maxRooms === null ? 'Без лимита' : editState.maxRooms}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || val.toLowerCase().includes('без')) {
                          setEditState({ ...editState, maxRooms: null });
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num)) setEditState({ ...editState, maxRooms: num });
                        }
                      }}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Макс. пользователей</label>
                    <input
                      type="text"
                      value={editState.maxUsers === null ? 'Без лимита' : editState.maxUsers}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || val.toLowerCase().includes('без')) {
                          setEditState({ ...editState, maxUsers: null });
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num)) setEditState({ ...editState, maxUsers: num });
                        }
                      }}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Макс. OTA-каналов</label>
                    <input
                      type="text"
                      value={editState.maxOtaChannels === null ? 'Без лимита' : editState.maxOtaChannels}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || val.toLowerCase().includes('без')) {
                          setEditState({ ...editState, maxOtaChannels: null });
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num)) setEditState({ ...editState, maxOtaChannels: num });
                        }
                      }}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Feature toggles */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Функции</p>
                <div className="grid grid-cols-2 gap-2">
                  {featureMatrix.map((f) => (
                    <label
                      key={f.name}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={editState.features[f.name] ?? false}
                        onChange={(e) =>
                          setEditState({
                            ...editState,
                            features: { ...editState.features, [f.name]: e.target.checked },
                          })
                        }
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-700">{f.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
              <button onClick={closeModal} className="btn-secondary">
                Отмена
              </button>
              <button onClick={closeModal} className="btn-primary">
                <Save className="w-4 h-4" />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
