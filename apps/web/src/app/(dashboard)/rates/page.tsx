'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, format, parseISO, isWithinInterval, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { listRates, createRate, updateRate, deleteRate } from '@/lib/api/rates';
import { useRooms } from '@/lib/hooks/use-rooms';
import { formatMoney } from '@/lib/utils/money';
import type { Rate, RateType } from '@sardoba/shared';

const PROPERTY_ID = 1;

const RATE_TYPE_OPTIONS = [
  { value: 'base', label: 'Базовый' },
  { value: 'seasonal', label: 'Сезонный' },
  { value: 'weekend', label: 'Выходные' },
  { value: 'longstay', label: 'Длительное пребывание' },
  { value: 'special', label: 'Специальный' },
];

const RATE_TYPE_COLORS: Record<RateType, { bg: string; text: string }> = {
  base: { bg: 'bg-blue-100', text: 'text-blue-800' },
  seasonal: { bg: 'bg-green-100', text: 'text-green-800' },
  weekend: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  longstay: { bg: 'bg-purple-100', text: 'text-purple-800' },
  special: { bg: 'bg-red-100', text: 'text-red-800' },
};

export default function RatesPage() {
  const queryClient = useQueryClient();

  const { data: rates, isLoading } = useQuery({
    queryKey: ['rates', PROPERTY_ID],
    queryFn: () => listRates(PROPERTY_ID),
  });

  const { data: rooms } = useRooms(PROPERTY_ID);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedRate, setSelectedRate] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('base');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minStay, setMinStay] = useState('');
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);

  const createMut = useMutation({
    mutationFn: () =>
      createRate({
        property_id: PROPERTY_ID,
        name,
        type,
        price: price ? Math.round(Number(price) * 100) : undefined,
        discount_percent: discount ? Number(discount) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        min_stay: minStay ? Number(minStay) : undefined,
        applies_to_rooms: selectedRooms.length > 0 ? selectedRooms : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates'] });
      toast.success('Тариф создан');
      closeForm();
    },
    onError: () => {
      toast.error('Ошибка при создании тарифа');
    },
  });

  const updateMut = useMutation({
    mutationFn: () =>
      updateRate(editingId!, {
        name,
        type,
        price: price ? Math.round(Number(price) * 100) : undefined,
        discount_percent: discount ? Number(discount) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        min_stay: minStay ? Number(minStay) : undefined,
        applies_to_rooms: selectedRooms.length > 0 ? selectedRooms : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates'] });
      toast.success('Тариф обновлен');
      closeForm();
    },
    onError: () => {
      toast.error('Ошибка при обновлении');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteRate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates'] });
      toast.success('Тариф удален');
      setSelectedRate(null);
    },
    onError: () => {
      toast.error('Ошибка при удалении');
    },
  });

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setName('');
    setType('base');
    setPrice('');
    setDiscount('');
    setDateFrom('');
    setDateTo('');
    setMinStay('');
    setSelectedRooms([]);
  }, []);

  const openEdit = useCallback((rate: Rate) => {
    setEditingId(rate.id);
    setName(rate.name);
    setType(rate.type);
    setPrice(rate.price ? (rate.price / 100).toString() : '');
    setDiscount(rate.discountPercent?.toString() || '');
    setDateFrom(rate.dateFrom || '');
    setDateTo(rate.dateTo || '');
    setMinStay(rate.minStay?.toString() || '');
    setSelectedRooms(rate.appliesToRooms || []);
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!name) {
      toast.error('Укажите название');
      return;
    }
    if (editingId) {
      updateMut.mutate();
    } else {
      createMut.mutate();
    }
  }, [name, editingId, createMut, updateMut]);

  // Calendar preview (30 days)
  const calendarDates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => addDays(today, i));
  }, []);

  const getRateForDate = useCallback(
    (date: Date): Rate | null => {
      if (!rates) return null;
      // Prioritize: special > seasonal > weekend > longstay > base
      const priority: RateType[] = ['special', 'seasonal', 'weekend', 'longstay', 'base'];

      for (const p of priority) {
        const rate = rates.find((r) => {
          if (r.type !== p) return false;
          if (r.dateFrom && r.dateTo) {
            const from = parseISO(r.dateFrom);
            const to = parseISO(r.dateTo);
            return isWithinInterval(startOfDay(date), {
              start: startOfDay(from),
              end: startOfDay(to),
            });
          }
          if (r.daysOfWeek && r.daysOfWeek.length > 0) {
            const dayIndex = (date.getDay() + 6) % 7; // 0=Mon
            return r.daysOfWeek.includes(dayIndex);
          }
          return r.type === 'base';
        });
        if (rate) return rate;
      }
      return null;
    },
    [rates],
  );

  const toggleRoom = useCallback((roomId: number) => {
    setSelectedRooms((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId],
    );
  }, []);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Тарифы"
        subtitle="Управление ценами и скидками"
        actions={
          <Button
            onClick={() => setShowForm(true)}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" /><path d="M5 12h14" />
              </svg>
            }
          >
            Новый тариф
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel: rate list */}
        <div className="space-y-3">
          {(rates || []).length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500 bg-white rounded-xl border border-gray-200">
              Нет тарифов
            </div>
          ) : (
            (rates || []).map((rate) => {
              const colors = RATE_TYPE_COLORS[rate.type as RateType] || { bg: 'bg-gray-100', text: 'text-gray-700' };
              return (
                <div
                  key={rate.id}
                  onClick={() => setSelectedRate(rate.id === selectedRate ? null : rate.id)}
                  className={cn(
                    'bg-white rounded-xl border p-4 cursor-pointer transition-all',
                    selectedRate === rate.id
                      ? 'border-sardoba-gold ring-1 ring-sardoba-gold/30'
                      : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-gray-900">{rate.name}</div>
                      <Badge variant="custom" bg={colors.bg} text={colors.text} size="sm" className="mt-1">
                        {RATE_TYPE_OPTIONS.find((o) => o.value === rate.type)?.label || rate.type}
                      </Badge>
                    </div>
                    <div className="text-right">
                      {rate.price && (
                        <div className="font-bold text-sardoba-blue">
                          {formatMoney(rate.price)}
                        </div>
                      )}
                      {rate.discountPercent && (
                        <div className="text-sm text-green-600 font-medium">
                          -{rate.discountPercent}%
                        </div>
                      )}
                    </div>
                  </div>

                  {(rate.dateFrom || rate.dateTo) && (
                    <div className="text-xs text-gray-500 mt-1">
                      {rate.dateFrom} - {rate.dateTo}
                    </div>
                  )}
                  {rate.minStay && (
                    <div className="text-xs text-gray-500">
                      Мин. ночей: {rate.minStay}
                    </div>
                  )}

                  {selectedRate === rate.id && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(rate); }}>
                        Редактировать
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={(e) => { e.stopPropagation(); deleteMut.mutate(rate.id); }}
                        loading={deleteMut.isPending}
                      >
                        Удалить
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right panel: calendar preview */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Календарь тарифов (30 дней)
          </h3>
          <div className="grid grid-cols-7 gap-1">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 pb-2">
                {d}
              </div>
            ))}
            {calendarDates.map((date) => {
              const rate = getRateForDate(date);
              const colors = rate
                ? RATE_TYPE_COLORS[rate.type as RateType]
                : { bg: 'bg-gray-50', text: 'text-gray-400' };

              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    'p-2 rounded-lg text-center text-xs',
                    colors.bg,
                    colors.text,
                  )}
                  title={rate?.name || 'Нет тарифа'}
                >
                  <div className="font-medium">{format(date, 'd')}</div>
                  {rate && rate.price && (
                    <div className="text-[10px] mt-0.5 truncate">
                      {(rate.price / 100).toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rate Form Modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        title={editingId ? 'Редактировать тариф' : 'Новый тариф'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeForm}>
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              loading={createMut.isPending || updateMut.isPending}
            >
              {editingId ? 'Сохранить' : 'Создать'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Базовый тариф, Летний сезон..."
            required
          />

          <Select
            label="Тип"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={RATE_TYPE_OPTIONS}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Цена за ночь (сум)"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              hint="Фиксированная цена"
            />
            <Input
              label="Скидка %"
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0"
              hint="Процент от базовой"
              min={0}
              max={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Дата начала"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="Дата окончания"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <Input
            label="Мин. ночей"
            type="number"
            value={minStay}
            onChange={(e) => setMinStay(e.target.value)}
            min={1}
            placeholder="1"
          />

          {/* Room selector */}
          {rooms && rooms.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Применяется к номерам
              </label>
              <div className="flex flex-wrap gap-2">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => toggleRoom(room.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                      selectedRooms.includes(room.id)
                        ? 'border-sardoba-gold bg-sardoba-gold/10 text-sardoba-gold-dark'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300',
                    )}
                  >
                    {room.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedRooms.length === 0 ? 'Применяется ко всем номерам' : `Выбрано: ${selectedRooms.length}`}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
