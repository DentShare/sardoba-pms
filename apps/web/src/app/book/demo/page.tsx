'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/utils/money';
import { getNights } from '@/lib/utils/dates';

const DEMO_HOTEL = {
  name: 'Отель Малика Самарканд',
  city: 'Самарканд',
  address: 'ул. Регистан, 1',
  phone: '+998 90 123 45 67',
  currency: 'UZS',
  checkin_time: '14:00',
  checkout_time: '12:00',
  description:
    'Бутик-отель в самом сердце древнего Самарканда, в нескольких шагах от площади Регистан. Сочетание традиционного узбекского гостеприимства и современного комфорта. К услугам гостей — просторные номера с видом на город, ресторан с национальной кухней и терраса на крыше.\n\nОтель был основан в 2005 году и с тех пор принял более 50 000 гостей со всего мира.',
  cover_photo: null as string | null,
  photos: [] as string[],
  rooms: [
    {
      id: 1,
      name: 'Стандарт одноместный',
      room_type: 'single',
      capacity_adults: 1,
      capacity_children: 0,
      base_price: 35000000,
      amenities: ['wifi', 'ac', 'tv', 'shower'],
      description: 'Уютный номер площадью 18 кв.м с видом на внутренний дворик. Идеален для путешественников, ценящих комфорт.',
      photos: [] as string[],
    },
    {
      id: 2,
      name: 'Стандарт двухместный',
      room_type: 'double',
      capacity_adults: 2,
      capacity_children: 1,
      base_price: 50000000,
      amenities: ['wifi', 'ac', 'tv', 'fridge', 'shower', 'safe'],
      description: 'Просторный номер площадью 25 кв.м с двуспальной кроватью. Вид на сад отеля.',
      photos: [] as string[],
    },
    {
      id: 3,
      name: 'Семейный номер',
      room_type: 'family',
      capacity_adults: 2,
      capacity_children: 2,
      base_price: 75000000,
      amenities: ['wifi', 'ac', 'tv', 'fridge', 'balcony', 'bathtub', 'safe', 'minibar'],
      description: 'Просторный номер площадью 35 кв.м с отдельной зоной для детей. Балкон с панорамным видом.',
      photos: [] as string[],
    },
    {
      id: 4,
      name: 'Люкс «Регистан»',
      room_type: 'suite',
      capacity_adults: 2,
      capacity_children: 1,
      base_price: 120000000,
      amenities: ['wifi', 'ac', 'tv', 'fridge', 'balcony', 'view', 'bathtub', 'safe', 'minibar', 'kettle'],
      description: 'Роскошный номер площадью 50 кв.м с гостиной зоной и видом на площадь Регистан.',
      photos: [] as string[],
    },
  ],
  extras: [
    { id: 1, name: 'Завтрак «шведский стол»', description: 'Блюда узбекской и европейской кухни', price: 8000000, price_type: 'per_person' as 'per_booking' | 'per_night' | 'per_person', icon: null },
    { id: 2, name: 'Трансфер из аэропорта', description: 'Встреча в аэропорту и доставка в отель', price: 15000000, price_type: 'per_booking' as 'per_booking' | 'per_night' | 'per_person', icon: null },
    { id: 3, name: 'Экскурсия по Самарканду', description: 'Обзорная экскурсия с гидом на полдня', price: 25000000, price_type: 'per_booking' as 'per_booking' | 'per_night' | 'per_person', icon: null },
    { id: 4, name: 'Поздний выезд до 18:00', description: 'Продление проживания до вечера', price: 20000000, price_type: 'per_booking' as 'per_booking' | 'per_night' | 'per_person', icon: null },
  ],
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi', ac: 'Кондиционер', tv: 'ТВ', fridge: 'Холодильник',
  balcony: 'Балкон', view: 'Вид', bathtub: 'Ванна', shower: 'Душ',
  safe: 'Сейф', minibar: 'Мини-бар', kettle: 'Чайник',
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  single: 'Одноместный', double: 'Двухместный', family: 'Семейный', suite: 'Люкс', dorm: 'Общий',
};

const PRICE_TYPE_LABELS: Record<string, string> = {
  per_booking: 'за бронь', per_night: 'за ночь', per_person: 'за гостя',
};

/* ═══ ICONS ═══ */
function IconMapPin({ className = '' }: { className?: string }) {
  return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
}
function IconClock({ className = '' }: { className?: string }) {
  return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function IconPhone({ className = '' }: { className?: string }) {
  return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
}
function IconUsers({ className = '' }: { className?: string }) {
  return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function IconChild({ className = '' }: { className?: string }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><path d="M12 8v13"/><path d="M8 21h8"/><path d="M7 13l5 3 5-3"/></svg>;
}
function IconCheck({ className = '' }: { className?: string }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function IconMinus({ className = '' }: { className?: string }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function IconPlus({ className = '' }: { className?: string }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function IconCalendar({ className = '' }: { className?: string }) {
  return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function IconMail({ className = '' }: { className?: string }) {
  return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
}
function IconUser({ className = '' }: { className?: string }) {
  return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function IconNotes({ className = '' }: { className?: string }) {
  return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
}
function IconStar({ className = '' }: { className?: string }) {
  return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
function IconBed({ className = '' }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>;
}
function IconService({ className = '' }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}
function IconChevronDown({ className = '' }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
}
function AmenityIcon({ amenity }: { amenity: string }) {
  const c = 'w-4 h-4';
  if (amenity === 'wifi') return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>;
  if (amenity === 'ac') return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v10"/><path d="M18.4 6.6L12 12"/><path d="M5.6 6.6L12 12"/><path d="M12 12v10"/><path d="M18.4 17.4L12 12"/><path d="M5.6 17.4L12 12"/></svg>;
  if (amenity === 'tv') return <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>;
  return <IconCheck className={c} />;
}

function Counter({ value, onChange, min = 0, max = 10, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-sardoba-gold hover:text-sardoba-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><IconMinus /></button>
        <span className="w-6 text-center font-semibold text-sardoba-dark">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-sardoba-gold hover:text-sardoba-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><IconPlus /></button>
      </div>
    </div>
  );
}

export default function DemoMiniSitePage() {
  const hotel = DEMO_HOTEL;
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [selectedExtras, setSelectedExtras] = useState<Record<number, number>>({});
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showMobilePrice, setShowMobilePrice] = useState(false);

  useEffect(() => {
    const handler = () => setShowMobilePrice(window.scrollY > 600);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const nights = checkIn && checkOut ? getNights(checkIn, checkOut) : 0;
  const selectedRoomData = hotel.rooms.find((r) => r.id === selectedRoom);

  const extrasTotal = Object.entries(selectedExtras).reduce((sum, [id, qty]) => {
    const extra = hotel.extras.find((e) => e.id === Number(id));
    if (!extra || qty <= 0) return sum;
    if (extra.price_type === 'per_night') return sum + extra.price * qty * Math.max(nights, 1);
    if (extra.price_type === 'per_person') return sum + extra.price * qty;
    return sum + extra.price * qty;
  }, 0);

  const roomTotal = selectedRoomData ? selectedRoomData.base_price * Math.max(nights, 1) : 0;
  const grandTotal = roomTotal + extrasTotal;

  function toggleExtra(id: number) {
    setSelectedExtras((prev) => {
      const copy = { ...prev };
      if (copy[id]) delete copy[id]; else copy[id] = 1;
      return copy;
    });
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!checkIn) errors.checkIn = 'Выберите дату заезда';
    if (!checkOut) errors.checkOut = 'Выберите дату выезда';
    if (checkIn && checkOut && getNights(checkIn, checkOut) < 1) errors.checkOut = 'Дата выезда должна быть позже заезда';
    if (!selectedRoom) errors.room = 'Выберите номер';
    if (!guestFirstName.trim()) errors.firstName = 'Введите имя';
    if (!guestLastName.trim()) errors.lastName = 'Введите фамилию';
    if (!guestPhone.trim()) errors.phone = 'Введите номер телефона';
    else if (!/^\+998\d{9}$/.test(guestPhone.replace(/\s/g, ''))) errors.phone = 'Формат: +998XXXXXXXXX';
    if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) errors.email = 'Некорректный email';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitted(true);
  }

  if (submitted) {
    const bookingNumber = `BK-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
    return (
      <div className="min-h-screen bg-sardoba-cream">
        <div className="fixed inset-0 uzbek-pattern opacity-20 pointer-events-none" />
        <style>{`@keyframes drawCircle { to { stroke-dashoffset: 0; } } @keyframes drawCheck { to { stroke-dashoffset: 0; } } @keyframes confettiFall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(60px) rotate(360deg); opacity: 0; } }`}</style>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen py-12 px-4">
          <div className="w-full max-w-lg mx-auto">
            <div className="glass-card-light overflow-hidden animate-scale-in">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 py-8 px-6 text-center relative overflow-hidden">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="absolute w-2 h-2 rounded-full" style={{ backgroundColor: ['#D4A843', '#fff', '#F5E6C8', '#1E3A5F'][i % 4], left: `${10 + i * 12}%`, top: '-8px', animation: `confettiFall 1.5s ease-out ${0.2 + i * 0.15}s forwards`, opacity: 0 }} />
                ))}
                <svg className="mx-auto text-white mb-3" width="64" height="64" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="63" strokeDashoffset="63" style={{ animation: 'drawCircle 0.6s ease-out 0.2s forwards' }} />
                  <polyline points="8 12 11 15 16 9" stroke="currentColor" strokeWidth="2" strokeDasharray="20" strokeDashoffset="20" style={{ animation: 'drawCheck 0.4s ease-out 0.7s forwards' }} />
                </svg>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Бронирование подтверждено!</h1>
              </div>
              <div className="p-6 sm:p-8 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Номер бронирования</p>
                <p className="text-2xl sm:text-3xl font-bold text-sardoba-dark tracking-widest font-mono mb-4">{bookingNumber}</p>
                <div className="border-t border-dashed border-gray-200 my-6 relative">
                  <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-6 h-6 bg-sardoba-cream rounded-full" />
                  <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-6 h-6 bg-sardoba-cream rounded-full" />
                </div>
                <div className="space-y-3 text-sm text-left">
                  <div className="flex justify-between"><span className="text-gray-500">Номер</span><span className="font-semibold">{selectedRoomData?.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Даты</span><span className="font-semibold">{checkIn} — {checkOut}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ночей</span><span className="font-semibold">{nights}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Гость</span><span className="font-semibold">{guestFirstName} {guestLastName}</span></div>
                </div>
                <div className="mt-6 p-4 rounded-xl bg-sardoba-gold/10 border border-sardoba-gold/20">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-sardoba-dark">Итого</span>
                    <span className="text-2xl font-bold text-sardoba-gold">{formatMoney(grandTotal)}</span>
                  </div>
                </div>
                <div className="mt-4"><span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full"><span className="w-2 h-2 bg-green-500 rounded-full" />Подтверждено</span></div>
                <p className="mt-6 text-xs text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">Это демо-версия. В рабочей версии бронь будет сохранена в системе.</p>
              </div>
            </div>
            <div className="mt-6 text-center">
              <button onClick={() => setSubmitted(false)} className="inline-flex items-center gap-2 text-sm font-medium text-sardoba-blue hover:text-sardoba-blue-light transition-colors">Вернуться на страницу отеля</button>
            </div>
            <div className="mt-8 text-center"><p className="text-xs text-gray-400">Powered by <span className="font-semibold">Sardoba PMS</span></p></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sardoba-cream">
      {/* Demo Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-1.5 text-xs font-medium">
        ДЕМО-ВЕРСИЯ — данные не сохраняются
      </div>

      {/* Navbar */}
      <nav className="fixed top-6 left-0 right-0 z-40 nav-glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconBed className="text-sardoba-gold" />
            <span className="font-bold text-white text-lg truncate max-w-[200px] sm:max-w-none">{hotel.name}</span>
          </div>
          <a href="#booking" className="px-5 py-2 bg-sardoba-gold text-sardoba-dark font-semibold text-sm rounded-lg hover:bg-sardoba-gold-light transition-all duration-300 hover:-translate-y-0.5">Забронировать</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative h-[70vh] min-h-[500px] flex items-end">
        <div className="absolute inset-0 bg-hero-pattern" />
        <div className="absolute inset-0 bg-gradient-to-t from-sardoba-dark via-sardoba-dark/40 to-transparent" />
        <div className="absolute inset-0 uzbek-pattern opacity-10" />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-20">
          <div className="animate-slide-up">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">{hotel.name}</h1>
            <div className="flex flex-wrap gap-4 text-white/80 text-sm sm:text-base mb-6">
              <span className="flex items-center gap-1.5"><IconMapPin className="text-sardoba-gold shrink-0" />{hotel.city}, {hotel.address}</span>
              <span className="flex items-center gap-1.5"><IconPhone className="text-sardoba-gold shrink-0" />{hotel.phone}</span>
            </div>
            <div className="flex flex-wrap gap-4 text-white/70 text-sm">
              <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5"><IconClock className="text-sardoba-gold" />Заезд с {hotel.checkin_time}</span>
              <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5"><IconClock className="text-sardoba-gold" />Выезд до {hotel.checkout_time}</span>
            </div>
          </div>
          <a href="#booking" className="mt-8 inline-flex items-center gap-2 btn-gold text-base">Забронировать номер<IconChevronDown /></a>
        </div>
      </section>

      {/* ABOUT */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-sardoba-blue mb-6">Об отеле</h2>
            <p className="text-gray-600 leading-relaxed text-base sm:text-lg whitespace-pre-line">{hotel.description}</p>
          </div>
        </div>
      </section>

      {/* ROOMS */}
      <section className="py-16 sm:py-20 bg-sardoba-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-sardoba-blue mb-3">Наши номера</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Выберите номер, идеально подходящий для вашего отдыха</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {hotel.rooms.map((room) => (
              <div key={room.id} className="glass-card-light overflow-hidden group hover:shadow-card-hover transition-all duration-500 hover:-translate-y-1">
                <div className="aspect-[16/10] relative overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-sardoba-blue to-sardoba-blue-dark flex items-center justify-center">
                    <IconBed className="w-12 h-12 text-white/40" />
                  </div>
                  <span className="absolute top-3 left-3 px-3 py-1 bg-sardoba-dark/80 backdrop-blur-sm text-white text-xs font-medium rounded-full">{ROOM_TYPE_LABELS[room.room_type] || room.room_type}</span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-sardoba-dark mb-2">{room.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1"><IconUsers className="w-4 h-4" />{room.capacity_adults} взр.</span>
                    {room.capacity_children > 0 && <span className="flex items-center gap-1"><IconChild className="w-3.5 h-3.5" />{room.capacity_children} дет.</span>}
                  </div>
                  {room.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{room.description}</p>}
                  {room.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {room.amenities.slice(0, 5).map((a) => (
                        <span key={a} className="flex items-center gap-1 text-xs bg-sardoba-sand/60 text-sardoba-blue px-2 py-1 rounded-full"><AmenityIcon amenity={a} />{AMENITY_LABELS[a] || a}</span>
                      ))}
                      {room.amenities.length > 5 && <span className="text-xs text-gray-400 px-2 py-1">+{room.amenities.length - 5}</span>}
                    </div>
                  )}
                  <div className="flex items-end justify-between pt-3 border-t border-gray-100">
                    <div>
                      <span className="text-xs text-gray-400">от</span>
                      <p className="text-xl font-bold text-sardoba-gold">{formatMoney(room.base_price)}<span className="text-sm font-normal text-gray-400">/ночь</span></p>
                    </div>
                    <a href="#booking" onClick={() => setSelectedRoom(room.id)} className="px-4 py-2 bg-sardoba-blue text-white text-sm font-medium rounded-lg hover:bg-sardoba-blue-light transition-colors">Выбрать</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EXTRAS */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-sardoba-blue mb-3">Дополнительные услуги</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Сделайте ваше пребывание ещё комфортнее</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {hotel.extras.map((extra) => (
              <div key={extra.id} className="glass-card-light p-5 flex gap-4 items-start hover:shadow-card-hover transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-sardoba-gold/10 flex items-center justify-center shrink-0"><IconService className="text-sardoba-gold" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sardoba-dark text-sm">{extra.name}</h3>
                  {extra.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{extra.description}</p>}
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="font-bold text-sardoba-gold text-sm">{formatMoney(extra.price)}</span>
                    <span className="text-xs text-gray-400">{PRICE_TYPE_LABELS[extra.price_type]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOOKING FORM */}
      <section id="booking" className="py-16 sm:py-20 bg-sardoba-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-sardoba-blue mb-3">Забронировать номер</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Заполните форму ниже, и мы подтвердим ваше бронирование</p>
          </div>
          <form onSubmit={handleSubmit} className="lg:grid lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Step 1: Dates */}
              <div className="glass-card-light p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-sardoba-dark mb-4"><span className="w-7 h-7 rounded-full bg-sardoba-gold text-white text-sm flex items-center justify-center font-bold">1</span>Даты проживания</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1"><IconCalendar className="inline w-4 h-4 mr-1 text-gray-400" />Дата заезда <span className="text-red-500">*</span></label>
                    <input type="date" min={today} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut(''); }} className={cn('w-full rounded-lg border bg-white px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold', formErrors.checkIn ? 'border-red-500' : 'border-gray-300')} />
                    {formErrors.checkIn && <p className="mt-1 text-xs text-red-600">{formErrors.checkIn}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1"><IconCalendar className="inline w-4 h-4 mr-1 text-gray-400" />Дата выезда <span className="text-red-500">*</span></label>
                    <input type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={cn('w-full rounded-lg border bg-white px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold', formErrors.checkOut ? 'border-red-500' : 'border-gray-300')} />
                    {formErrors.checkOut && <p className="mt-1 text-xs text-red-600">{formErrors.checkOut}</p>}
                  </div>
                </div>
                {nights > 0 && <p className="mt-3 text-sm text-sardoba-gold font-medium">{nights} {nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей'}</p>}
              </div>

              {/* Step 2: Room */}
              <div className="glass-card-light p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-sardoba-dark mb-4"><span className="w-7 h-7 rounded-full bg-sardoba-gold text-white text-sm flex items-center justify-center font-bold">2</span>Выберите номер</h3>
                {formErrors.room && <p className="mb-3 text-xs text-red-600">{formErrors.room}</p>}
                <div className="space-y-3">
                  {hotel.rooms.map((room) => (
                    <label key={room.id} className={cn('flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300', selectedRoom === room.id ? 'border-sardoba-gold bg-sardoba-gold/5 shadow-glow-gold' : 'border-gray-200 bg-white hover:border-sardoba-gold/40')}>
                      <input type="radio" name="room" value={room.id} checked={selectedRoom === room.id} onChange={() => setSelectedRoom(room.id)} className="mt-1 w-4 h-4 text-sardoba-gold focus:ring-sardoba-gold/50 border-gray-300" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div><span className="font-semibold text-sardoba-dark">{room.name}</span><span className="ml-2 text-xs bg-sardoba-blue/10 text-sardoba-blue px-2 py-0.5 rounded-full">{ROOM_TYPE_LABELS[room.room_type]}</span></div>
                          <span className="font-bold text-sardoba-gold whitespace-nowrap">{formatMoney(room.base_price)}<span className="text-xs font-normal text-gray-400">/ночь</span></span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center gap-0.5"><IconUsers className="w-3.5 h-3.5" />{room.capacity_adults}</span>
                          {room.capacity_children > 0 && <span className="flex items-center gap-0.5"><IconChild className="w-3 h-3" />+{room.capacity_children}</span>}
                          {room.amenities.slice(0, 4).map((a) => <span key={a} className="text-gray-400">{AMENITY_LABELS[a]}</span>)}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Step 3: Guests */}
              <div className="glass-card-light p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-sardoba-dark mb-4"><span className="w-7 h-7 rounded-full bg-sardoba-gold text-white text-sm flex items-center justify-center font-bold">3</span>Гости</h3>
                <div className="space-y-4 max-w-sm">
                  <Counter label="Взрослые" value={adults} onChange={setAdults} min={1} max={selectedRoomData?.capacity_adults || 6} />
                  <Counter label="Дети" value={children} onChange={setChildren} min={0} max={selectedRoomData?.capacity_children || 4} />
                </div>
              </div>

              {/* Step 4: Extras */}
              <div className="glass-card-light p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-sardoba-dark mb-4"><span className="w-7 h-7 rounded-full bg-sardoba-gold text-white text-sm flex items-center justify-center font-bold">4</span>Дополнительные услуги</h3>
                <div className="space-y-3">
                  {hotel.extras.map((extra) => (
                    <label key={extra.id} className={cn('flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all duration-200', selectedExtras[extra.id] ? 'border-sardoba-gold bg-sardoba-gold/5' : 'border-gray-200 bg-white hover:border-gray-300')}>
                      <input type="checkbox" checked={!!selectedExtras[extra.id]} onChange={() => toggleExtra(extra.id)} className="w-4 h-4 text-sardoba-gold focus:ring-sardoba-gold/50 border-gray-300 rounded" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-sardoba-dark">{extra.name}</span>
                        {extra.description && <p className="text-xs text-gray-400 mt-0.5">{extra.description}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-sardoba-gold">{formatMoney(extra.price)}</span>
                        <span className="block text-xs text-gray-400">{PRICE_TYPE_LABELS[extra.price_type]}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Step 5: Guest info */}
              <div className="glass-card-light p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-sardoba-dark mb-4"><span className="w-7 h-7 rounded-full bg-sardoba-gold text-white text-sm flex items-center justify-center font-bold">5</span>Данные гостя</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1"><IconUser className="inline w-4 h-4 mr-1 text-gray-400" />Имя <span className="text-red-500">*</span></label>
                    <input type="text" value={guestFirstName} onChange={(e) => setGuestFirstName(e.target.value)} placeholder="Иван" className={cn('w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold', formErrors.firstName ? 'border-red-500' : 'border-gray-300')} />
                    {formErrors.firstName && <p className="mt-1 text-xs text-red-600">{formErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1"><IconUser className="inline w-4 h-4 mr-1 text-gray-400" />Фамилия <span className="text-red-500">*</span></label>
                    <input type="text" value={guestLastName} onChange={(e) => setGuestLastName(e.target.value)} placeholder="Петров" className={cn('w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold', formErrors.lastName ? 'border-red-500' : 'border-gray-300')} />
                    {formErrors.lastName && <p className="mt-1 text-xs text-red-600">{formErrors.lastName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1"><IconPhone className="inline w-4 h-4 mr-1 text-gray-400" />Телефон <span className="text-red-500">*</span></label>
                    <input type="tel" value={guestPhone} onChange={(e) => { let val = e.target.value; if (!val.startsWith('+998')) val = '+998' + val.replace(/^\+?998?/, ''); setGuestPhone(val); }} placeholder="+998 90 123 45 67" className={cn('w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold', formErrors.phone ? 'border-red-500' : 'border-gray-300')} />
                    {formErrors.phone && <p className="mt-1 text-xs text-red-600">{formErrors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1"><IconMail className="inline w-4 h-4 mr-1 text-gray-400" />Email <span className="text-gray-400 text-xs font-normal">(необязательно)</span></label>
                    <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="ivan@example.com" className={cn('w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold', formErrors.email ? 'border-red-500' : 'border-gray-300')} />
                    {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1"><IconNotes className="inline w-4 h-4 mr-1 text-gray-400" />Примечание <span className="text-gray-400 text-xs font-normal">(необязательно)</span></label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Особые пожелания, время прибытия и т.д." rows={3} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold resize-none" />
                </div>
              </div>

              {formErrors.submit && <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{formErrors.submit}</div>}
              <div className="lg:hidden"><button type="submit" className="w-full btn-gold text-base">Забронировать</button></div>
            </div>

            {/* Sticky sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-28">
                <div className="glass-card-light p-6">
                  <h3 className="text-lg font-semibold text-sardoba-dark mb-4 flex items-center gap-2"><IconStar className="text-sardoba-gold" />Ваше бронирование</h3>
                  {selectedRoomData ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Номер</span><span className="font-medium text-sardoba-dark">{selectedRoomData.name}</span></div>
                      {nights > 0 && <div className="flex justify-between"><span className="text-gray-500">Ночей</span><span className="font-medium text-sardoba-dark">{nights}</span></div>}
                      <div className="flex justify-between"><span className="text-gray-500">Гости</span><span className="font-medium text-sardoba-dark">{adults} взр.{children > 0 ? `, ${children} дет.` : ''}</span></div>
                      {checkIn && checkOut && (
                        <>
                          <div className="flex justify-between"><span className="text-gray-500">Заезд</span><span className="font-medium">{checkIn}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Выезд</span><span className="font-medium">{checkOut}</span></div>
                        </>
                      )}
                      <div className="border-t border-gray-200 pt-3 mt-3" />
                      {nights > 0 && (
                        <>
                          <div className="flex justify-between"><span className="text-gray-500">Номер ({nights} ноч.)</span><span className="font-medium">{formatMoney(roomTotal)}</span></div>
                          {extrasTotal > 0 && <div className="flex justify-between"><span className="text-gray-500">Доп. услуги</span><span className="font-medium">{formatMoney(extrasTotal)}</span></div>}
                          <div className="border-t border-gray-200 pt-3 mt-3" />
                          <div className="flex justify-between items-baseline"><span className="text-base font-semibold text-sardoba-dark">Итого</span><span className="text-2xl font-bold text-sardoba-gold">{formatMoney(grandTotal)}</span></div>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-6">Выберите номер и даты для расчёта стоимости</p>
                  )}
                  <button type="submit" className="mt-6 w-full btn-gold text-base">Забронировать</button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Mobile sticky bar */}
      {showMobilePrice && selectedRoomData && nights > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-lg border-t border-gray-200 px-4 py-3 flex items-center justify-between">
          <div><span className="text-xs text-gray-500">Итого</span><p className="text-lg font-bold text-sardoba-gold">{formatMoney(grandTotal)}</p></div>
          <a href="#booking" className="px-6 py-2.5 bg-sardoba-gold text-sardoba-dark font-semibold text-sm rounded-lg">Забронировать</a>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-sardoba-dark py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold text-white mb-3">{hotel.name}</h3>
              <p className="text-gray-400 text-sm">{hotel.city}, {hotel.address}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Контакты</h4>
              <p className="text-gray-400 text-sm flex items-center gap-2 mb-1"><IconPhone className="text-sardoba-gold w-4 h-4" />{hotel.phone}</p>
              <p className="text-gray-400 text-sm flex items-center gap-2"><IconClock className="text-sardoba-gold w-4 h-4" />Заезд {hotel.checkin_time} / Выезд {hotel.checkout_time}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <p className="text-gray-500 text-xs">Работает на</p>
              <p className="text-sm font-bold text-white mt-1">Sardoba <span className="text-sardoba-gold">PMS</span></p>
              <p className="text-gray-500 text-xs mt-1">Современная система управления отелем</p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-gray-500">Powered by Sardoba PMS</div>
        </div>
      </footer>
    </div>
  );
}
