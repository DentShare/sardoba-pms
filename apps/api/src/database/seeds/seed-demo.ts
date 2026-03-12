import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Property } from '../entities/property.entity';
import { User } from '../entities/user.entity';
import { Room } from '../entities/room.entity';
import { Guest } from '../entities/guest.entity';
import { Rate } from '../entities/rate.entity';
import { Booking } from '../entities/booking.entity';
import { Payment } from '../entities/payment.entity';
import { BookingHistory } from '../entities/booking-history.entity';
import { NotificationSettings } from '../entities/notification-settings.entity';
import { PropertyExtra } from '../entities/property-extra.entity';
import { BookingExtra } from '../entities/booking-extra.entity';
import { PromoCode } from '../entities/promo-code.entity';
import { CleaningTask } from '../entities/cleaning-task.entity';
import { Agency } from '../entities/agency.entity';
import { GroupBooking } from '../entities/group-booking.entity';
import { GroupBookingRoom } from '../entities/group-booking-room.entity';
import { HolidayRule } from '../entities/holiday-rule.entity';

/**
 * Demo seed — creates a rich hotel with all features populated.
 * Usage: DATABASE_URL=<url> npx ts-node apps/api/src/database/seeds/seed-demo.ts
 */

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sardoba_dev',
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  synchronize: false,
});

const hash = (pw: string) => bcrypt.hash(pw, 12);

function bkNum(year: number, seq: number): string {
  return `BK-${year}-${String(seq).padStart(4, '0')}`;
}

function dateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function groupNum(seq: number): string {
  return `GR-2026-${String(seq).padStart(3, '0')}`;
}

async function seed(): Promise<void> {
  await dataSource.initialize();
  console.log('Connected. Starting demo seed...\n');

  const qr = dataSource.createQueryRunner();
  await qr.startTransaction();

  try {
    // ════════════════════════════════════════════════════════════════════════
    // 1. PROPERTY
    // ════════════════════════════════════════════════════════════════════════
    const prop = await dataSource.getRepository(Property).save({
      name: 'Sardoba Boutique Hotel',
      city: 'Samarkand',
      address: 'ул. Регистан, 15, Самарканд 140100',
      phone: '+998901234567',
      currency: 'UZS',
      timezone: 'Asia/Tashkent',
      locale: 'ru',
      checkinTime: '14:00',
      checkoutTime: '12:00',
      settings: { theme: 'default' },
      slug: 'sardoba-boutique',
      description:
        'Бутик-отель в самом сердце Самарканда, в 5 минутах ходьбы от площади Регистан. ' +
        '12 современных номеров, ресторан с узбекской и европейской кухней, ' +
        'терраса с видом на Шахи-Зинда. Бесплатный Wi-Fi, трансфер, экскурсии.',
      descriptionUz:
        'Samarqand markazida, Registon maydonidan 5 daqiqalik masofada joylashgan butik mehmonxona.',
      coverPhoto: null,
      photos: [],
      bookingEnabled: true,
      widgetEnabled: true,
      miniSiteEnabled: true,
    });
    console.log(`✓ Property: ${prop.name} (id=${prop.id})`);

    // ════════════════════════════════════════════════════════════════════════
    // 2. USERS
    // ════════════════════════════════════════════════════════════════════════
    const userRepo = dataSource.getRepository(User);
    const owner = await userRepo.save({
      propertyId: prop.id,
      name: 'Азиз Каримов',
      email: 'demo@sardoba.uz',
      passwordHash: await hash('Demo123!'),
      role: 'owner' as const,
      isActive: true,
    });
    const admin = await userRepo.save({
      propertyId: prop.id,
      name: 'Дильнора Рахимова',
      email: 'manager@sardoba.uz',
      passwordHash: await hash('Manager123!'),
      role: 'admin' as const,
      isActive: true,
    });
    const viewer = await userRepo.save({
      propertyId: prop.id,
      name: 'Шахноза Усманова',
      email: 'reception@demo.uz',
      passwordHash: await hash('Reception123!'),
      role: 'viewer' as const,
      isActive: true,
    });
    console.log(`✓ Users: owner(${owner.id}), admin(${admin.id}), viewer(${viewer.id})`);

    // ════════════════════════════════════════════════════════════════════════
    // 3. ROOMS (12)
    // ════════════════════════════════════════════════════════════════════════
    const roomRepo = dataSource.getRepository(Room);
    const roomsDef = [
      // Floor 1
      { name: '101 — Стандарт Single',   roomType: 'single', floor: 1, adults: 1, children: 0, price: 35000000,  amenities: ['wifi','ac','tv','shower'],                          sort: 1  },
      { name: '102 — Стандарт Double',    roomType: 'double', floor: 1, adults: 2, children: 1, price: 50000000,  amenities: ['wifi','ac','tv','shower','fridge'],                 sort: 2  },
      { name: '103 — Стандарт Double',    roomType: 'double', floor: 1, adults: 2, children: 1, price: 50000000,  amenities: ['wifi','ac','tv','shower','fridge'],                 sort: 3  },
      { name: '104 — Семейный',           roomType: 'family', floor: 1, adults: 2, children: 2, price: 70000000,  amenities: ['wifi','ac','tv','shower','fridge','kettle'],        sort: 4  },
      // Floor 2
      { name: '201 — Делюкс Double',      roomType: 'double', floor: 2, adults: 2, children: 1, price: 65000000,  amenities: ['wifi','ac','tv','bathtub','fridge','minibar','safe'], sort: 5  },
      { name: '202 — Джуниор Сьют',       roomType: 'suite',  floor: 2, adults: 2, children: 1, price: 90000000,  amenities: ['wifi','ac','tv','bathtub','fridge','minibar','safe','balcony'], sort: 6  },
      { name: '203 — Семейный Делюкс',    roomType: 'family', floor: 2, adults: 2, children: 3, price: 85000000,  amenities: ['wifi','ac','tv','shower','fridge','kettle','safe'], sort: 7  },
      { name: '204 — Комфорт Double',     roomType: 'double', floor: 2, adults: 2, children: 0, price: 55000000,  amenities: ['wifi','ac','tv','shower','fridge'],                 sort: 8  },
      // Floor 3
      { name: '301 — Премиум Сьют',       roomType: 'suite',  floor: 3, adults: 2, children: 1, price: 120000000, amenities: ['wifi','ac','tv','bathtub','fridge','minibar','safe','balcony','view'], sort: 9  },
      { name: '302 — Дормитори (6 мест)', roomType: 'dorm',   floor: 3, adults: 6, children: 0, price: 15000000,  amenities: ['wifi','ac','shower'],                              sort: 10 },
      { name: '303 — Стандарт Double',     roomType: 'double', floor: 3, adults: 2, children: 1, price: 50000000,  amenities: ['wifi','ac','tv','shower','fridge'],                 sort: 11 },
      { name: '304 — Эконом Single',       roomType: 'single', floor: 3, adults: 1, children: 0, price: 30000000,  amenities: ['wifi','ac','shower'],                              sort: 12 },
    ];

    const rooms = await roomRepo.save(
      roomsDef.map((r) => ({
        propertyId: prop.id,
        name: r.name,
        roomType: r.roomType as any,
        floor: r.floor,
        capacityAdults: r.adults,
        capacityChildren: r.children,
        basePrice: r.price,
        amenities: r.amenities,
        status: 'active' as const,
        photos: [],
        descriptionRu: null,
        descriptionUz: null,
        sortOrder: r.sort,
      })),
    );
    console.log(`✓ Rooms: ${rooms.length}`);

    // ════════════════════════════════════════════════════════════════════════
    // 4. GUESTS (25)
    // ════════════════════════════════════════════════════════════════════════
    const guestRepo = dataSource.getRepository(Guest);
    const guestsDef = [
      // UZ locals
      { first: 'Алишер',    last: 'Каримов',     phone: '+998901110001', nat: 'UZ', email: 'alisher@mail.uz',     vip: true,  visits: 8,  revenue: 560000000, dob: '1985-04-12' },
      { first: 'Нодира',    last: 'Юсупова',     phone: '+998901110002', nat: 'UZ', email: 'nodira@mail.uz',      vip: false, visits: 3,  revenue: 150000000, dob: '1990-08-25' },
      { first: 'Дильшод',   last: 'Рахимов',     phone: '+998901110003', nat: 'UZ', email: null,                  vip: false, visits: 2,  revenue: 100000000, dob: null },
      { first: 'Сардор',    last: 'Тошматов',    phone: '+998901110004', nat: 'UZ', email: null,                  vip: false, visits: 1,  revenue: 50000000,  dob: null },
      { first: 'Гулнора',   last: 'Азимова',     phone: '+998901110005', nat: 'UZ', email: 'gulnora@gmail.com',   vip: true,  visits: 12, revenue: 960000000, dob: '1978-01-15' },
      { first: 'Бахтиёр',   last: 'Мирзаев',     phone: '+998901110006', nat: 'UZ', email: null,                  vip: false, visits: 1,  revenue: 35000000,  dob: null },
      { first: 'Малика',    last: 'Хасанова',    phone: '+998901110007', nat: 'UZ', email: null,                  vip: false, visits: 2,  revenue: 70000000,  dob: '1995-11-03' },
      { first: 'Фаррух',    last: 'Сулейманов',  phone: '+998901110008', nat: 'UZ', email: null,                  vip: false, visits: 1,  revenue: 50000000,  dob: null },
      { first: 'Зафар',     last: 'Нематов',     phone: '+998901110009', nat: 'UZ', email: null,                  vip: false, visits: 1,  revenue: 30000000,  dob: null },
      { first: 'Шахзод',    last: 'Абдуллаев',   phone: '+998901110010', nat: 'UZ', email: null,                  vip: false, visits: 0,  revenue: 0,         dob: null },
      // RU
      { first: 'Елена',     last: 'Петрова',     phone: '+79161234567',  nat: 'RU', email: 'elena@yandex.ru',     vip: true,  visits: 5,  revenue: 450000000, dob: '1982-06-20' },
      { first: 'Анна',      last: 'Смирнова',    phone: '+79162345678',  nat: 'RU', email: 'anna.s@mail.ru',      vip: false, visits: 2,  revenue: 120000000, dob: '1993-03-08' },
      { first: 'Дмитрий',   last: 'Козлов',      phone: '+79163456789',  nat: 'RU', email: null,                  vip: false, visits: 1,  revenue: 90000000,  dob: null },
      { first: 'Олег',      last: 'Иванов',      phone: '+79164567890',  nat: 'RU', email: null,                  vip: false, visits: 1,  revenue: 50000000,  dob: null },
      { first: 'Мария',     last: 'Волкова',     phone: '+79165678901',  nat: 'RU', email: null,                  vip: false, visits: 0,  revenue: 0,         dob: null },
      // International
      { first: 'Hans',      last: 'Mueller',     phone: '+491701234567',  nat: 'DE', email: 'hans@web.de',         vip: false, visits: 2,  revenue: 240000000, dob: '1975-09-14' },
      { first: 'Klaus',     last: 'Schmidt',     phone: '+491702345678',  nat: 'DE', email: null,                  vip: false, visits: 1,  revenue: 120000000, dob: null },
      { first: 'Marie',     last: 'Dupont',      phone: '+33612345678',   nat: 'FR', email: 'marie@free.fr',       vip: false, visits: 1,  revenue: 90000000,  dob: '1988-12-01' },
      { first: 'Pierre',    last: 'Moreau',      phone: '+33623456789',   nat: 'FR', email: null,                  vip: false, visits: 1,  revenue: 65000000,  dob: null },
      { first: 'James',     last: 'Smith',       phone: '+12025551234',   nat: 'US', email: 'james.s@gmail.com',   vip: false, visits: 2,  revenue: 180000000, dob: '1980-07-04' },
      { first: 'Sarah',     last: 'Johnson',     phone: '+12025552345',   nat: 'US', email: null,                  vip: false, visits: 1,  revenue: 120000000, dob: null },
      { first: 'Yuki',      last: 'Tanaka',      phone: '+819012345678',  nat: 'JP', email: 'yuki@yahoo.co.jp',    vip: false, visits: 1,  revenue: 90000000,  dob: '1992-05-22' },
      { first: 'Min-jun',   last: 'Kim',         phone: '+821012345678',  nat: 'KR', email: null,                  vip: false, visits: 1,  revenue: 50000000,  dob: null },
      { first: 'Oliver',    last: 'Brown',       phone: '+447911123456',  nat: 'GB', email: 'oliver@hotmail.co.uk',vip: false, visits: 1,  revenue: 120000000, dob: '1987-11-30' },
      // Blacklisted
      { first: 'Рустам',    last: 'Назаров',     phone: '+998901119999', nat: 'UZ', email: null,                  vip: false, visits: 2,  revenue: 70000000,  dob: null },
    ];

    const guests = await guestRepo.save(
      guestsDef.map((g) => ({
        propertyId: prop.id,
        firstName: g.first,
        lastName: g.last,
        phone: g.phone,
        email: g.email,
        nationality: g.nat,
        documentType: g.nat !== 'UZ' ? 'passport' as const : null,
        documentNumber: null,
        dateOfBirth: g.dob,
        isVip: g.vip,
        notes: g.vip ? 'Постоянный VIP-гость' : null,
        tags: g.vip ? ['VIP', 'постоянный'] : [],
        isBlacklisted: false,
        blacklistReason: null,
        totalRevenue: g.revenue,
        visitCount: g.visits,
      })),
    );

    // Blacklist the last guest
    const blGuest = guests[guests.length - 1];
    await guestRepo.update(blGuest.id, {
      isBlacklisted: true,
      blacklistReason: 'Повреждение имущества в номере 202, отказ компенсировать',
      blacklistedAt: daysAgo(45) as any,
    });
    console.log(`✓ Guests: ${guests.length} (1 blacklisted, 3 VIP)`);

    // ════════════════════════════════════════════════════════════════════════
    // 5. RATES (5)
    // ════════════════════════════════════════════════════════════════════════
    const rateRepo = dataSource.getRepository(Rate);
    const rates = await rateRepo.save([
      { propertyId: prop.id, name: 'Стандартный тариф',           type: 'base' as const,     price: null, discountPercent: 0,   dateFrom: null, dateTo: null, minStay: 1, appliesToRooms: [], daysOfWeek: [],     isActive: true },
      { propertyId: prop.id, name: 'Выходные +20%',               type: 'weekend' as const,  price: null, discountPercent: -20, dateFrom: null, dateTo: null, minStay: 1, appliesToRooms: [], daysOfWeek: [4, 5], isActive: true },
      { propertyId: prop.id, name: 'Длительное проживание -10%',   type: 'longstay' as const, price: null, discountPercent: 10,  dateFrom: null, dateTo: null, minStay: 7, appliesToRooms: [], daysOfWeek: [],     isActive: true },
      { propertyId: prop.id, name: 'Навруз +30%',                  type: 'seasonal' as const, price: null, discountPercent: -30, dateFrom: '2026-03-19', dateTo: '2026-03-25', minStay: 1, appliesToRooms: [], daysOfWeek: [], isActive: true },
      { propertyId: prop.id, name: 'Раннее бронирование -15%',     type: 'special' as const,  price: null, discountPercent: 15,  dateFrom: null, dateTo: null, minStay: 1, appliesToRooms: [], daysOfWeek: [],     isActive: true },
    ]);
    console.log(`✓ Rates: ${rates.length}`);

    // ════════════════════════════════════════════════════════════════════════
    // 6. PROPERTY EXTRAS (6)
    // ════════════════════════════════════════════════════════════════════════
    const extrasRepo = dataSource.getRepository(PropertyExtra);
    const extras = await extrasRepo.save([
      { propertyId: prop.id, name: 'Завтрак',               nameUz: 'Nonushta',              description: 'Шведский стол: каши, выпечка, фрукты, чай/кофе',        price: 5000000,  priceType: 'per_person' as const,  icon: 'coffee',  isActive: true, sortOrder: 1 },
      { propertyId: prop.id, name: 'Трансфер из аэропорта', nameUz: 'Aeroportdan transport', description: 'Встреча в аэропорту Самарканда с табличкой',              price: 15000000, priceType: 'per_booking' as const, icon: 'car',     isActive: true, sortOrder: 2 },
      { propertyId: prop.id, name: 'Поздний выезд',         nameUz: 'Kechki chiqish',        description: 'Продление выезда с 12:00 до 16:00',                      price: 10000000, priceType: 'per_booking' as const, icon: 'clock',   isActive: true, sortOrder: 3 },
      { propertyId: prop.id, name: 'Экскурсия Самарканд',   nameUz: 'Samarqand ekskursiya',  description: 'Полный день: Регистан, Шахи-Зинда, Биби-Ханум с гидом', price: 25000000, priceType: 'per_person' as const,  icon: 'map',     isActive: true, sortOrder: 4 },
      { propertyId: prop.id, name: 'Прачечная',             nameUz: 'Kir yuvish',            description: 'Стирка и глажка одежды, возврат в тот же день',           price: 3000000,  priceType: 'per_booking' as const, icon: 'shirt',   isActive: true, sortOrder: 5 },
      { propertyId: prop.id, name: 'Парковка',              nameUz: 'Avto turargoh',         description: 'Охраняемая парковка на территории отеля',                 price: 2000000,  priceType: 'per_night' as const,   icon: 'parking', isActive: true, sortOrder: 6 },
    ]);
    console.log(`✓ Extras: ${extras.length}`);

    // ════════════════════════════════════════════════════════════════════════
    // 7. PROMO CODES (3)
    // ════════════════════════════════════════════════════════════════════════
    const promoRepo = dataSource.getRepository(PromoCode);
    await promoRepo.save([
      { propertyId: prop.id, code: 'WELCOME10',  discountType: 'percent' as const, discountValue: 10,       maxUses: 100, usedCount: 23, minNights: 1, minAmount: 0,         appliesToRooms: [], validFrom: '2026-01-01', validTo: '2026-12-31', isActive: true },
      { propertyId: prop.id, code: 'SUMMER2026', discountType: 'percent' as const, discountValue: 15,       maxUses: 50,  usedCount: 8,  minNights: 2, minAmount: 0,         appliesToRooms: [], validFrom: '2026-06-01', validTo: '2026-08-31', isActive: true },
      { propertyId: prop.id, code: 'LONGSTAY',   discountType: 'fixed' as const,   discountValue: 5000000,  maxUses: null,usedCount: 5,  minNights: 5, minAmount: 25000000,  appliesToRooms: [], validFrom: null,         validTo: null,         isActive: true },
    ]);
    console.log(`✓ Promo codes: 3`);

    // ════════════════════════════════════════════════════════════════════════
    // 8. BOOKINGS (35)
    // ════════════════════════════════════════════════════════════════════════
    const bookingRepo = dataSource.getRepository(Booking);
    const yr = new Date().getFullYear();

    // Format: [guestIdx, roomIdx, checkInOffset, nights, status, source, adults, children, notes]
    type BD = [number, number, number, number, string, string, number, number, string | null];
    const bDefs: BD[] = [
      // ── checked_out (12) ──
      [0,  8,  -28, 3, 'checked_out', 'direct',      2, 0, 'VIP гость, просил тихий номер'],
      [10, 5,  -25, 4, 'checked_out', 'booking_com',  2, 0, null],
      [15, 1,  -22, 3, 'checked_out', 'airbnb',       2, 0, null],
      [17, 2,  -20, 2, 'checked_out', 'direct',       2, 0, null],
      [19, 3,  -18, 5, 'checked_out', 'expedia',      2, 1, 'Семья с ребёнком'],
      [11, 7,  -16, 2, 'checked_out', 'phone',        2, 0, null],
      [2,  0,  -14, 3, 'checked_out', 'direct',       1, 0, null],
      [21, 4,  -12, 2, 'checked_out', 'booking_com',  2, 0, null],
      [3,  10, -10, 4, 'checked_out', 'direct',       2, 1, null],
      [16, 6,  -8,  3, 'checked_out', 'airbnb',       2, 2, 'Семья, нужна детская кроватка'],
      [4,  8,  -6,  2, 'checked_out', 'direct',       2, 0, 'VIP, бутылка вина в номер'],
      [22, 11, -5,  3, 'checked_out', 'website',      1, 0, null],
      // ── checked_in (5 — current guests) ──
      [0,  5,  -2,  5, 'checked_in',  'direct',       2, 0, 'VIP, номер с видом'],
      [10, 1,  -1,  4, 'checked_in',  'booking_com',  2, 0, null],
      [18, 3,  -1,  3, 'checked_in',  'airbnb',       2, 1, null],
      [15, 8,  0,   3, 'checked_in',  'direct',       2, 0, 'Заезд сегодня'],
      [12, 9,  0,   2, 'checked_in',  'phone',        1, 0, 'Дормитори, место у окна'],
      // ── confirmed (8) ──
      [1,  0,  1,   3, 'confirmed',   'direct',       1, 0, null],
      [5,  2,  2,   2, 'confirmed',   'booking_com',  2, 0, null],
      [13, 4,  3,   4, 'confirmed',   'expedia',      2, 0, null],
      [6,  7,  4,   2, 'confirmed',   'direct',       2, 0, null],
      [20, 6,  5,   3, 'confirmed',   'airbnb',       2, 1, null],
      [23, 10, 7,   5, 'confirmed',   'direct',       2, 0, null],
      [7,  11, 8,   2, 'confirmed',   'phone',        1, 0, null],
      [14, 8,  10,  3, 'confirmed',   'booking_com',  2, 0, null],
      // ── new (5) ──
      [8,  0,  14,  3, 'new',         'direct',       1, 0, null],
      [9,  3,  16,  2, 'new',         'website',      2, 1, null],
      [1,  5,  18,  4, 'new',         'booking_com',  2, 0, null],
      [3,  8,  21,  3, 'new',         'direct',       2, 0, null],
      [6,  2,  25,  2, 'new',         'phone',        2, 0, null],
      // ── cancelled (3) ──
      [11, 4,  -3,  3, 'cancelled',   'direct',       2, 0, null],
      [13, 7,  2,   2, 'cancelled',   'booking_com',  2, 0, null],
      [8,  10, 5,   4, 'cancelled',   'expedia',      2, 1, null],
      // ── no_show (2) ──
      [14, 0,  -2,  2, 'no_show',     'booking_com',  1, 0, null],
      [9,  11, -1,  3, 'no_show',     'direct',       1, 0, null],
    ];

    const bookings: any[] = [];
    for (let i = 0; i < bDefs.length; i++) {
      const [gi, ri, off, n, status, source, adults, children, notes] = bDefs[i];
      const room = rooms[ri];
      const guest = guests[gi];
      const total = room.basePrice * n;

      // Add early/late pricing for some checked_in bookings
      const hasEarly = status === 'checked_in' && i % 3 === 0;
      const hasLate  = status === 'checked_in' && i % 2 === 0;

      const booking = await bookingRepo.save({
        bookingNumber: bkNum(yr, i + 1),
        propertyId: prop.id,
        roomId: room.id,
        guestId: guest.id,
        rateId: null,
        checkIn: dateStr(off),
        checkOut: dateStr(off + n),
        nights: n,
        adults,
        children,
        totalAmount: total,
        paidAmount: 0,
        discountAmount: 0,
        status: status as any,
        source: source as any,
        sourceReference: source === 'booking_com' ? `BC-${100000 + i}` : null,
        notes,
        cancelledAt: status === 'cancelled' ? new Date() : null,
        cancelReason: status === 'cancelled' ? 'Гость отменил бронирование' : null,
        earlyCheckinTime: hasEarly ? '10:00' : null,
        earlyCheckinPrice: hasEarly ? 10000000 : null,
        lateCheckoutTime: hasLate ? '16:00' : null,
        lateCheckoutPrice: hasLate ? 10000000 : null,
        createdBy: owner.id,
      } as any);
      bookings.push(booking);
    }
    console.log(`✓ Bookings: ${bookings.length}`);

    // ════════════════════════════════════════════════════════════════════════
    // 9. PAYMENTS
    // ════════════════════════════════════════════════════════════════════════
    const payRepo = dataSource.getRepository(Payment);
    const methods = ['cash', 'card', 'transfer', 'payme', 'click'] as const;
    let pCount = 0;

    for (const bk of bookings) {
      if (bk.status === 'checked_out') {
        // Fully paid
        await payRepo.save({
          bookingId: bk.id, amount: bk.totalAmount,
          method: methods[pCount % methods.length],
          paidAt: daysAgo(Math.max(1, Math.abs(bDefs[pCount][2] as number))),
          notes: null,
          reference: methods[pCount % methods.length] === 'payme' ? `PAY-${Date.now()}-${pCount}` : null,
          createdBy: owner.id,
        });
        // Update paidAmount
        await bookingRepo.update(bk.id, { paidAmount: bk.totalAmount });
        pCount++;
      } else if (bk.status === 'checked_in') {
        // 60-80% paid
        const pct = 0.6 + Math.random() * 0.2;
        const amt = Math.floor(bk.totalAmount * pct);
        await payRepo.save({
          bookingId: bk.id, amount: amt,
          method: methods[pCount % methods.length],
          paidAt: new Date(),
          notes: 'Предоплата при заселении',
          reference: null,
          createdBy: admin.id,
        });
        await bookingRepo.update(bk.id, { paidAmount: amt });
        pCount++;
      } else if (bk.status === 'confirmed') {
        // 30-50% prepaid for some
        if (pCount % 2 === 0) {
          const pct = 0.3 + Math.random() * 0.2;
          const amt = Math.floor(bk.totalAmount * pct);
          await payRepo.save({
            bookingId: bk.id, amount: amt,
            method: methods[pCount % methods.length],
            paidAt: daysAgo(3),
            notes: 'Предоплата',
            reference: null,
            createdBy: owner.id,
          });
          await bookingRepo.update(bk.id, { paidAmount: amt });
        }
        pCount++;
      }
    }
    console.log(`✓ Payments: ${pCount}`);

    // ════════════════════════════════════════════════════════════════════════
    // 10. BOOKING EXTRAS
    // ════════════════════════════════════════════════════════════════════════
    const bExRepo = dataSource.getRepository(BookingExtra);
    let beCount = 0;
    // Add breakfast to some checked_in/checked_out bookings
    for (let i = 0; i < bookings.length; i++) {
      const bk = bookings[i];
      if ((bk.status === 'checked_in' || bk.status === 'checked_out') && i % 2 === 0) {
        // Breakfast
        await bExRepo.save({
          bookingId: bk.id,
          propertyExtraId: extras[0].id,
          quantity: bk.adults + bk.children,
          unitPrice: extras[0].price,
          totalPrice: extras[0].price * (bk.adults + bk.children) * bk.nights,
        });
        beCount++;
      }
      if (bk.status === 'checked_in' && i % 3 === 0) {
        // Airport transfer
        await bExRepo.save({
          bookingId: bk.id,
          propertyExtraId: extras[1].id,
          quantity: 1,
          unitPrice: extras[1].price,
          totalPrice: extras[1].price,
        });
        beCount++;
      }
    }
    console.log(`✓ Booking extras: ${beCount}`);

    // ════════════════════════════════════════════════════════════════════════
    // 11. BOOKING HISTORY
    // ════════════════════════════════════════════════════════════════════════
    const histRepo = dataSource.getRepository(BookingHistory);
    let hCount = 0;

    const statusChain: Record<string, string[]> = {
      checked_out: ['new', 'confirmed', 'checked_in', 'checked_out'],
      checked_in:  ['new', 'confirmed', 'checked_in'],
      confirmed:   ['new', 'confirmed'],
      new:         ['new'],
      cancelled:   ['new', 'cancelled'],
      no_show:     ['new', 'confirmed', 'no_show'],
    };

    for (const bk of bookings) {
      const chain = statusChain[bk.status] || ['new'];
      for (let j = 0; j < chain.length; j++) {
        await histRepo.save({
          bookingId: bk.id,
          userId: owner.id,
          action: 'STATUS_CHANGED',
          oldValue: j === 0 ? null : { status: chain[j - 1] },
          newValue: { status: chain[j] },
        });
        hCount++;
      }
    }
    console.log(`✓ Booking history: ${hCount} entries`);

    // ════════════════════════════════════════════════════════════════════════
    // 12. CLEANING TASKS (8)
    // ════════════════════════════════════════════════════════════════════════
    const taskRepo = dataSource.getRepository(CleaningTask);
    const tasksDef = [
      { roomIdx: 0,  type: 'standard', cStatus: 'dirty',      tStatus: 'pending',     prio: 'normal', note: null },
      { roomIdx: 2,  type: 'checkout', cStatus: 'dirty',      tStatus: 'assigned',    prio: 'high',   note: 'Гость выехал рано' },
      { roomIdx: 4,  type: 'standard', cStatus: 'cleaning',   tStatus: 'in_progress', prio: 'normal', note: null },
      { roomIdx: 7,  type: 'deep',     cStatus: 'dirty',      tStatus: 'pending',     prio: 'urgent', note: 'Глубокая уборка после длительного проживания' },
      { roomIdx: 10, type: 'checkout', cStatus: 'dirty',      tStatus: 'assigned',    prio: 'high',   note: null },
      { roomIdx: 11, type: 'standard', cStatus: 'clean',      tStatus: 'completed',   prio: 'normal', note: null },
      { roomIdx: 6,  type: 'standard', cStatus: 'clean',      tStatus: 'verified',    prio: 'normal', note: 'Проверено менеджером' },
      { roomIdx: 9,  type: 'standard', cStatus: 'inspection', tStatus: 'completed',   prio: 'low',    note: 'Ждёт проверки' },
    ];

    for (const t of tasksDef) {
      await taskRepo.save({
        propertyId: prop.id,
        roomId: rooms[t.roomIdx].id,
        assignedTo: t.tStatus === 'assigned' || t.tStatus === 'in_progress' ? viewer.id : null,
        taskType: t.type as any,
        cleaningStatus: t.cStatus as any,
        taskStatus: t.tStatus as any,
        priority: t.prio as any,
        notes: t.note,
        startedAt: t.tStatus === 'in_progress' ? daysAgo(0) : null,
        completedAt: ['completed', 'verified'].includes(t.tStatus) ? daysAgo(0) : null,
        durationMinutes: t.tStatus === 'completed' ? 35 : t.tStatus === 'verified' ? 45 : null,
      });
    }
    console.log(`✓ Cleaning tasks: ${tasksDef.length}`);

    // ════════════════════════════════════════════════════════════════════════
    // 13. AGENCIES (2)
    // ════════════════════════════════════════════════════════════════════════
    const agencyRepo = dataSource.getRepository(Agency);
    const agencies = await agencyRepo.save([
      { propertyId: prop.id, name: 'Silk Road Tours',     contactPerson: 'Akmal Turaev',    phone: '+998901200001', email: 'info@silkroadtours.uz', commission: 12.0, notes: 'Основной партнёр по туристическим группам', isActive: true },
      { propertyId: prop.id, name: 'Uzbekistan Travel',   contactPerson: 'Diyor Samandarov',phone: '+998901200002', email: 'book@uzbektravel.uz',   commission: 10.0, notes: 'Корпоративные группы и конференции',         isActive: true },
    ]);
    console.log(`✓ Agencies: ${agencies.length}`);

    // ════════════════════════════════════════════════════════════════════════
    // 14. GROUP BOOKINGS (2) + ROOMS
    // ════════════════════════════════════════════════════════════════════════
    const grpRepo = dataSource.getRepository(GroupBooking);
    const grpRoomRepo = dataSource.getRepository(GroupBookingRoom);

    // Group 1: Tour group
    const grp1 = await grpRepo.save({
      propertyId: prop.id,
      groupName: 'Silk Road Adventures — March Tour',
      groupNumber: groupNum(1),
      agencyId: agencies[0].id,
      contactPerson: 'Akmal Turaev',
      contactPhone: '+998901200001',
      contactEmail: 'groups@silkroadtours.uz',
      checkIn: dateStr(5),
      checkOut: dateStr(8),
      roomsCount: 4,
      guestsCount: 8,
      totalAmount: 65000000 * 3 + 50000000 * 3 + 50000000 * 3 + 70000000 * 3, // 3 nights
      paidAmount: 0,
      status: 'confirmed' as any,
      notes: 'Туристическая группа из Европы, нужен англоговорящий персонал',
      createdBy: owner.id,
    });
    // Assign rooms
    await grpRoomRepo.save([
      { groupBookingId: grp1.id, roomId: rooms[4].id, guestName: 'Thomas Weber',  guestPhone: '+491703456789', guestPassport: null, status: 'confirmed' as any, pricePerNight: rooms[4].basePrice },
      { groupBookingId: grp1.id, roomId: rooms[1].id, guestName: 'Lisa Weber',    guestPhone: '+491703456790', guestPassport: null, status: 'confirmed' as any, pricePerNight: rooms[1].basePrice },
      { groupBookingId: grp1.id, roomId: rooms[2].id, guestName: 'Marco Rossi',   guestPhone: '+393401234567', guestPassport: null, status: 'confirmed' as any, pricePerNight: rooms[2].basePrice },
      { groupBookingId: grp1.id, roomId: rooms[3].id, guestName: 'Ana Rossi',     guestPhone: '+393401234568', guestPassport: null, status: 'confirmed' as any, pricePerNight: rooms[3].basePrice },
    ]);

    // Group 2: Corporate
    const grp2 = await grpRepo.save({
      propertyId: prop.id,
      groupName: 'TechConf Samarkand 2026',
      groupNumber: groupNum(2),
      agencyId: agencies[1].id,
      contactPerson: 'Diyor Samandarov',
      contactPhone: '+998901200002',
      contactEmail: 'events@uzbektravel.uz',
      checkIn: dateStr(12),
      checkOut: dateStr(15),
      roomsCount: 3,
      guestsCount: 5,
      totalAmount: 90000000 * 3 + 65000000 * 3 + 55000000 * 3, // 3 nights
      paidAmount: 0,
      status: 'tentative' as any,
      notes: 'IT-конференция, нужен конференц-зал и Wi-Fi',
      createdBy: owner.id,
    });
    await grpRoomRepo.save([
      { groupBookingId: grp2.id, roomId: rooms[5].id, guestName: 'Спикер 1',       guestPhone: null, guestPassport: null, status: 'pending' as any, pricePerNight: rooms[5].basePrice },
      { groupBookingId: grp2.id, roomId: rooms[4].id, guestName: 'Спикер 2',       guestPhone: null, guestPassport: null, status: 'pending' as any, pricePerNight: rooms[4].basePrice },
      { groupBookingId: grp2.id, roomId: rooms[7].id, guestName: 'Организатор',    guestPhone: null, guestPassport: null, status: 'pending' as any, pricePerNight: rooms[7].basePrice },
    ]);
    console.log(`✓ Group bookings: 2 (${grp1.groupNumber}, ${grp2.groupNumber})`);

    // ════════════════════════════════════════════════════════════════════════
    // 15. HOLIDAY RULES (3)
    // ════════════════════════════════════════════════════════════════════════
    const holRepo = dataSource.getRepository(HolidayRule);
    await holRepo.save([
      { propertyId: prop.id, name: 'Навруз',              dateFrom: '2026-03-21', dateTo: '2026-03-23', priceBoostPercent: 30, minNights: 1, recurYearly: true, isActive: true },
      { propertyId: prop.id, name: 'День Независимости',  dateFrom: '2026-09-01', dateTo: '2026-09-02', priceBoostPercent: 20, minNights: 1, recurYearly: true, isActive: true },
      { propertyId: prop.id, name: 'Новый Год',           dateFrom: '2026-12-31', dateTo: '2027-01-02', priceBoostPercent: 25, minNights: 2, recurYearly: true, isActive: true },
    ]);
    console.log(`✓ Holiday rules: 3`);

    // ════════════════════════════════════════════════════════════════════════
    // 16. NOTIFICATION SETTINGS
    // ════════════════════════════════════════════════════════════════════════
    const nsRepo = dataSource.getRepository(NotificationSettings);
    await nsRepo.save({
      propertyId: prop.id,
      telegramRecipients: [
        { name: 'Азиз (Директор)', chatId: '123456789', isActive: true },
        { name: 'Дильнора (Менеджер)', chatId: '987654321', isActive: true },
      ],
      eventNewBooking: true,
      eventCancellation: true,
      eventDailyDigest: true,
      dailyDigestTime: '08:00',
      eventPayment: true,
      eventSyncError: true,
      eventBirthday: true,
    });
    console.log(`✓ Notification settings`);

    // ════════════════════════════════════════════════════════════════════════
    await qr.commitTransaction();
    console.log('\n══════════════════════════════════════════');
    console.log('✅ Demo seed completed!');
    console.log(`   Property: ${prop.name} (id=${prop.id})`);
    console.log(`   Login: demo@sardoba.uz / Demo123!`);
    console.log('══════════════════════════════════════════\n');
  } catch (error) {
    await qr.rollbackTransaction();
    console.error('❌ Seed failed, rolled back:', error);
    throw error;
  } finally {
    await qr.release();
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
