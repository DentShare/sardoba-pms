'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import type { NotificationSettings, TelegramRecipient } from '@sardoba/shared';

const PROPERTY_ID = 1;

async function getNotificationSettings(propertyId: number): Promise<NotificationSettings> {
  const { data } = await api.get<NotificationSettings>('/notifications/settings', {
    params: { property_id: propertyId },
  });
  return data;
}

async function updateNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
  const { data } = await api.put<NotificationSettings>('/notifications/settings', settings);
  return data;
}

async function testNotification(propertyId: number): Promise<void> {
  await api.post('/notifications/test', { property_id: propertyId });
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-sardoba-gold' : 'bg-gray-300',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </label>
  );
}

export default function SettingsNotificationsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['notification-settings', PROPERTY_ID],
    queryFn: () => getNotificationSettings(PROPERTY_ID),
  });

  const [recipients, setRecipients] = useState<TelegramRecipient[]>([]);
  const [events, setEvents] = useState({
    newBooking: true,
    cancellation: true,
    dailyDigest: true,
    dailyDigestTime: '09:00',
    paymentReceived: true,
    syncError: true,
  });
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientChat, setNewRecipientChat] = useState('');

  useEffect(() => {
    if (settings) {
      setRecipients(settings.telegramRecipients || []);
      setEvents(settings.events || events);
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: () =>
      updateNotificationSettings({
        propertyId: PROPERTY_ID,
        telegramRecipients: recipients,
        events,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success('Настройки сохранены');
    },
    onError: () => {
      toast.error('Ошибка сохранения');
    },
  });

  const testMut = useMutation({
    mutationFn: () => testNotification(PROPERTY_ID),
    onSuccess: () => {
      toast.success('Тестовое уведомление отправлено');
    },
    onError: () => {
      toast.error('Ошибка отправки');
    },
  });

  const handleAddRecipient = useCallback(() => {
    if (!newRecipientName || !newRecipientChat) {
      toast.error('Заполните имя и Chat ID');
      return;
    }
    setRecipients((prev) => [
      ...prev,
      { name: newRecipientName, chatId: newRecipientChat, isActive: true },
    ]);
    setNewRecipientName('');
    setNewRecipientChat('');
  }, [newRecipientName, newRecipientChat]);

  const toggleRecipient = useCallback((index: number) => {
    setRecipients((prev) =>
      prev.map((r, i) => (i === index ? { ...r, isActive: !r.isActive } : r)),
    );
  }, []);

  const removeRecipient = useCallback((index: number) => {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  }, []);

  if (isLoading) return <PageSpinner />;

  const isConnected = recipients.length > 0 && recipients.some((r) => r.isActive);

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Уведомления"
        subtitle="Настройка Telegram-уведомлений"
        actions={
          <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending}>
            Сохранить
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telegram connection */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Telegram Bot
              </h3>
              <Badge variant={isConnected ? 'success' : 'default'}>
                {isConnected ? 'Подключен' : 'Не подключен'}
              </Badge>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg mb-4">
              <p className="text-sm text-blue-800 mb-2">
                Для получения уведомлений:
              </p>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Откройте @SardobaBot в Telegram</li>
                <li>Отправьте команду /start</li>
                <li>Скопируйте полученный Chat ID</li>
                <li>Вставьте Chat ID ниже</li>
              </ol>
            </div>

            <a
              href="https://t.me/SardobaBot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0088cc] text-white rounded-lg text-sm font-medium hover:bg-[#006daa] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Открыть @SardobaBot
            </a>
          </div>

          {/* Recipients */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Получатели
            </h3>

            {recipients.length > 0 ? (
              <div className="space-y-2 mb-4">
                {recipients.map((recipient, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleRecipient(index)}
                        className={cn(
                          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                          recipient.isActive ? 'bg-sardoba-gold' : 'bg-gray-300',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm',
                            recipient.isActive ? 'translate-x-4' : 'translate-x-0.5',
                          )}
                        />
                      </button>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {recipient.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Chat ID: {recipient.chatId}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeRecipient(index)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-gray-500 mb-4">
                Нет получателей
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newRecipientName}
                onChange={(e) => setNewRecipientName(e.target.value)}
                placeholder="Имя"
                className="flex-1"
              />
              <Input
                value={newRecipientChat}
                onChange={(e) => setNewRecipientChat(e.target.value)}
                placeholder="Chat ID"
                className="w-32"
              />
              <Button size="md" variant="outline" onClick={handleAddRecipient}>
                Добавить
              </Button>
            </div>
          </div>
        </div>

        {/* Event settings */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              События
            </h3>
            <div className="divide-y divide-gray-100">
              <Toggle
                label="Новое бронирование"
                checked={events.newBooking}
                onChange={(v) => setEvents((e) => ({ ...e, newBooking: v }))}
              />
              <Toggle
                label="Отмена бронирования"
                checked={events.cancellation}
                onChange={(v) => setEvents((e) => ({ ...e, cancellation: v }))}
              />
              <Toggle
                label="Получена оплата"
                checked={events.paymentReceived}
                onChange={(v) => setEvents((e) => ({ ...e, paymentReceived: v }))}
              />
              <Toggle
                label="Ошибка синхронизации"
                checked={events.syncError}
                onChange={(v) => setEvents((e) => ({ ...e, syncError: v }))}
              />
              <div className="py-2">
                <Toggle
                  label="Ежедневный дайджест"
                  checked={events.dailyDigest}
                  onChange={(v) => setEvents((e) => ({ ...e, dailyDigest: v }))}
                />
                {events.dailyDigest && (
                  <div className="mt-2 ml-4">
                    <Input
                      label="Время отправки"
                      type="time"
                      value={events.dailyDigestTime}
                      onChange={(e) =>
                        setEvents((ev) => ({ ...ev, dailyDigestTime: e.target.value }))
                      }
                      className="w-32"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Test button */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Тестирование
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Отправить тестовое уведомление всем активным получателям.
            </p>
            <Button
              variant="outline"
              onClick={() => testMut.mutate()}
              loading={testMut.isPending}
              disabled={!isConnected}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" />
                </svg>
              }
            >
              Тест
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
