'use client';

import { useState } from 'react';
import {
  Settings,
  Globe,
  Bell,
  Shield,
  Database,
  Mail,
  Server,
  Key,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Wifi,
  HardDrive,
} from 'lucide-react';
import clsx from 'clsx';
import { planConfigs, PlanId, formatUZS } from '@/lib/mock-data';

type TabId = 'general' | 'integrations' | 'notifications' | 'security' | 'system';

const tabs: { id: TabId; name: string; icon: typeof Settings }[] = [
  { id: 'general', name: 'Основные', icon: Globe },
  { id: 'integrations', name: 'Интеграции', icon: Wifi },
  { id: 'notifications', name: 'Уведомления', icon: Bell },
  { id: 'security', name: 'Безопасность', icon: Shield },
  { id: 'system', name: 'Система', icon: Server },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Настройки платформы</h1>
        <p className="text-sm text-gray-500 mt-1">Конфигурация Sardoba PMS</p>
      </div>

      <div className="flex gap-6">
        <nav className="w-56 shrink-0">
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                    activeTab === tab.id
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 max-w-3xl">
          {activeTab === 'general' && <GeneralSettings />}
          {activeTab === 'integrations' && <IntegrationsSettings />}
          {activeTab === 'notifications' && <NotificationsSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'system' && <SystemSettings />}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function GeneralSettings() {
  return (
    <div className="space-y-6">
      <SectionCard title="Информация о платформе">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название платформы</label>
            <input type="text" defaultValue="Sardoba PMS" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Домен</label>
            <input type="text" defaultValue="app.sardoba.uz" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API URL</label>
            <input type="text" defaultValue="https://api.sardoba.uz/v1" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Версия</label>
            <input type="text" defaultValue="1.0.0-beta" className="input-field" readOnly />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Локализация" description="Языки и региональные настройки">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Язык по умолчанию</label>
            <select className="input-field">
              <option>Русский</option>
              <option>Ўзбекча</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Валюта по умолчанию</label>
            <select className="input-field">
              <option>UZS — Узбекский сум</option>
              <option>USD — Доллар США</option>
              <option>EUR — Евро</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Формат даты</label>
            <select className="input-field">
              <option>ДД.ММ.ГГГГ</option>
              <option>ГГГГ-ММ-ДД</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Часовой пояс</label>
            <select className="input-field">
              <option>Asia/Tashkent (UTC+5)</option>
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Тарифные планы" description="4-уровневая тарифная система по размеру отеля">
        <div className="space-y-4">
          {(Object.values(planConfigs) as typeof planConfigs[PlanId][]).map((plan) => (
            <div key={plan.id} className="rounded-xl border overflow-hidden">
              <div className="flex items-center gap-4 p-4 bg-gray-50">
                <div className="w-28">
                  <span className={plan.badgeClass}>{plan.name}</span>
                </div>
                <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs block">Цена/мес</span>
                    <span className="font-semibold">{plan.price > 0 ? formatUZS(plan.price) : 'Индивидуально'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block">Номеров</span>
                    <span className="font-semibold">до {plan.maxRooms ?? '∞'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block">Пользователей</span>
                    <span className="font-semibold">{plan.maxUsers ?? '∞'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block">OTA-каналов</span>
                    <span className="font-semibold">{plan.maxOtaChannels === 0 ? '—' : plan.maxOtaChannels ?? '50+'}</span>
                  </div>
                </div>
                <button className="text-brand-600 text-sm font-medium hover:underline">Изменить</button>
              </div>
              <div className="px-4 py-3 bg-white">
                <div className="flex flex-wrap gap-1.5">
                  {plan.features.map((f) => (
                    <span key={f} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button className="btn-primary">
          <Save className="w-4 h-4" />
          Сохранить изменения
        </button>
      </div>
    </div>
  );
}

function IntegrationsSettings() {
  const integrations = [
    { name: 'Booking.com', desc: 'Connectivity API', status: 'connected', key: 'bk_****7823' },
    { name: 'Airbnb', desc: 'iCal + API', status: 'connected', key: 'ab_****4512' },
    { name: 'Payme', desc: 'Платёжный шлюз', status: 'connected', key: 'pm_****9901' },
    { name: 'Click', desc: 'Платёжный шлюз', status: 'connected', key: 'cl_****3345' },
    { name: 'Telegram Bot', desc: 'Уведомления', status: 'connected', key: '@sardoba_pms_bot' },
    { name: 'Expedia', desc: 'Connectivity API', status: 'pending', key: '—' },
    { name: 'Ostrovok.ru', desc: 'API', status: 'pending', key: '—' },
  ];

  return (
    <div className="space-y-6">
      <SectionCard title="Подключённые интеграции" description="API-ключи и статусы внешних сервисов">
        <div className="space-y-3">
          {integrations.map((int) => (
            <div key={int.name} className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{int.name}</span>
                  {int.status === 'connected' ? (
                    <span className="badge badge-green">Подключено</span>
                  ) : (
                    <span className="badge badge-yellow">Планируется</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{int.desc}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono text-gray-500">{int.key}</p>
              </div>
              <button className="btn-secondary text-xs py-1.5 px-3">
                {int.status === 'connected' ? 'Настроить' : 'Подключить'}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Webhook URL" description="Эндпоинты для входящих событий от OTA">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Booking.com Webhook</label>
            <div className="flex gap-2">
              <input type="text" defaultValue="https://api.sardoba.uz/v1/webhooks/booking-com" className="input-field flex-1 font-mono text-xs" readOnly />
              <button className="btn-secondary text-xs">Копировать</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Airbnb Webhook</label>
            <div className="flex gap-2">
              <input type="text" defaultValue="https://api.sardoba.uz/v1/webhooks/airbnb" className="input-field flex-1 font-mono text-xs" readOnly />
              <button className="btn-secondary text-xs">Копировать</button>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function NotificationsSettings() {
  return (
    <div className="space-y-6">
      <SectionCard title="Email-уведомления" description="Настройка отправки email от платформы">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP сервер</label>
            <input type="text" defaultValue="smtp.mail.uz" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Порт</label>
            <input type="text" defaultValue="587" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email отправителя</label>
            <input type="text" defaultValue="noreply@sardoba.uz" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Имя отправителя</label>
            <input type="text" defaultValue="Sardoba PMS" className="input-field" />
          </div>
        </div>
        <button className="btn-secondary text-sm mt-2">
          <Mail className="w-4 h-4" />
          Отправить тестовое письмо
        </button>
      </SectionCard>

      <SectionCard title="Уведомления администратору" description="Какие события присылать Super Admin">
        <div className="space-y-3">
          {[
            { label: 'Новая регистрация отеля', checked: true },
            { label: 'Критические ошибки системы', checked: true },
            { label: 'Ошибки синхронизации с OTA', checked: true },
            { label: 'Подписка истекает (за 7 дней)', checked: true },
            { label: 'Оплата подписки получена', checked: false },
            { label: 'Новый пользователь зарегистрирован', checked: false },
            { label: 'Ежедневный отчёт платформы', checked: true },
          ].map((item) => (
            <label key={item.label} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" defaultChecked={item.checked} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              <span className="text-sm">{item.label}</span>
            </label>
          ))}
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button className="btn-primary">
          <Save className="w-4 h-4" />
          Сохранить
        </button>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <SectionCard title="Аутентификация" description="Настройки безопасности входа">
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium text-sm">Двухфакторная аутентификация (2FA)</p>
              <p className="text-xs text-gray-500">Требовать 2FA для всех владельцев</p>
            </div>
            <input type="checkbox" defaultChecked className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
          </label>
          <label className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium text-sm">Блокировка после неудачных попыток</p>
              <p className="text-xs text-gray-500">Блокировать аккаунт после 5 попыток на 30 минут</p>
            </div>
            <input type="checkbox" defaultChecked className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
          </label>
          <label className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium text-sm">Обязательная смена пароля</p>
              <p className="text-xs text-gray-500">Каждые 90 дней</p>
            </div>
            <input type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Сессии" description="Управление активными сессиями">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Время жизни JWT токена</label>
            <select className="input-field">
              <option>24 часа</option>
              <option>12 часов</option>
              <option>48 часов</option>
              <option>7 дней</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Refresh token</label>
            <select className="input-field">
              <option>30 дней</option>
              <option>14 дней</option>
              <option>7 дней</option>
            </select>
          </div>
        </div>
        <button className="btn-danger text-sm mt-2">
          <AlertTriangle className="w-4 h-4" />
          Инвалидировать все сессии
        </button>
      </SectionCard>

      <SectionCard title="Шифрование данных">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-medium text-sm text-emerald-800">SSL/TLS активен</p>
              <p className="text-xs text-emerald-600">Let&apos;s Encrypt, истекает 15.06.2026</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-medium text-sm text-emerald-800">Шифрование паспортных данных</p>
              <p className="text-xs text-emerald-600">AES-256, все поля зашифрованы</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button className="btn-primary">
          <Save className="w-4 h-4" />
          Сохранить
        </button>
      </div>
    </div>
  );
}

function SystemSettings() {
  const systemInfo = [
    { label: 'Среда', value: 'Production', icon: Server },
    { label: 'Регион', value: 'Ташкент, UZ', icon: Globe },
    { label: 'База данных', value: 'PostgreSQL 16', icon: Database },
    { label: 'Хранилище', value: '23.4 GB / 100 GB', icon: HardDrive },
    { label: 'API ключ платформы', value: 'sk_live_****8834', icon: Key },
  ];

  return (
    <div className="space-y-6">
      <SectionCard title="Информация о системе">
        <div className="space-y-3">
          {systemInfo.map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg border">
              <item.icon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500 w-40">{item.label}</span>
              <span className="text-sm font-medium font-mono">{item.value}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Резервное копирование" description="Ежедневное автоматическое резервное копирование">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <div className="flex-1">
            <p className="font-medium text-sm text-emerald-800">Последний бэкап: 25.02.2026, 03:00</p>
            <p className="text-xs text-emerald-600">Размер: 2.3 GB, Время: 12 мин</p>
          </div>
          <button className="btn-secondary text-xs py-1.5 px-3">
            <RefreshCw className="w-3 h-3" />
            Запустить сейчас
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Расписание</label>
            <select className="input-field">
              <option>Ежедневно в 03:00</option>
              <option>Каждые 12 часов</option>
              <option>Каждые 6 часов</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Хранить копий</label>
            <select className="input-field">
              <option>30 дней</option>
              <option>14 дней</option>
              <option>7 дней</option>
              <option>90 дней</option>
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Обслуживание">
        <div className="flex flex-wrap gap-3">
          <button className="btn-secondary">
            <RefreshCw className="w-4 h-4" />
            Очистить кеш
          </button>
          <button className="btn-secondary">
            <Database className="w-4 h-4" />
            Оптимизация БД
          </button>
          <button className="btn-danger">
            <AlertTriangle className="w-4 h-4" />
            Режим обслуживания
          </button>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button className="btn-primary">
          <Save className="w-4 h-4" />
          Сохранить
        </button>
      </div>
    </div>
  );
}
