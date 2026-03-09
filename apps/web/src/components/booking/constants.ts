/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS & LABELS for the booking page
   ═══════════════════════════════════════════════════════════════════════════ */

export const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  ac: 'Кондиционер',
  tv: 'ТВ',
  fridge: 'Холодильник',
  balcony: 'Балкон',
  view: 'Вид',
  bathtub: 'Ванна',
  shower: 'Душ',
  safe: 'Сейф',
  minibar: 'Мини-бар',
  kettle: 'Чайник',
};

export const ROOM_TYPE_LABELS: Record<string, string> = {
  single: 'Одноместный',
  double: 'Двухместный',
  family: 'Семейный',
  suite: 'Люкс',
  dorm: 'Общий',
};

export const PRICE_TYPE_LABELS: Record<string, string> = {
  per_booking: 'за бронь',
  per_night: 'за ночь',
  per_person: 'за гостя',
};
