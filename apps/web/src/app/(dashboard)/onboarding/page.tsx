'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';

const STEPS = [
  { id: 1, title: 'Информация об отеле' },
  { id: 2, title: 'Добавить номер' },
  { id: 3, title: 'Подключить Telegram' },
  { id: 4, title: 'Пригласить администратора' },
];

const CITY_OPTIONS = [
  { value: 'Samarkand', label: 'Самарканд' },
  { value: 'Bukhara', label: 'Бухара' },
  { value: 'Tashkent', label: 'Ташкент' },
  { value: 'Khiva', label: 'Хива' },
  { value: 'Fergana', label: 'Фергана' },
];

const CURRENCY_OPTIONS = [
  { value: 'UZS', label: 'UZS (сум)' },
  { value: 'USD', label: 'USD (доллар)' },
  { value: 'EUR', label: 'EUR (евро)' },
];

const ROOM_TYPE_OPTIONS = [
  { value: 'single', label: 'Одноместный' },
  { value: 'double', label: 'Двухместный' },
  { value: 'family', label: 'Семейный' },
  { value: 'suite', label: 'Люкс' },
  { value: 'dorm', label: 'Общий' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Hotel info
  const [hotelName, setHotelName] = useState('');
  const [city, setCity] = useState('Samarkand');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState('UZS');

  // Step 2: First room
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState('double');
  const [roomPrice, setRoomPrice] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('2');

  // Step 3: Telegram
  const [telegramChatId, setTelegramChatId] = useState('');

  // Step 4: Invite admin
  const [adminEmail, setAdminEmail] = useState('');

  const handleNext = useCallback(async () => {
    if (step === 1) {
      if (!hotelName || !phone) {
        toast.error('Заполните название и телефон');
        return;
      }
      setLoading(true);
      try {
        await api.post('/properties', {
          name: hotelName,
          city,
          phone,
          currency,
          timezone: 'Asia/Tashkent',
          locale: 'ru',
          checkin_time: '14:00',
          checkout_time: '12:00',
        });
        toast.success('Отель создан');
        setStep(2);
      } catch {
        toast.error('Ошибка при создании');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === 2) {
      if (roomName && roomPrice) {
        setLoading(true);
        try {
          await api.post('/rooms', {
            property_id: 1,
            name: roomName,
            room_type: roomType,
            capacity_adults: Number(roomCapacity),
            base_price: Math.round(Number(roomPrice) * 100),
          });
          toast.success('Номер добавлен');
        } catch {
          toast.error('Ошибка при добавлении номера');
        } finally {
          setLoading(false);
        }
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (telegramChatId) {
        setLoading(true);
        try {
          await api.put('/notifications/settings', {
            propertyId: 1,
            telegramRecipients: [
              { name: 'Владелец', chatId: telegramChatId, isActive: true },
            ],
            events: {
              newBooking: true,
              cancellation: true,
              dailyDigest: true,
              dailyDigestTime: '09:00',
              paymentReceived: true,
              syncError: true,
            },
          });
          toast.success('Telegram подключен');
        } catch {
          toast.error('Ошибка подключения');
        } finally {
          setLoading(false);
        }
      }
      setStep(4);
      return;
    }

    if (step === 4) {
      if (adminEmail) {
        setLoading(true);
        try {
          await api.post('/users/invite', {
            property_id: 1,
            email: adminEmail,
            role: 'admin',
          });
          toast.success('Приглашение отправлено');
        } catch {
          toast.error('Ошибка отправки приглашения');
        } finally {
          setLoading(false);
        }
      }
      router.push('/calendar');
    }
  }, [step, hotelName, city, phone, currency, roomName, roomType, roomPrice, roomCapacity, telegramChatId, adminEmail, router]);

  const handleSkip = useCallback(() => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      router.push('/calendar');
    }
  }, [step, router]);

  const progress = (step / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sardoba-sand-light to-white flex flex-col">
      {/* Header */}
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-sardoba-blue">
          Sardoba PMS
        </h1>
        <p className="text-sm text-gray-500 mt-1">Настройка вашего отеля</p>
      </div>

      {/* Progress bar */}
      <div className="px-6 max-w-xl mx-auto w-full mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={cn(
                'flex items-center gap-2',
                step >= s.id ? 'text-sardoba-gold-dark' : 'text-gray-400',
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                  step > s.id
                    ? 'bg-sardoba-gold border-sardoba-gold text-white'
                    : step === s.id
                      ? 'border-sardoba-gold text-sardoba-gold-dark bg-white'
                      : 'border-gray-300 text-gray-400 bg-white',
                )}
              >
                {step > s.id ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  s.id
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-sardoba-gold rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 pb-6 max-w-xl mx-auto w-full">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-card">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {STEPS[step - 1].title}
          </h2>

          {/* Step 1: Hotel info */}
          {step === 1 && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-gray-600">
                Укажите основную информацию о вашем отеле.
              </p>
              <Input
                label="Название отеля"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                placeholder="Hotel Sardoba"
                required
              />
              <Select
                label="Город"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                options={CITY_OPTIONS}
              />
              <Input
                label="Телефон"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                required
              />
              <Select
                label="Валюта"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={CURRENCY_OPTIONS}
              />
            </div>
          )}

          {/* Step 2: First room */}
          {step === 2 && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-gray-600">
                Добавьте ваш первый номер. Остальные можно добавить позже в настройках.
              </p>
              <Input
                label="Название номера"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Номер 101"
              />
              <Select
                label="Тип"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                options={ROOM_TYPE_OPTIONS}
              />
              <Input
                label="Вместимость (взрослых)"
                type="number"
                value={roomCapacity}
                onChange={(e) => setRoomCapacity(e.target.value)}
                min={1}
              />
              <Input
                label="Цена за ночь (сум)"
                type="number"
                value={roomPrice}
                onChange={(e) => setRoomPrice(e.target.value)}
                placeholder="300000"
              />
            </div>
          )}

          {/* Step 3: Telegram */}
          {step === 3 && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-gray-600">
                Подключите Telegram для получения уведомлений о бронированиях.
              </p>
              <div className="p-4 bg-blue-50 rounded-lg">
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Откройте @SardobaBot в Telegram</li>
                  <li>Отправьте /start</li>
                  <li>Скопируйте Chat ID</li>
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
              <Input
                label="Chat ID"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="123456789"
              />
            </div>
          )}

          {/* Step 4: Invite admin */}
          {step === 4 && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-gray-600">
                Пригласите администратора для совместного управления отелем.
              </p>
              <Input
                label="Email администратора"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@hotel.uz"
              />
              <p className="text-xs text-gray-500">
                Администратор получит приглашение на указанный email.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            {step > 1 && (
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
              >
                Назад
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              {(step === 3 || step === 4) && (
                <Button variant="outline" onClick={handleSkip}>
                  Пропустить
                </Button>
              )}
              <Button onClick={handleNext} loading={loading}>
                {step === 4 ? 'Завершить' : 'Далее'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
