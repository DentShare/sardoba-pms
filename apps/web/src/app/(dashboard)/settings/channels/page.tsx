'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Table, type Column } from '@/components/ui/Table';
import { PageSpinner } from '@/components/ui/Spinner';
import {
  listChannels,
  createChannel,
  updateChannel,
  deactivateChannel,
  syncChannel,
  getMappings,
  updateMapping,
  getLogs,
} from '@/lib/api/channels';
import { useRooms } from '@/lib/hooks/use-rooms';
import { formatDateTime } from '@/lib/utils/dates';
import type { Channel, ChannelType, RoomMapping, SyncLog, SyncStatus } from '@sardoba/shared';
import { usePropertyId } from '@/lib/hooks/use-property-id';

/* ── Channel metadata ───────────────────────────────────────────────────── */

const CHANNEL_CONFIGS: Record<string, {
  name: string;
  logo: string;
  color: string;
  description: string;
  fields: Array<{ key: string; label: string; placeholder: string; type?: string }>;
  guide: string[];
}> = {
  booking_com: {
    name: 'Booking.com',
    logo: 'B',
    color: 'bg-blue-600',
    description: 'Крупнейшая OTA-платформа. Получайте бронирования через webhook.',
    fields: [
      { key: 'hotel_id', label: 'Hotel ID', placeholder: 'Ваш ID отеля на Booking.com' },
      { key: 'api_key', label: 'API ключ', placeholder: 'Ключ из экстранета', type: 'password' },
      { key: 'webhook_secret', label: 'Webhook Secret', placeholder: 'Секрет для верификации', type: 'password' },
    ],
    guide: [
      'Войдите в экстранет Booking.com',
      'Перейдите в Connectivity → API Credentials',
      'Скопируйте Hotel ID и API Key',
      'Настройте Webhook URL: https://api.sardoba.uz/webhooks/booking-com',
      'Скопируйте Webhook Secret',
    ],
  },
  airbnb: {
    name: 'Airbnb',
    logo: 'A',
    color: 'bg-rose-500',
    description: 'Синхронизация через iCal. Бронирования импортируются каждые 15 минут.',
    fields: [
      { key: 'ical_url', label: 'iCal URL', placeholder: 'https://www.airbnb.com/calendar/ical/...' },
      { key: 'listing_id', label: 'Listing ID', placeholder: 'ID вашего объявления' },
    ],
    guide: [
      'Откройте ваше объявление на Airbnb',
      'Перейдите в Календарь → Доступность',
      'Нажмите "Экспорт календаря"',
      'Скопируйте ссылку iCal',
      'Вставьте ссылку в поле iCal URL',
    ],
  },
  expedia: {
    name: 'Expedia',
    logo: 'E',
    color: 'bg-yellow-500',
    description: 'Expedia Group (Expedia, Hotels.com, Vrbo).',
    fields: [
      { key: 'hotel_id', label: 'Property ID', placeholder: 'ID вашего объекта' },
      { key: 'api_key', label: 'API ключ', placeholder: 'Ключ из Partner Central', type: 'password' },
    ],
    guide: [
      'Войдите в Expedia Partner Central',
      'Перейдите в Settings → Connectivity',
      'Получите API credentials',
    ],
  },
  hotels_com: {
    name: 'Hotels.com',
    logo: 'H',
    color: 'bg-red-600',
    description: 'Часть Expedia Group. Использует общие API.',
    fields: [
      { key: 'hotel_id', label: 'Property ID', placeholder: 'ID вашего объекта' },
      { key: 'api_key', label: 'API ключ', placeholder: 'API ключ', type: 'password' },
    ],
    guide: [
      'Hotels.com использует Expedia Partner Central',
      'Настройки аналогичны Expedia',
    ],
  },
  ostrovok: {
    name: 'Ostrovok',
    logo: 'O',
    color: 'bg-indigo-600',
    description: 'Популярная OTA для СНГ-рынка.',
    fields: [
      { key: 'hotel_id', label: 'Hotel ID', placeholder: 'ID отеля' },
      { key: 'api_key', label: 'API ключ', placeholder: 'Ключ из личного кабинета', type: 'password' },
    ],
    guide: [
      'Войдите в личный кабинет Ostrovok',
      'Перейдите в Настройки → API',
      'Скопируйте учётные данные',
    ],
  },
};

const ALL_CHANNEL_TYPES: ChannelType[] = [
  'booking_com',
  'airbnb',
  'expedia',
  'hotels_com',
  'ostrovok',
];

const SYNC_STATUS_STYLES: Record<SyncStatus, { bg: string; text: string; label: string }> = {
  success: { bg: 'bg-green-100', text: 'text-green-800', label: 'Успех' },
  error: { bg: 'bg-red-100', text: 'text-red-800', label: 'Ошибка' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Ожидание' },
};

/* ── Icons ───────────────────────────────────────────────────────────────── */

function IconPlus({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconRefresh({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}
function IconCheck({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconArrowRight({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHANNELS PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function SettingsChannelsPage() {
  const propertyId = usePropertyId();
  const queryClient = useQueryClient();

  const { data: channels, isLoading } = useQuery({
    queryKey: ['channels', propertyId],
    queryFn: () => listChannels(propertyId!),
    enabled: !!propertyId,
    refetchInterval: 30000,
  });

  const { data: rooms } = useRooms(propertyId);

  /* ── State ─────────────────────────────────────────────────────────────── */

  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupChannelId, setSetupChannelId] = useState<number | null>(null);
  const [addType, setAddType] = useState<ChannelType | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [syncingIds, setSyncingIds] = useState<Set<number>>(new Set());

  const selectedChannel = channels?.find((c) => c.id === selectedChannelId) ?? null;
  const setupChannel = channels?.find((c) => c.id === setupChannelId) ?? null;

  /* ── Queries ───────────────────────────────────────────────────────────── */

  const { data: logsData } = useQuery({
    queryKey: ['channel-logs', selectedChannelId],
    queryFn: () => getLogs(selectedChannelId!, 1, 30),
    enabled: selectedChannelId !== null,
    refetchInterval: 15000,
  });

  const { data: mappings } = useQuery({
    queryKey: ['channel-mappings', selectedChannelId],
    queryFn: () => getMappings(selectedChannelId!),
    enabled: selectedChannelId !== null,
  });

  /* ── Mutations ─────────────────────────────────────────────────────────── */

  const createMut = useMutation({
    mutationFn: (dto: { type: ChannelType; credentials: Record<string, string> }) =>
      createChannel(propertyId!, { type: dto.type, credentials: dto.credentials }),
    onSuccess: (newChannel) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success(`${CHANNEL_CONFIGS[newChannel.type]?.name ?? 'Канал'} подключен!`);
      setShowAddModal(false);
      setAddType(null);
      setCredentials({});
    },
    onError: () => toast.error('Ошибка подключения канала'),
  });

  const updateMut = useMutation({
    mutationFn: (dto: { channelId: number; credentials: Record<string, string> }) =>
      updateChannel(dto.channelId, { credentials: dto.credentials }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Настройки сохранены');
      setShowSetupModal(false);
      setCredentials({});
    },
    onError: () => toast.error('Ошибка сохранения'),
  });

  const toggleMut = useMutation({
    mutationFn: (dto: { channelId: number; isActive: boolean }) =>
      updateChannel(dto.channelId, { is_active: dto.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });

  const mappingMut = useMutation({
    mutationFn: (dto: { room_id: number; channel_id: number; external_id: string }) =>
      updateMapping(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-mappings'] });
      toast.success('Маппинг сохранён');
    },
    onError: () => toast.error('Ошибка обновления маппинга'),
  });

  /* ── Handlers ──────────────────────────────────────────────────────────── */

  const handleSync = useCallback(async (channelId: number) => {
    setSyncingIds((prev) => new Set(prev).add(channelId));
    try {
      await syncChannel(channelId);
      toast.success('Синхронизация запущена');
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channel-logs'] });
    } catch {
      toast.error('Ошибка синхронизации');
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(channelId);
        return next;
      });
    }
  }, [queryClient]);

  const handleMappingBlur = useCallback(
    (roomId: number, externalId: string) => {
      if (!selectedChannelId || !externalId.trim()) return;
      mappingMut.mutate({
        room_id: roomId,
        channel_id: selectedChannelId,
        external_id: externalId.trim(),
      });
    },
    [selectedChannelId, mappingMut],
  );

  const openSetup = useCallback((channel: Channel) => {
    setSetupChannelId(channel.id);
    setCredentials(channel.credentials as Record<string, string>);
    setShowSetupModal(true);
  }, []);

  const openAdd = useCallback((type: ChannelType) => {
    setAddType(type);
    setCredentials({});
    setShowAddModal(true);
  }, []);

  const connectedTypes = new Set((channels || []).map((c) => c.type));
  const availableTypes = ALL_CHANNEL_TYPES.filter((t) => !connectedTypes.has(t));

  /* ── Helpers ───────────────────────────────────────────────────────────── */

  function timeSince(dateStr: string | Date | undefined): string {
    if (!dateStr) return 'Никогда';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Только что';
    if (mins < 60) return `${mins} мин назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч назад`;
    const days = Math.floor(hours / 24);
    return `${days} дн назад`;
  }

  /* ── Log columns ───────────────────────────────────────────────────────── */

  const logColumns: Column<SyncLog>[] = [
    {
      key: 'time',
      header: 'Время',
      render: (log) => (
        <span className="text-xs text-gray-600">{formatDateTime(log.createdAt)}</span>
      ),
    },
    {
      key: 'event',
      header: 'Событие',
      render: (log) => {
        const labels: Record<string, string> = {
          new_reservation: 'Новая бронь',
          modification: 'Изменение',
          cancellation: 'Отмена',
          close_room: 'Закрытие дат',
          open_room: 'Открытие дат',
          full_sync: 'Полная синхр.',
          manual_sync: 'Ручная синхр.',
          ical_poll: 'iCal импорт',
        };
        return <span className="text-sm text-gray-700">{labels[log.eventType] || log.eventType}</span>;
      },
    },
    {
      key: 'status',
      header: 'Статус',
      render: (log) => {
        const style = SYNC_STATUS_STYLES[log.status] || SYNC_STATUS_STYLES.pending;
        return (
          <Badge variant="custom" bg={style.bg} text={style.text} size="sm">
            {style.label}
          </Badge>
        );
      },
    },
    {
      key: 'error',
      header: 'Детали',
      render: (log) => (
        <span className="text-xs text-gray-500 truncate max-w-[200px] block">
          {log.errorMessage || '---'}
        </span>
      ),
    },
  ];

  /* ── LOADING ───────────────────────────────────────────────────────────── */

  if (isLoading) return <PageSpinner />;

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Каналы продаж"
        subtitle="Синхронизация с OTA-платформами: Booking.com, Airbnb и др."
        actions={
          availableTypes.length > 0 ? (
            <Button onClick={() => setShowAddModal(true)} icon={<IconPlus />}>
              Подключить канал
            </Button>
          ) : undefined
        }
      />

      {/* ── Connected channels ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {(channels || []).map((channel) => {
          const info = CHANNEL_CONFIGS[channel.type];
          const isSyncing = syncingIds.has(channel.id);

          return (
            <div
              key={channel.id}
              onClick={() => setSelectedChannelId(channel.id === selectedChannelId ? null : channel.id)}
              className={cn(
                'bg-white rounded-xl border p-5 cursor-pointer transition-all',
                selectedChannelId === channel.id
                  ? 'border-sardoba-gold ring-1 ring-sardoba-gold/30 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm',
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg', info?.color ?? 'bg-gray-500')}>
                  {info?.logo ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{info?.name ?? channel.type}</div>
                  <div className="flex items-center gap-1.5">
                    <div className={cn('w-2 h-2 rounded-full', channel.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300')} />
                    <span className="text-xs text-gray-500">{channel.isActive ? 'Активен' : 'Отключен'}</span>
                  </div>
                </div>
                {/* Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMut.mutate({ channelId: channel.id, isActive: !channel.isActive });
                  }}
                  className={cn(
                    'relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0',
                    channel.isActive ? 'bg-green-500' : 'bg-gray-300',
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                    channel.isActive ? 'translate-x-5' : 'translate-x-0.5',
                  )} />
                </button>
              </div>

              {/* Last sync */}
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                <IconRefresh className="w-3 h-3" />
                <span>Синхр.: {timeSince(channel.lastSyncAt)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    openSetup(channel);
                  }}
                >
                  Настроить
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSync(channel.id);
                  }}
                  loading={isSyncing}
                  disabled={!channel.isActive}
                  icon={<IconRefresh className="w-3.5 h-3.5" />}
                >
                  Синхр.
                </Button>
              </div>
            </div>
          );
        })}

        {(channels || []).length === 0 && (
          <div className="col-span-full text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">Нет подключенных каналов</h3>
            <p className="text-sm text-gray-500 mb-4">Подключите OTA-платформы для автоматической синхронизации бронирований</p>
            <Button onClick={() => setShowAddModal(true)} icon={<IconPlus />}>
              Подключить первый канал
            </Button>
          </div>
        )}
      </div>

      {/* ── Selected channel details ───────────────────────────────────────── */}
      {selectedChannelId && selectedChannel && (
        <div className="space-y-6">
          {/* Room mapping */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Маппинг номеров ({CHANNEL_CONFIGS[selectedChannel.type]?.name})
              </h3>
              <p className="text-xs text-gray-400">Привяжите ваши номера к ID на OTA-платформе</p>
            </div>
            <div className="space-y-2">
              {(rooms || []).map((room) => {
                const mapping = mappings?.find((m) => m.roomId === room.id);
                return (
                  <div key={room.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900">{room.name}</span>
                      <span className="text-xs text-gray-400 ml-2">#{room.id}</span>
                    </div>
                    <IconArrowRight className="text-gray-300 shrink-0" />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        defaultValue={mapping?.externalId || ''}
                        placeholder="External ID"
                        className="w-44 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold"
                        onBlur={(e) => handleMappingBlur(room.id, e.target.value)}
                      />
                      {mapping && (
                        <IconCheck className="text-green-500 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
              {(rooms || []).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  Сначала добавьте номера в разделе «Настройки → Номера»
                </p>
              )}
            </div>
          </div>

          {/* Sync logs */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Лог синхронизации</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['channel-logs'] })}
                icon={<IconRefresh className="w-3.5 h-3.5" />}
              >
                Обновить
              </Button>
            </div>
            <Table<SyncLog>
              columns={logColumns}
              data={logsData?.data ?? []}
              rowKey={(log) => log.id}
              emptyMessage="Нет записей синхронизации"
            />
          </div>
        </div>
      )}

      {/* ── Add Channel Modal ──────────────────────────────────────────────── */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setAddType(null); setCredentials({}); }}
        title={addType ? `Подключить ${CHANNEL_CONFIGS[addType]?.name}` : 'Подключить канал'}
        size="lg"
        footer={
          addType ? (
            <>
              <Button variant="outline" onClick={() => { setAddType(null); setCredentials({}); }}>
                Назад
              </Button>
              <Button
                onClick={() => {
                  if (!addType) return;
                  const config = CHANNEL_CONFIGS[addType];
                  const requiredKeys = config.fields.map((f) => f.key);
                  const missing = requiredKeys.filter((k) => !credentials[k]?.trim());
                  if (missing.length > 0) {
                    toast.error('Заполните все обязательные поля');
                    return;
                  }
                  createMut.mutate({ type: addType, credentials });
                }}
                loading={createMut.isPending}
              >
                Подключить
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Закрыть
            </Button>
          )
        }
      >
        {!addType ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">Выберите OTA-платформу для подключения:</p>
            {availableTypes.map((type) => {
              const config = CHANNEL_CONFIGS[type];
              return (
                <button
                  key={type}
                  onClick={() => openAdd(type)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-sardoba-gold hover:shadow-sm transition-all text-left"
                >
                  <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl', config.color)}>
                    {config.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900">{config.name}</div>
                    <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
                  </div>
                  <IconArrowRight className="text-gray-400 shrink-0" />
                </button>
              );
            })}
            {availableTypes.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">
                Все доступные каналы уже подключены
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Guide */}
            <div className="p-4 bg-blue-50 rounded-xl">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Как получить данные:</h4>
              <ol className="space-y-1">
                {CHANNEL_CONFIGS[addType].guide.map((step, idx) => (
                  <li key={idx} className="text-xs text-blue-700 flex gap-2">
                    <span className="font-semibold shrink-0">{idx + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Credential fields */}
            {CHANNEL_CONFIGS[addType].fields.map((field) => (
              <Input
                key={field.key}
                label={field.label}
                type={field.type || 'text'}
                value={credentials[field.key] || ''}
                onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                required
              />
            ))}
          </div>
        )}
      </Modal>

      {/* ── Setup (Edit) Modal ─────────────────────────────────────────────── */}
      <Modal
        open={showSetupModal}
        onClose={() => { setShowSetupModal(false); setCredentials({}); }}
        title={setupChannel ? `Настройка: ${CHANNEL_CONFIGS[setupChannel.type]?.name}` : 'Настройка канала'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowSetupModal(false); setCredentials({}); }}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (!setupChannelId) return;
                updateMut.mutate({ channelId: setupChannelId, credentials });
              }}
              loading={updateMut.isPending}
            >
              Сохранить
            </Button>
          </>
        }
      >
        {setupChannel && (
          <div className="space-y-4">
            {CHANNEL_CONFIGS[setupChannel.type]?.fields.map((field) => (
              <Input
                key={field.key}
                label={field.label}
                type={field.type || 'text'}
                value={credentials[field.key] || ''}
                onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.value })}
                placeholder={field.placeholder}
              />
            ))}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">
                Маскированные значения (***) означают, что данные сохранены.
                Оставьте поле пустым, чтобы не менять значение.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
