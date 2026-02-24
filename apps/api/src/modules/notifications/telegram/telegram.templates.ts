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
