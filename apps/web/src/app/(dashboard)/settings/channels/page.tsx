'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Table, type Column } from '@/components/ui/Table';
import { Spinner, PageSpinner } from '@/components/ui/Spinner';
import {
  listChannels,
  syncChannel,
  getMappings,
  updateMapping,
  getLogs,
} from '@/lib/api/channels';
import { useRooms } from '@/lib/hooks/use-rooms';
import { formatDateTime } from '@/lib/utils/dates';
import type { Channel, RoomMapping, SyncLog, SyncStatus } from '@sardoba/shared';

const PROPERTY_ID = 1;

const CHANNEL_INFO: Record<string, { name: string; logo: string; color: string }> = {
  booking_com: {
    name: 'Booking.com',
    logo: 'B',
    color: 'bg-blue-600',
  },
  airbnb: {
    name: 'Airbnb',
    logo: 'A',
    color: 'bg-rose-500',
  },
  expedia: {
    name: 'Expedia',
    logo: 'E',
    color: 'bg-yellow-500',
  },
  hotels_com: {
    name: 'Hotels.com',
    logo: 'H',
    color: 'bg-red-600',
  },
  ostrovok: {
    name: 'Ostrovok',
    logo: 'O',
    color: 'bg-indigo-600',
  },
};

const SYNC_STATUS_STYLES: Record<SyncStatus, { bg: string; text: string; label: string }> = {
  success: { bg: 'bg-green-100', text: 'text-green-800', label: 'Успех' },
  error: { bg: 'bg-red-100', text: 'text-red-800', label: 'Ошибка' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Ожидание' },
};

export default function SettingsChannelsPage() {
  const queryClient = useQueryClient();

  const { data: channels, isLoading } = useQuery({
    queryKey: ['channels', PROPERTY_ID],
    queryFn: () => listChannels(PROPERTY_ID),
  });

  const { data: rooms } = useRooms(PROPERTY_ID);

  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [setupChannel, setSetupChannel] = useState<Channel | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [hotelId, setHotelId] = useState('');

  // Sync logs for selected channel
  const { data: logsData } = useQuery({
    queryKey: ['channel-logs', selectedChannelId],
    queryFn: () => getLogs(selectedChannelId!, 1, 20),
    enabled: selectedChannelId !== null,
  });

  // Room mappings
  const { data: mappings } = useQuery({
    queryKey: ['channel-mappings', selectedChannelId],
    queryFn: () => getMappings(selectedChannelId!),
    enabled: selectedChannelId !== null,
  });

  const syncMut = useMutation({
    mutationFn: (channelId: number) => syncChannel(channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channel-logs'] });
      toast.success('Синхронизация запущена');
    },
    onError: () => {
      toast.error('Ошибка синхронизации');
    },
  });

  const updateMappingMut = useMutation({
    mutationFn: (dto: { room_id: number; channel_id: number; external_id: string }) =>
      updateMapping(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-mappings'] });
      toast.success('Маппинг обновлен');
    },
    onError: () => {
      toast.error('Ошибка обновления маппинга');
    },
  });

  const handleMappingChange = useCallback(
    (roomId: number, externalId: string) => {
      if (!selectedChannelId || !externalId) return;
      updateMappingMut.mutate({
        room_id: roomId,
        channel_id: selectedChannelId,
        external_id: externalId,
      });
    },
    [selectedChannelId, updateMappingMut],
  );

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
      render: (log) => <span className="text-sm text-gray-700">{log.eventType}</span>,
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
      header: 'Сообщение',
      render: (log) => (
        <span className="text-xs text-gray-500 truncate max-w-[200px] block">
          {log.errorMessage || '---'}
        </span>
      ),
    },
  ];

  if (isLoading) return <PageSpinner />;

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Каналы продаж"
        subtitle="Подключение OTA и Channel Manager"
      />

      {/* Channel cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {(channels || []).map((channel) => {
          const info = CHANNEL_INFO[channel.type] || {
            name: channel.type,
            logo: '?',
            color: 'bg-gray-500',
          };

          return (
            <div
              key={channel.id}
              onClick={() =>
                setSelectedChannelId(
                  channel.id === selectedChannelId ? null : channel.id,
                )
              }
              className={cn(
                'bg-white rounded-xl border p-5 cursor-pointer transition-all',
                selectedChannelId === channel.id
                  ? 'border-sardoba-gold ring-1 ring-sardoba-gold/30'
                  : 'border-gray-200 hover:border-gray-300',
              )}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg', info.color)}>
                  {info.logo}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{info.name}</div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        channel.isActive ? 'bg-green-500' : 'bg-gray-300',
                      )}
                    />
                    <span className="text-xs text-gray-500">
                      {channel.isActive ? 'Подключен' : 'Отключен'}
                    </span>
                  </div>
                </div>
              </div>

              {channel.lastSyncAt && (
                <div className="text-xs text-gray-500 mb-3">
                  Последняя синхронизация: {formatDateTime(channel.lastSyncAt)}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSetupChannel(channel);
                    setShowSetup(true);
                  }}
                >
                  Настроить
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    syncMut.mutate(channel.id);
                  }}
                  loading={syncMut.isPending}
                  disabled={!channel.isActive}
                >
                  Синхронизировать
                </Button>
              </div>
            </div>
          );
        })}

        {(channels || []).length === 0 && (
          <div className="col-span-full text-center py-12 text-sm text-gray-500 bg-white rounded-xl border border-gray-200">
            Нет подключенных каналов
          </div>
        )}
      </div>

      {/* Selected channel details */}
      {selectedChannelId && (
        <div className="space-y-6">
          {/* Room mapping */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Маппинг номеров
            </h3>
            <div className="space-y-3">
              {(rooms || []).map((room) => {
                const mapping = mappings?.find((m) => m.roomId === room.id);
                return (
                  <div
                    key={room.id}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        {room.name}
                      </span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0">
                      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                    </svg>
                    <input
                      type="text"
                      defaultValue={mapping?.externalId || ''}
                      placeholder="External ID"
                      className="w-40 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold"
                      onBlur={(e) => handleMappingChange(room.id, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sync logs */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Лог синхронизации (последние 20)
            </h3>
            <Table<SyncLog>
              columns={logColumns}
              data={logsData?.data ?? []}
              rowKey={(log) => log.id}
              emptyMessage="Нет записей"
            />
          </div>
        </div>
      )}

      {/* Setup Modal */}
      <Modal
        open={showSetup}
        onClose={() => setShowSetup(false)}
        title={
          setupChannel
            ? `Настройка: ${CHANNEL_INFO[setupChannel.type]?.name || setupChannel.type}`
            : 'Настройка канала'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setShowSetup(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                toast.success('Настройки сохранены');
                setShowSetup(false);
              }}
            >
              Сохранить
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="API ключ"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Введите API ключ..."
            type="password"
          />
          <Input
            label="ID отеля"
            value={hotelId}
            onChange={(e) => setHotelId(e.target.value)}
            placeholder="ID вашего отеля на платформе"
          />
          <p className="text-xs text-gray-500">
            Для получения API ключа обратитесь в техподдержку платформы.
          </p>
        </div>
      </Modal>
    </div>
  );
}
