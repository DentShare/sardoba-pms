import { formatMoney, formatDateRu, formatDateShort } from '@sardoba/shared';
import { Booking } from '@/database/entities/booking.entity';
import { Guest } from '@/database/entities/guest.entity';
import { Room } from '@/database/entities/room.entity';
import { Payment } from '@/database/entities/payment.entity';

// ── Source labels ───────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  direct: 'Прямое',
  booking_com: 'Booking.com',
  airbnb: 'Airbnb',
  expedia: 'Expedia',
  phone: 'По телефону',
  other: 'Другое',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перевод',
  payme: 'Payme',
  click: 'Click',
  other: 'Другое',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Новое',
  confirmed: 'Подтверждено',
  checked_in: 'Заселён',
  checked_out: 'Выселен',
  cancelled: 'Отменено',
  no_show: 'Неявка',
};

// ── Templates ──────────────────────────────────────────────────────────────

/**
 * New booking notification template.
 */
export function newBookingTemplate(
  booking: Booking,
  guest: Guest,
  room: Room,
): string {
  const guestName = `${guest.firstName} ${guest.lastName}`;
  const total = formatMoney(Number(booking.totalAmount));
  const source = SOURCE_LABELS[booking.source] ?? booking.source;
  const checkIn = formatDateRu(booking.checkIn);
  const checkOut = formatDateRu(booking.checkOut);

  return [
    `<b>Новое бронирование #${booking.bookingNumber}</b>`,
    ``,
    `<b>Гость:</b> ${escapeHtml(guestName)}`,
    guest.phone ? `<b>Тел:</b> ${escapeHtml(guest.phone)}` : null,
    `<b>Номер:</b> ${escapeHtml(room.name)} (${room.roomType})`,
    `<b>Заезд:</b> ${checkIn}`,
    `<b>Выезд:</b> ${checkOut}`,
    `<b>Ночей:</b> ${booking.nights}`,
    `<b>Гости:</b> ${booking.adults} взр.${booking.children > 0 ? ` + ${booking.children} дет.` : ''}`,
    `<b>Сумма:</b> ${total}`,
    `<b>Источник:</b> ${source}`,
    booking.notes ? `<b>Примечание:</b> ${escapeHtml(booking.notes)}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Cancellation notification template.
 */
export function cancellationTemplate(booking: Booking): string {
  const checkIn = formatDateShort(booking.checkIn);
  const checkOut = formatDateShort(booking.checkOut);
  const total = formatMoney(Number(booking.totalAmount));

  return [
    `<b>Отмена бронирования #${booking.bookingNumber}</b>`,
    ``,
    `<b>Даты:</b> ${checkIn} — ${checkOut} (${booking.nights} ноч.)`,
    `<b>Сумма:</b> ${total}`,
    booking.cancelReason
      ? `<b>Причина:</b> ${escapeHtml(booking.cancelReason)}`
      : null,
    ``,
    `<i>Номер освобождён для новых бронирований.</i>`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Payment received notification template.
 */
export function paymentReceivedTemplate(
  booking: Booking,
  payment: Payment,
): string {
  const paymentAmount = formatMoney(Number(payment.amount));
  const totalAmount = formatMoney(Number(booking.totalAmount));
  const paidAmount = formatMoney(Number(booking.paidAmount));
  const remaining = Number(booking.totalAmount) - Number(booking.paidAmount);
  const remainingFormatted = formatMoney(remaining);
  const method = METHOD_LABELS[payment.method] ?? payment.method;

  return [
    `<b>Оплата получена</b>`,
    ``,
    `<b>Бронь:</b> #${booking.bookingNumber}`,
    `<b>Сумма платежа:</b> ${paymentAmount}`,
    `<b>Способ:</b> ${method}`,
    payment.reference
      ? `<b>Референс:</b> ${escapeHtml(payment.reference)}`
      : null,
    ``,
    `<b>Итого:</b> ${totalAmount}`,
    `<b>Оплачено:</b> ${paidAmount}`,
    remaining > 0
      ? `<b>Остаток:</b> ${remainingFormatted}`
      : `<i>Полностью оплачено</i>`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Channel sync error notification template.
 */
export function syncErrorTemplate(
  channelType: string,
  error: string,
): string {
  const timestamp = new Date().toLocaleString('ru-RU', {
    timeZone: 'Asia/Tashkent',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return [
    `<b>Ошибка синхронизации</b>`,
    ``,
    `<b>Канал:</b> ${escapeHtml(channelType)}`,
    `<b>Ошибка:</b> ${escapeHtml(error)}`,
    `<b>Время:</b> ${timestamp}`,
    ``,
    `<i>Проверьте настройки канала и повторите попытку.</i>`,
  ].join('\n');
}

/**
 * Daily digest notification template.
 */
export interface DailyDigestData {
  propertyName: string;
  date: string;
  checkIns: Array<{
    bookingNumber: string;
    guestName: string;
    roomName: string;
    nights: number;
  }>;
  checkOuts: Array<{
    bookingNumber: string;
    guestName: string;
    roomName: string;
  }>;
  occupiedRooms: number;
  totalRooms: number;
  occupancyPercent: number;
  todayRevenue: number;
  inHouseGuests: number;
}

export function dailyDigestTemplate(data: DailyDigestData): string {
  const dateStr = formatDateRu(data.date);
  const revenue = formatMoney(data.todayRevenue);

  const lines: string[] = [
    `<b>Утренний дайджест — ${dateStr}</b>`,
    `<b>${escapeHtml(data.propertyName)}</b>`,
    ``,
    `<b>Загрузка:</b> ${data.occupiedRooms}/${data.totalRooms} номеров (${data.occupancyPercent}%)`,
    `<b>Гостей в отеле:</b> ${data.inHouseGuests}`,
    `<b>Выручка за день:</b> ${revenue}`,
  ];

  // Check-ins
  if (data.checkIns.length > 0) {
    lines.push(``, `<b>Заезды сегодня (${data.checkIns.length}):</b>`);
    for (const ci of data.checkIns) {
      lines.push(
        `  ${ci.bookingNumber} — ${escapeHtml(ci.guestName)}, ${escapeHtml(ci.roomName)}, ${ci.nights} ноч.`,
      );
    }
  } else {
    lines.push(``, `<b>Заезды сегодня:</b> нет`);
  }

  // Check-outs
  if (data.checkOuts.length > 0) {
    lines.push(``, `<b>Выезды сегодня (${data.checkOuts.length}):</b>`);
    for (const co of data.checkOuts) {
      lines.push(
        `  ${co.bookingNumber} — ${escapeHtml(co.guestName)}, ${escapeHtml(co.roomName)}`,
      );
    }
  } else {
    lines.push(``, `<b>Выезды сегодня:</b> нет`);
  }

  return lines.join('\n');
}

/**
 * Test message template.
 */
export function testMessageTemplate(propertyName: string): string {
  const timestamp = new Date().toLocaleString('ru-RU', {
    timeZone: 'Asia/Tashkent',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return [
    `<b>Тестовое сообщение</b>`,
    ``,
    `Sardoba PMS — ${escapeHtml(propertyName)}`,
    `Уведомления настроены корректно.`,
    ``,
    `<i>${timestamp}</i>`,
  ].join('\n');
}

// ── Housekeeping labels ─────────────────────────────────────────────────────

const TASK_TYPE_LABELS: Record<string, string> = {
  standard: 'Стандартная уборка',
  checkout: 'Checkout уборка',
  deep: 'Генеральная уборка',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Низкий',
  normal: 'Средний',
  high: 'Высокий',
  urgent: 'Срочный',
};

const ROOM_STATUS_LABELS: Record<string, string> = {
  clean: 'Чисто',
  dirty: 'Грязно',
  cleaning: 'Уборка',
  inspection: 'Проверка',
  do_not_disturb: 'Не беспокоить',
  out_of_order: 'Не в работе',
};

// ── Housekeeping templates ─────────────────────────────────────────────────

/**
 * New housekeeping task created notification template.
 */
export function housekeepingTaskCreatedTemplate(data: {
  roomName: string;
  roomType: string;
  taskType: 'standard' | 'checkout' | 'deep';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string;
  notes?: string;
}): string {
  const taskTypeLabel = TASK_TYPE_LABELS[data.taskType] ?? data.taskType;
  const priorityLabel = PRIORITY_LABELS[data.priority] ?? data.priority;

  return [
    `<b>🧹 Новая задача уборки</b>`,
    ``,
    `<b>Номер:</b> ${escapeHtml(data.roomName)} (${escapeHtml(data.roomType)})`,
    `<b>Тип:</b> ${taskTypeLabel}`,
    `<b>Приоритет:</b> ${priorityLabel}`,
    data.assignedTo ? `<b>Назначена:</b> ${escapeHtml(data.assignedTo)}` : null,
    data.notes ? `<b>Примечание:</b> ${escapeHtml(data.notes)}` : null,
    ``,
    `<i>Ожидает выполнения.</i>`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Housekeeping task assigned to maid notification template.
 */
export function housekeepingTaskAssignedTemplate(data: {
  roomName: string;
  taskType: string;
  maidName: string;
  priority: string;
  notes?: string;
}): string {
  const taskTypeLabel = TASK_TYPE_LABELS[data.taskType] ?? data.taskType;
  const priorityLabel = PRIORITY_LABELS[data.priority] ?? data.priority;

  return [
    `<b>👤 Задача назначена</b>`,
    ``,
    `<b>Номер:</b> ${escapeHtml(data.roomName)}`,
    `<b>Тип:</b> ${taskTypeLabel}`,
    `<b>Горничная:</b> ${escapeHtml(data.maidName)}`,
    `<b>Приоритет:</b> ${priorityLabel}`,
    data.notes ? `<b>Примечание:</b> ${escapeHtml(data.notes)}` : null,
    ``,
    `<i>Пожалуйста, приступите к уборке.</i>`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Housekeeping task completed notification template.
 */
export function housekeepingTaskCompletedTemplate(data: {
  roomName: string;
  taskType: string;
  maidName: string;
  durationMinutes: number;
}): string {
  const taskTypeLabel = TASK_TYPE_LABELS[data.taskType] ?? data.taskType;

  return [
    `<b>✅ Уборка завершена</b>`,
    ``,
    `<b>Номер:</b> ${escapeHtml(data.roomName)}`,
    `<b>Тип:</b> ${taskTypeLabel}`,
    `<b>Горничная:</b> ${escapeHtml(data.maidName)}`,
    `<b>Время:</b> ${data.durationMinutes} мин`,
    ``,
    `<i>Номер готов к проверке.</i>`,
  ].join('\n');
}

/**
 * Room status changed notification template.
 */
export function housekeepingRoomStatusChangedTemplate(data: {
  roomName: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
}): string {
  const oldLabel = ROOM_STATUS_LABELS[data.oldStatus] ?? data.oldStatus;
  const newLabel = ROOM_STATUS_LABELS[data.newStatus] ?? data.newStatus;

  return [
    `<b>🚪 Статус номера изменён</b>`,
    ``,
    `<b>Номер:</b> ${escapeHtml(data.roomName)}`,
    `<b>Было:</b> ${oldLabel}`,
    `<b>Стало:</b> ${newLabel}`,
    `<b>Кем:</b> ${escapeHtml(data.changedBy)}`,
  ].join('\n');
}

/**
 * Daily housekeeping report notification template.
 */
export function housekeepingDailyReportTemplate(data: {
  propertyName: string;
  date: string;
  totalRooms: number;
  cleanRooms: number;
  dirtyRooms: number;
  cleaningRooms: number;
  tasksTotal: number;
  tasksCompleted: number;
  topMaids: Array<{ name: string; completed: number }>;
}): string {
  const dateStr = formatDateRu(data.date);
  const percent =
    data.tasksTotal > 0
      ? Math.round((data.tasksCompleted / data.tasksTotal) * 100)
      : 0;

  const lines: string[] = [
    `<b>📊 Отчёт Housekeeping — ${dateStr}</b>`,
    `<b>${escapeHtml(data.propertyName)}</b>`,
    ``,
    `<b>Номера:</b> ${data.totalRooms}`,
    `  ✅ Чистые: ${data.cleanRooms}`,
    `  ❌ Грязные: ${data.dirtyRooms}`,
    `  🧹 На уборке: ${data.cleaningRooms}`,
    ``,
    `<b>Задачи:</b> ${data.tasksCompleted}/${data.tasksTotal} выполнено (${percent}%)`,
    ``,
    `<b>Топ горничных:</b>`,
  ];

  data.topMaids.forEach((maid, idx) => {
    lines.push(`  ${idx + 1}. ${escapeHtml(maid.name)} — ${maid.completed} задач`);
  });

  return lines.join('\n');
}

// ── Phase 5: Automated Notification Templates ──────────────────────────────

/**
 * Booking confirmed fallback template (Telegram).
 * Used when WhatsApp delivery fails for Feature #2.
 */
export function bookingConfirmedFallbackTemplate(data: {
  bookingNumber: string;
  guestName: string;
  guestPhone: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  checkinTime: string;
  checkoutTime: string;
  propertyName: string;
}): string {
  return [
    `<b>✅ Бронь подтверждена — WhatsApp не доставлен</b>`,
    ``,
    `<b>Бронь:</b> #${escapeHtml(data.bookingNumber)}`,
    `<b>Гость:</b> ${escapeHtml(data.guestName)}`,
    data.guestPhone ? `<b>Тел:</b> ${escapeHtml(data.guestPhone)}` : null,
    `<b>Номер:</b> ${escapeHtml(data.roomName)}`,
    `<b>Заезд:</b> ${data.checkIn} (с ${data.checkinTime})`,
    `<b>Выезд:</b> ${data.checkOut} (до ${data.checkoutTime})`,
    `<b>Отель:</b> ${escapeHtml(data.propertyName)}`,
    ``,
    `<i>WhatsApp сообщение гостю не доставлено. Рекомендуем связаться вручную.</i>`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Upsell pre-arrival fallback template (Telegram).
 * Used when WhatsApp delivery fails for Feature #4.
 */
export function upsellPreArrivalFallbackTemplate(data: {
  bookingNumber: string;
  guestName: string;
  guestPhone: string;
  roomName: string;
  checkinTime: string;
  extrasList: string;
  propertyName: string;
}): string {
  return [
    `<b>🌟 Upsell — WhatsApp не доставлен</b>`,
    ``,
    `<b>Бронь:</b> #${escapeHtml(data.bookingNumber)}`,
    `<b>Гость:</b> ${escapeHtml(data.guestName)}`,
    data.guestPhone ? `<b>Тел:</b> ${escapeHtml(data.guestPhone)}` : null,
    `<b>Номер:</b> ${escapeHtml(data.roomName)}`,
    `<b>Заезд завтра в</b> ${data.checkinTime}`,
    ``,
    `<b>Доп. услуги для предложения:</b>`,
    escapeHtml(data.extrasList),
    ``,
    `<i>WhatsApp сообщение гостю не доставлено. Рекомендуем предложить услуги при заезде.</i>`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Review request fallback template (Telegram).
 * Used when WhatsApp delivery fails for Feature #5.
 */
export function reviewRequestFallbackTemplate(data: {
  bookingNumber: string;
  guestName: string;
  guestPhone: string;
  propertyName: string;
  reviewLinks: string;
}): string {
  return [
    `<b>🙏 Запрос отзыва — WhatsApp не доставлен</b>`,
    ``,
    `<b>Бронь:</b> #${escapeHtml(data.bookingNumber)}`,
    `<b>Гость:</b> ${escapeHtml(data.guestName)}`,
    data.guestPhone ? `<b>Тел:</b> ${escapeHtml(data.guestPhone)}` : null,
    `<b>Отель:</b> ${escapeHtml(data.propertyName)}`,
    ``,
    `<b>Ссылки для отзыва:</b>`,
    escapeHtml(data.reviewLinks),
    ``,
    `<i>WhatsApp сообщение гостю не доставлено. Рекомендуем отправить ссылку вручную.</i>`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Birthday alert template (Telegram).
 * Sent to property owner 3 days before guest's birthday. Feature #10.
 */
export function birthdayAlertTemplate(data: {
  firstName: string;
  lastName: string;
  birthday: string;
  phone: string;
  visitCount: number;
  lastVisit: string;
}): string {
  return [
    `<b>🎂 День рождения гостя через 3 дня!</b>`,
    ``,
    `<b>👤</b> ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}`,
    `<b>📅 Дата рождения:</b> ${data.birthday}`,
    `<b>📞</b> ${escapeHtml(data.phone)}`,
    `<b>🏨 Был у вас:</b> ${data.visitCount} раз (последний: ${data.lastVisit})`,
    ``,
    `<b>💡 Идеи:</b> поздравить по WhatsApp, приготовить сюрприз при заезде`,
  ].join('\n');
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Escape HTML special characters for Telegram HTML parse mode.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
