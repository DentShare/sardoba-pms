'use client';

import { useState, useMemo } from 'react';
import {
  Bell,
  Send,
  CheckCircle2,
  XCircle,
  Zap,
  MessageSquare,
  Mail,
  Plus,
  Eye,
  Edit3,
  Trash2,
  X,
  Search,
  Play,
  Pause,
  Calendar,
  Users,
  TrendingUp,
  BarChart3,
  Clock,
  Filter,
  Copy,
  Smartphone,
  Globe,
  ChevronRight,
  AlertTriangle,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────

type TabId = 'dashboard' | 'templates' | 'triggers' | 'campaigns' | 'reports';
type Channel = 'sms' | 'email';
type Lang = 'ru' | 'uz' | 'en';
type TemplateStatus = 'active' | 'inactive';
type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed';
type MessageStatus = 'delivered' | 'failed' | 'pending';

interface Template {
  id: number;
  name: string;
  channel: Channel;
  lang: Lang;
  status: TemplateStatus;
  body: string;
}

interface Trigger {
  id: number;
  event: string;
  eventLabel: string;
  channel: Channel;
  templateName: string;
  delay: string;
  enabled: boolean;
}

interface Campaign {
  id: number;
  name: string;
  channel: Channel;
  templateName: string;
  segment: string;
  status: CampaignStatus;
  recipients: number;
  sent: number;
  delivered: number;
  failed: number;
  scheduledAt: string;
}

interface SentMessage {
  id: number;
  time: string;
  channel: Channel;
  recipient: string;
  template: string;
  status: MessageStatus;
  hotel: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────

const mockTemplates: Template[] = [
  {
    id: 1,
    name: 'Подтверждение брони',
    channel: 'sms',
    lang: 'ru',
    status: 'active',
    body: 'Здравствуйте, {guest_name}! Ваша бронь в {hotel_name} подтверждена. Заезд: {check_in}. Номер брони: {booking_number}. Ждём вас!',
  },
  {
    id: 2,
    name: 'Pre-arrival напоминание',
    channel: 'sms',
    lang: 'ru',
    status: 'active',
    body: '{guest_name}, напоминаем: завтра ваш заезд в {hotel_name}. Время заселения с {check_in_time}. Адрес: {hotel_address}. До встречи!',
  },
  {
    id: 3,
    name: 'Благодарность за проживание',
    channel: 'email',
    lang: 'ru',
    status: 'active',
    body: 'Уважаемый(ая) {guest_name},\n\nБлагодарим вас за проживание в {hotel_name}!\n\nМы надеемся, что ваш отдых прошёл замечательно. Будем рады видеть вас снова.\n\nС уважением,\nКоманда {hotel_name}',
  },
  {
    id: 4,
    name: 'Поздравление с Днём рождения',
    channel: 'email',
    lang: 'ru',
    status: 'inactive',
    body: 'Дорогой(ая) {guest_name},\n\nПоздравляем вас с Днём рождения! 🎉\n\nВ честь праздника мы дарим вам скидку {discount}% на следующее проживание в {hotel_name}.\n\nПромокод: {promo_code}\n\nС наилучшими пожеланиями,\n{hotel_name}',
  },
];

const mockTriggers: Trigger[] = [
  { id: 1, event: 'booking_confirmed', eventLabel: 'Бронь подтверждена', channel: 'sms', templateName: 'Подтверждение брони', delay: '0', enabled: true },
  { id: 2, event: 'pre_arrival', eventLabel: 'Накануне заезда', channel: 'sms', templateName: 'Pre-arrival напоминание', delay: '-24ч', enabled: true },
  { id: 3, event: 'check_in', eventLabel: 'Заселение', channel: 'email', templateName: 'Добро пожаловать', delay: '+1ч', enabled: true },
  { id: 4, event: 'check_out', eventLabel: 'Выезд', channel: 'email', templateName: 'Благодарность за проживание', delay: '+2ч', enabled: true },
  { id: 5, event: 'post_stay', eventLabel: 'После проживания', channel: 'email', templateName: 'Запрос отзыва', delay: '+24ч', enabled: false },
  { id: 6, event: 'payment_received', eventLabel: 'Оплата получена', channel: 'sms', templateName: 'Квитанция об оплате', delay: '0', enabled: true },
];

const mockCampaigns: Campaign[] = [
  { id: 1, name: 'Весенние скидки 2026', channel: 'email', templateName: 'Промо весна', segment: 'Все гости', status: 'completed', recipients: 1240, sent: 1240, delivered: 1198, failed: 42, scheduledAt: '2026-02-20 10:00' },
  { id: 2, name: 'Навруз — специальное предложение', channel: 'sms', templateName: 'Навруз промо', segment: 'UZ граждане', status: 'scheduled', recipients: 856, sent: 0, delivered: 0, failed: 0, scheduledAt: '2026-03-15 09:00' },
  { id: 3, name: 'Программа лояльности', channel: 'email', templateName: 'Лояльность', segment: '3+ визита', status: 'sending', recipients: 324, sent: 198, delivered: 190, failed: 8, scheduledAt: '2026-02-25 14:00' },
  { id: 4, name: 'Летний сезон ранее бронирование', channel: 'email', templateName: 'Раннее бронирование', segment: 'Все гости', status: 'draft', recipients: 0, sent: 0, delivered: 0, failed: 0, scheduledAt: '' },
  { id: 5, name: 'Отзыв — SMS рассылка', channel: 'sms', templateName: 'Запрос отзыва', segment: 'Выехали за 7 дней', status: 'completed', recipients: 412, sent: 412, delivered: 389, failed: 23, scheduledAt: '2026-02-18 11:00' },
];

const mockSentMessages: SentMessage[] = [
  { id: 1, time: '25.02.2026 21:34', channel: 'sms', recipient: '+998 90 123 4567', template: 'Подтверждение брони', status: 'delivered', hotel: 'Sardoba Termiz' },
  { id: 2, time: '25.02.2026 21:20', channel: 'email', recipient: 'ivanov@mail.ru', template: 'Благодарность за проживание', status: 'delivered', hotel: 'Sardoba Bukhara' },
  { id: 3, time: '25.02.2026 20:55', channel: 'sms', recipient: '+998 91 987 6543', template: 'Pre-arrival напоминание', status: 'delivered', hotel: 'Sardoba Termiz' },
  { id: 4, time: '25.02.2026 20:30', channel: 'sms', recipient: '+998 93 456 7890', template: 'Подтверждение брони', status: 'failed', hotel: 'Sardoba Samarkand' },
  { id: 5, time: '25.02.2026 19:45', channel: 'email', recipient: 'petrov@gmail.com', template: 'Поздравление с ДР', status: 'delivered', hotel: 'Sardoba Bukhara' },
  { id: 6, time: '25.02.2026 19:12', channel: 'sms', recipient: '+998 90 111 2233', template: 'Квитанция об оплате', status: 'delivered', hotel: 'Sardoba Termiz' },
  { id: 7, time: '25.02.2026 18:50', channel: 'email', recipient: 'kim@yahoo.com', template: 'Благодарность за проживание', status: 'pending', hotel: 'Sardoba Samarkand' },
  { id: 8, time: '25.02.2026 18:30', channel: 'sms', recipient: '+998 94 333 4455', template: 'Pre-arrival напоминание', status: 'delivered', hotel: 'Sardoba Bukhara' },
  { id: 9, time: '25.02.2026 17:58', channel: 'email', recipient: 'guest@outlook.com', template: 'Запрос отзыва', status: 'delivered', hotel: 'Sardoba Termiz' },
  { id: 10, time: '25.02.2026 17:15', channel: 'sms', recipient: '+998 95 666 7788', template: 'Подтверждение брони', status: 'failed', hotel: 'Sardoba Samarkand' },
];

// ─── Helpers ────────────────────────────────────────────────────────

const channelBadge = (ch: Channel) =>
  ch === 'sms'
    ? 'badge badge-blue'
    : 'badge badge-purple';

const channelLabel = (ch: Channel) =>
  ch === 'sms' ? 'SMS' : 'Email';

const langLabel: Record<Lang, string> = { ru: 'RU', uz: 'UZ', en: 'EN' };

const msgStatusBadge: Record<MessageStatus, string> = {
  delivered: 'badge badge-green',
  failed: 'badge badge-red',
  pending: 'badge badge-yellow',
};

const msgStatusLabel: Record<MessageStatus, string> = {
  delivered: 'Доставлено',
  failed: 'Ошибка',
  pending: 'Ожидание',
};

const campaignStatusBadge: Record<CampaignStatus, string> = {
  draft: 'badge badge-gray',
  scheduled: 'badge badge-blue',
  sending: 'badge badge-yellow',
  completed: 'badge badge-green',
};

const campaignStatusLabel: Record<CampaignStatus, string> = {
  draft: 'Черновик',
  scheduled: 'Запланирована',
  sending: 'Отправляется',
  completed: 'Завершена',
};

function countSmsSegments(text: string): number {
  const len = text.length;
  if (len === 0) return 0;
  const isCyrillic = /[а-яА-ЯёЁ]/.test(text);
  if (isCyrillic) return len <= 70 ? 1 : Math.ceil(len / 67);
  return len <= 160 ? 1 : Math.ceil(len / 153);
}

function renderPreview(body: string): string {
  const vars: Record<string, string> = {
    '{guest_name}': 'Алексей Иванов',
    '{hotel_name}': 'Sardoba Bukhara',
    '{check_in}': '01.03.2026',
    '{check_out}': '05.03.2026',
    '{booking_number}': 'SB-2026-0042',
    '{check_in_time}': '14:00',
    '{hotel_address}': 'ул. Накшбанди 7, Бухара',
    '{discount}': '15',
    '{promo_code}': 'BDAY2026',
    '{amount}': '1 500 000 сум',
  };
  let result = body;
  for (const [k, v] of Object.entries(vars)) {
    result = result.split(k).join(v);
  }
  return result;
}

// ─── Component ──────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const tabs: { id: TabId; label: string; icon: typeof Bell }[] = [
    { id: 'dashboard', label: 'Дашборд', icon: BarChart3 },
    { id: 'templates', label: 'Шаблоны', icon: MessageSquare },
    { id: 'triggers', label: 'Триггеры', icon: Zap },
    { id: 'campaigns', label: 'Кампании', icon: Send },
    { id: 'reports', label: 'Отчёты', icon: PieChart },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SMS / Email уведомления</h1>
        <p className="text-sm text-gray-500 mt-1">Управление шаблонами, триггерами и массовыми рассылками</p>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'triggers' && <TriggersTab />}
      {activeTab === 'campaigns' && <CampaignsTab />}
      {activeTab === 'reports' && <ReportsTab />}
    </div>
  );
}

// ─── Tab 1: Dashboard ───────────────────────────────────────────────

function DashboardTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Send className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Отправлено сегодня</p>
            <p className="text-xl font-bold">147</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Доставлено</p>
            <p className="text-xl font-bold text-emerald-600">138</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Ошибки</p>
            <p className="text-xl font-bold text-red-600">9</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Активные триггеры</p>
            <p className="text-xl font-bold">5</p>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900 text-sm">Последние 10 сообщений</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Время</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Канал</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Получатель</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Шаблон</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Отель</th>
              </tr>
            </thead>
            <tbody>
              {mockSentMessages.map((msg) => (
                <tr key={msg.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {msg.time}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={channelBadge(msg.channel)}>
                      {msg.channel === 'sms' ? <Smartphone className="w-3 h-3 mr-1" /> : <Mail className="w-3 h-3 mr-1" />}
                      {channelLabel(msg.channel)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{msg.recipient}</td>
                  <td className="px-4 py-3">{msg.template}</td>
                  <td className="px-4 py-3">
                    <span className={msgStatusBadge[msg.status]}>{msgStatusLabel[msg.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{msg.hotel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2: Templates ───────────────────────────────────────────────

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      templates.filter(
        (t) =>
          !search ||
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.body.toLowerCase().includes(search.toLowerCase()),
      ),
    [templates, search],
  );

  function openNew() {
    setEditingTemplate({
      id: Date.now(),
      name: '',
      channel: 'sms',
      lang: 'ru',
      status: 'active',
      body: '',
    });
  }

  function saveTemplate(t: Template) {
    setTemplates((prev) => {
      const idx = prev.findIndex((p) => p.id === t.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = t;
        return next;
      }
      return [...prev, t];
    });
    setEditingTemplate(null);
  }

  function deleteTemplate(id: number) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  function toggleStatus(id: number) {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' } : t,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск шаблонов..."
            className="input-field pl-10"
          />
        </div>
        <button className="btn-primary" onClick={openNew}>
          <Plus className="w-4 h-4" />
          Новый шаблон
        </button>
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Название</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Канал</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Язык</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3">
                    <span className={channelBadge(t.channel)}>{channelLabel(t.channel)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge badge-gray">{langLabel[t.lang]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(t.id)}>
                      <span className={t.status === 'active' ? 'badge badge-green' : 'badge badge-gray'}>
                        {t.status === 'active' ? 'Активен' : 'Неактивен'}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditingTemplate(t)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-brand-600 transition-colors"
                        title="Редактировать"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Шаблоны не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingTemplate && (
        <TemplateEditorModal
          template={editingTemplate}
          onSave={saveTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
}

// ─── Template Editor Modal ──────────────────────────────────────────

function TemplateEditorModal({
  template,
  onSave,
  onClose,
}: {
  template: Template;
  onSave: (t: Template) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Template>({ ...template });

  const charCount = form.body.length;
  const segments = form.channel === 'sms' ? countSmsSegments(form.body) : 0;
  const preview = renderPreview(form.body);

  const variables = ['{guest_name}', '{hotel_name}', '{check_in}', '{check_out}', '{booking_number}', '{amount}'];

  function insertVariable(v: string) {
    setForm((prev) => ({ ...prev, body: prev.body + v }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold">{template.name ? 'Редактирование шаблона' : 'Новый шаблон'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Название шаблона"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Канал</label>
                  <select
                    className="input-field"
                    value={form.channel}
                    onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value as Channel }))}
                  >
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Язык</label>
                  <select
                    className="input-field"
                    value={form.lang}
                    onChange={(e) => setForm((p) => ({ ...p, lang: e.target.value as Lang }))}
                  >
                    <option value="ru">Русский</option>
                    <option value="uz">Узбекский</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Переменные</label>
                <div className="flex flex-wrap gap-1.5">
                  {variables.map((v) => (
                    <button
                      key={v}
                      onClick={() => insertVariable(v)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-brand-50 text-brand-700 text-xs font-mono hover:bg-brand-100 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Текст сообщения</label>
                <textarea
                  className="input-field font-mono text-sm min-h-[180px] resize-y"
                  value={form.body}
                  onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                  placeholder="Введите текст шаблона..."
                />
                <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
                  <span>{charCount} символов</span>
                  {form.channel === 'sms' && (
                    <span>
                      {segments} {segments === 1 ? 'сегмент' : segments < 5 ? 'сегмента' : 'сегментов'} SMS
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Предпросмотр</h4>
              <div className="rounded-xl border bg-gray-50 p-4 min-h-[300px]">
                {form.channel === 'sms' ? (
                  <div className="max-w-[280px] mx-auto">
                    <div className="bg-white rounded-2xl shadow-sm border p-4 relative">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                          <Smartphone className="w-4 h-4 text-brand-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">Sardoba PMS</p>
                          <p className="text-[10px] text-gray-400">SMS</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{preview || 'Введите текст шаблона...'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="bg-brand-600 px-4 py-3">
                      <p className="text-white text-sm font-medium">Sardoba PMS</p>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{preview || 'Введите текст шаблона...'}</p>
                    </div>
                    <div className="px-4 py-2 bg-gray-50 border-t">
                      <p className="text-[10px] text-gray-400">Это автоматическое сообщение. Пожалуйста, не отвечайте.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          <button className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button
            className="btn-primary"
            onClick={() => onSave(form)}
            disabled={!form.name || !form.body}
          >
            <CheckCircle2 className="w-4 h-4" />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3: Triggers ────────────────────────────────────────────────

function TriggersTab() {
  const [triggers, setTriggers] = useState<Trigger[]>(mockTriggers);

  function toggleTrigger(id: number) {
    setTriggers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)),
    );
  }

  const eventIcons: Record<string, typeof Bell> = {
    booking_confirmed: CheckCircle2,
    pre_arrival: Clock,
    check_in: ArrowUpRight,
    check_out: ArrowDownRight,
    post_stay: MessageSquare,
    payment_received: DollarSign,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Автоматические уведомления при событиях бронирования
        </p>
        <button className="btn-primary">
          <Plus className="w-4 h-4" />
          Новый триггер
        </button>
      </div>

      <div className="grid gap-3">
        {triggers.map((trigger) => {
          const Icon = eventIcons[trigger.event] || Zap;
          return (
            <div
              key={trigger.id}
              className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-opacity ${
                !trigger.enabled ? 'opacity-60' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-gray-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-gray-900 text-sm">{trigger.eventLabel}</p>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                  <p className="text-sm text-gray-600">{trigger.templateName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={channelBadge(trigger.channel)}>{channelLabel(trigger.channel)}</span>
                  <span className="badge badge-gray">
                    <Clock className="w-3 h-3 mr-1" />
                    {trigger.delay === '0' ? 'Сразу' : trigger.delay}
                  </span>
                </div>
              </div>

              <button
                onClick={() => toggleTrigger(trigger.id)}
                className="shrink-0 p-1"
                title={trigger.enabled ? 'Выключить' : 'Включить'}
              >
                {trigger.enabled ? (
                  <ToggleRight className="w-8 h-8 text-brand-600" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-gray-300" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab 4: Campaigns ───────────────────────────────────────────────

function CampaignsTab() {
  const [campaigns] = useState<Campaign[]>(mockCampaigns);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      campaigns.filter(
        (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [campaigns, search],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск кампаний..."
            className="input-field pl-10"
          />
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          Новая кампания
        </button>
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Название</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Канал</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Шаблон</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Сегмент</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Получат.</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Отпр.</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Доставл.</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Ошибки</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">
                    <span className={channelBadge(c.channel)}>{channelLabel(c.channel)}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.templateName}</td>
                  <td className="px-4 py-3 text-gray-600">{c.segment}</td>
                  <td className="px-4 py-3">
                    <span className={campaignStatusBadge[c.status]}>{campaignStatusLabel[c.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-right">{c.recipients.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{c.sent.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-medium">{c.delivered.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-600">{c.failed > 0 ? c.failed : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-brand-600 transition-colors"
                        title="Просмотр"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {c.status === 'draft' && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-emerald-600 transition-colors"
                          title="Запустить"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {c.status === 'sending' && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-amber-600 transition-colors"
                          title="Приостановить"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    <Send className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    Кампании не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreateCampaignModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

// ─── Create Campaign Modal ──────────────────────────────────────────

function CreateCampaignModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: '',
    template: '',
    channel: 'sms' as Channel,
    citizenship: 'all',
    dateFrom: '',
    dateTo: '',
    minStays: '1',
    scheduleType: 'now' as 'now' | 'scheduled',
    scheduleDate: '',
    scheduleTime: '',
  });

  const recipientCount = useMemo(() => {
    let base = 1450;
    if (form.citizenship === 'uz') base = 856;
    else if (form.citizenship === 'foreign') base = 594;
    if (Number(form.minStays) > 1) base = Math.floor(base * 0.4);
    if (form.dateFrom) base = Math.floor(base * 0.7);
    return base;
  }, [form.citizenship, form.minStays, form.dateFrom]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold">Новая кампания</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Название кампании"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Канал</label>
              <select
                className="input-field"
                value={form.channel}
                onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value as Channel }))}
              >
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Шаблон</label>
              <select
                className="input-field"
                value={form.template}
                onChange={(e) => setForm((p) => ({ ...p, template: e.target.value }))}
              >
                <option value="">Выберите шаблон</option>
                {mockTemplates
                  .filter((t) => t.channel === form.channel && t.status === 'active')
                  .map((t) => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
              </select>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Сегмент получателей
            </h4>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Гражданство</label>
              <select
                className="input-field"
                value={form.citizenship}
                onChange={(e) => setForm((p) => ({ ...p, citizenship: e.target.value }))}
              >
                <option value="all">Все</option>
                <option value="uz">Узбекистан</option>
                <option value="foreign">Иностранцы</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Дата от</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.dateFrom}
                  onChange={(e) => setForm((p) => ({ ...p, dateFrom: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Дата до</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.dateTo}
                  onChange={(e) => setForm((p) => ({ ...p, dateTo: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Мин. визитов</label>
              <select
                className="input-field"
                value={form.minStays}
                onChange={(e) => setForm((p) => ({ ...p, minStays: e.target.value }))}
              >
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="5">5+</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Users className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-medium text-brand-700">{recipientCount.toLocaleString()} получателей</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Когда отправить</label>
            <div className="flex gap-3">
              <button
                className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                  form.scheduleType === 'now'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setForm((p) => ({ ...p, scheduleType: 'now' }))}
              >
                Отправить сейчас
              </button>
              <button
                className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                  form.scheduleType === 'scheduled'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setForm((p) => ({ ...p, scheduleType: 'scheduled' }))}
              >
                Запланировать
              </button>
            </div>
            {form.scheduleType === 'scheduled' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <input
                  type="date"
                  className="input-field"
                  value={form.scheduleDate}
                  onChange={(e) => setForm((p) => ({ ...p, scheduleDate: e.target.value }))}
                />
                <input
                  type="time"
                  className="input-field"
                  value={form.scheduleTime}
                  onChange={(e) => setForm((p) => ({ ...p, scheduleTime: e.target.value }))}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          <button className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button className="btn-primary" disabled={!form.name || !form.template}>
            <Send className="w-4 h-4" />
            {form.scheduleType === 'now' ? 'Отправить' : 'Запланировать'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 5: Reports ─────────────────────────────────────────────────

function ReportsTab() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');

  const reportData: Record<'today' | 'week' | 'month', {
    total: number; delivered: number; failed: number;
    sms: { sent: number; delivered: number; cost: number };
    email: { sent: number; delivered: number };
  }> = {
    today: {
      total: 147, delivered: 138, failed: 9,
      sms: { sent: 89, delivered: 84, cost: 178000 },
      email: { sent: 58, delivered: 54 },
    },
    week: {
      total: 1024, delivered: 976, failed: 48,
      sms: { sent: 612, delivered: 589, cost: 1224000 },
      email: { sent: 412, delivered: 387 },
    },
    month: {
      total: 4350, delivered: 4128, failed: 222,
      sms: { sent: 2610, delivered: 2498, cost: 5220000 },
      email: { sent: 1740, delivered: 1630 },
    },
  };

  const data = reportData[period];
  const deliveryRate = ((data.delivered / data.total) * 100).toFixed(1);
  const smsRate = ((data.sms.delivered / data.sms.sent) * 100).toFixed(1);
  const emailRate = ((data.email.delivered / data.email.sent) * 100).toFixed(1);

  const periodLabels: Record<string, string> = { today: 'Сегодня', week: 'Неделя', month: 'Месяц' };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {(['today', 'week', 'month'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? 'bg-brand-600 text-white'
                : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Send className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Всего отправлено</p>
            <p className="text-xl font-bold">{data.total.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Доставлено</p>
            <p className="text-xl font-bold text-emerald-600">{data.delivered.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Ошибки</p>
            <p className="text-xl font-bold text-red-600">{data.failed.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Доставляемость</p>
            <p className="text-xl font-bold text-brand-600">{deliveryRate}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">SMS</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Отправлено</span>
              <span className="font-medium">{data.sms.sent.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Доставлено</span>
              <span className="font-medium text-emerald-600">{data.sms.delivered.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Доставляемость</span>
              <span className="font-medium text-brand-600">{smsRate}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${smsRate}%` }}
              />
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Стоимость
                </span>
                <span className="font-medium">{(data.sms.cost).toLocaleString()} сум</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">~{Math.round(data.sms.cost / data.sms.sent).toLocaleString()} сум / SMS</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Email</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Отправлено</span>
              <span className="font-medium">{data.email.sent.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Доставлено</span>
              <span className="font-medium text-emerald-600">{data.email.delivered.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Доставляемость</span>
              <span className="font-medium text-brand-600">{emailRate}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${emailRate}%` }}
              />
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Стоимость
                </span>
                <span className="font-medium text-emerald-600">Бесплатно</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Transactional email через SMTP</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Сводка по каналам за {periodLabels[period].toLowerCase()}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="3"
                  strokeDasharray={`${(data.sms.sent / data.total) * 88} 88`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold">{Math.round((data.sms.sent / data.total) * 100)}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">SMS</p>
              <p className="text-xs text-gray-500">{data.sms.sent.toLocaleString()} из {data.total.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="14" fill="none" stroke="#a855f7" strokeWidth="3"
                  strokeDasharray={`${(data.email.sent / data.total) * 88} 88`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold">{Math.round((data.email.sent / data.total) * 100)}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Email</p>
              <p className="text-xs text-gray-500">{data.email.sent.toLocaleString()} из {data.total.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
