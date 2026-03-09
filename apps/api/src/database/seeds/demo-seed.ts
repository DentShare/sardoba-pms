import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

/**
 * Seed script for creating demo data for Sardoba PMS.
 * Run: DATABASE_URL=... NODE_ENV=production npx ts-node apps/api/src/database/seeds/demo-seed.ts
 *
 * Creates:
 * - 1 demo property (Sardoba Boutique Hotel)
 * - 1 owner account (demo@sardoba.uz / Demo2025!)
 * - 2 staff accounts
 * - 12 rooms across 3 floors
 * - 8 guests with realistic Uzbek names
 * - 10 bookings (past, current, future)
 * - 5 rate plans
 * - Housekeeping tasks
 */
async function seed() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const ds = new DataSource({
    type: 'postgres',
    url: dbUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
    synchronize: false,
  });

  await ds.initialize();
  console.log('Connected to database');

  const qr = ds.createQueryRunner();
  await qr.startTransaction();

  try {
    // ── Property ─────────────────────────────────────────────────────────
    const [property] = await qr.query(
      `INSERT INTO properties (name, city, address, phone, currency, timezone, locale, slug)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        'Sardoba Boutique Hotel',
        'Samarkand',
        'ул. Регистан, 15',
        '+998901234567',
        'UZS',
        'Asia/Tashkent',
        'ru',
        'sardoba-demo',
      ],
    );

    if (!property) {
      console.log('Property already exists, skipping seed');
      await qr.rollbackTransaction();
      await ds.destroy();
      return;
    }

    const propertyId = property.id;
    console.log(`Created property: ${propertyId}`);

    // ── Users ─────────────────────────────────────────────────────────────
    const ownerHash = await bcrypt.hash('Demo2025!', BCRYPT_ROUNDS);
    const staffHash = await bcrypt.hash('Staff2025!', BCRYPT_ROUNDS);

    const users = await qr.query(
      `INSERT INTO users (name, email, password_hash, property_id, role, is_active)
       VALUES
         ($1, 'demo@sardoba.uz', $2, $3, 'owner', true),
         ('Фарход Ибрагимов', 'farkhod@sardoba.uz', $4, $3, 'admin', true),
         ('Гулнора Каримова', 'gulnora@sardoba.uz', $4, $3, 'staff', true)
       RETURNING id, name, role`,
      [
        'Алишер Навоий',
        ownerHash,
        propertyId,
        staffHash,
      ],
    );

    console.log(`Created ${users.length} users`);

    // ── Rooms ─────────────────────────────────────────────────────────────
    const roomData = [
      // Floor 1
      { name: '101', type: 'standard', floor: 1, adults: 2, children: 1, price: 450000 },
      { name: '102', type: 'standard', floor: 1, adults: 2, children: 1, price: 450000 },
      { name: '103', type: 'deluxe',   floor: 1, adults: 2, children: 2, price: 750000 },
      { name: '104', type: 'deluxe',   floor: 1, adults: 2, children: 2, price: 750000 },
      // Floor 2
      { name: '201', type: 'standard', floor: 2, adults: 2, children: 1, price: 500000 },
      { name: '202', type: 'deluxe',   floor: 2, adults: 2, children: 2, price: 800000 },
      { name: '203', type: 'suite',    floor: 2, adults: 2, children: 2, price: 1200000 },
      { name: '204', type: 'family',   floor: 2, adults: 3, children: 3, price: 950000 },
      // Floor 3
      { name: '301', type: 'suite',    floor: 3, adults: 2, children: 2, price: 1500000 },
      { name: '302', type: 'suite',    floor: 3, adults: 2, children: 2, price: 1500000 },
      { name: '303', type: 'deluxe',   floor: 3, adults: 2, children: 2, price: 850000 },
      { name: '304', type: 'family',   floor: 3, adults: 4, children: 3, price: 1100000 },
    ];

    const rooms: Array<typeof roomData[number] & { id: number }> = [];
    for (let i = 0; i < roomData.length; i++) {
      const r = roomData[i];
      const [room] = await qr.query(
        `INSERT INTO rooms (property_id, name, room_type, floor, capacity_adults, capacity_children, base_price, status, sort_order, amenities)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9)
         RETURNING id`,
        [
          propertyId,
          r.name,
          r.type,
          r.floor,
          r.adults,
          r.children,
          r.price,
          i + 1,
          '{wifi,tv,ac,minibar,safe}',
        ],
      );
      rooms.push({ ...r, id: room.id });
    }

    console.log(`Created ${rooms.length} rooms`);

    // ── Guests ────────────────────────────────────────────────────────────
    // Table uses: first_name, last_name, nationality, visit_count, total_revenue
    const guestData = [
      { firstName: 'Рустам',   lastName: 'Ходжаев',   phone: '+998901001020', email: 'rustam@mail.uz',  nationality: 'UZ' },
      { firstName: 'Мария',    lastName: 'Петрова',    phone: '+79161234567',  email: 'maria@gmail.com', nationality: 'RU' },
      { firstName: 'John',     lastName: 'Smith',      phone: '+14155551234',  email: 'john@email.com',  nationality: 'US' },
      { firstName: 'Дильшод', lastName: 'Каримов',   phone: '+998935556677', email: 'dilshod@mail.uz', nationality: 'UZ' },
      { firstName: 'Наргиза', lastName: 'Юсупова',   phone: '+998907778899', email: 'nargiza@mail.uz', nationality: 'UZ' },
      { firstName: 'Hans',     lastName: 'Mueller',    phone: '+491701234567', email: 'hans@web.de',     nationality: 'DE' },
      { firstName: 'Акмал',   lastName: 'Расулов',   phone: '+998944445566', email: 'akmal@mail.uz',   nationality: 'UZ' },
      { firstName: 'Sophie',   lastName: 'Martin',     phone: '+33612345678',  email: 'sophie@mail.fr',  nationality: 'FR' },
    ];

    const guests: Array<typeof guestData[number] & { id: number }> = [];
    for (const g of guestData) {
      const [guest] = await qr.query(
        `INSERT INTO guests (property_id, first_name, last_name, phone, email, nationality, visit_count, total_revenue)
         VALUES ($1, $2, $3, $4, $5, $6, 0, 0)
         RETURNING id`,
        [propertyId, g.firstName, g.lastName, g.phone, g.email, g.nationality],
      );
      guests.push({ ...g, id: guest.id });
    }

    console.log(`Created ${guests.length} guests`);

    // ── Rates ─────────────────────────────────────────────────────────────
    // Table uses: type, price, discount_percent (not rate_type, base_multiplier)
    const rateData = [
      { name: 'Стандартный тариф',    type: 'standard',       price: 500000, discount: 0 },
      { name: 'Завтрак включён',     type: 'breakfast',      price: 575000, discount: 0 },
      { name: 'Полный пансион',       type: 'full_board',     price: 700000, discount: 0 },
      { name: 'Раннее бронирование',  type: 'early_bird',     price: 500000, discount: 15 },
      { name: 'Невозвратный',         type: 'non_refundable', price: 500000, discount: 10 },
    ];

    for (const rate of rateData) {
      await qr.query(
        `INSERT INTO rates (property_id, name, type, price, discount_percent, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [propertyId, rate.name, rate.type, rate.price, rate.discount],
      );
    }

    console.log(`Created ${rateData.length} rates`);

    // ── Bookings ──────────────────────────────────────────────────────────
    const today = new Date();
    const d = (offset: number) => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() + offset);
      return dt.toISOString().split('T')[0];
    };

    const bookings = [
      { guest: 0, room: 0, checkIn: d(-5), checkOut: d(-2), status: 'checked_out', source: 'direct' },
      { guest: 1, room: 2, checkIn: d(-3), checkOut: d(-1), status: 'checked_out', source: 'booking_com' },
      { guest: 2, room: 4, checkIn: d(-1), checkOut: d(2),  status: 'checked_in',  source: 'direct' },
      { guest: 3, room: 6, checkIn: d(-2), checkOut: d(1),  status: 'checked_in',  source: 'direct' },
      { guest: 4, room: 8, checkIn: d(0),  checkOut: d(3),  status: 'checked_in',  source: 'booking_com' },
      { guest: 5, room: 3, checkIn: d(1),  checkOut: d(5),  status: 'confirmed',   source: 'direct' },
      { guest: 6, room: 5, checkIn: d(2),  checkOut: d(4),  status: 'confirmed',   source: 'airbnb' },
      { guest: 7, room: 9, checkIn: d(3),  checkOut: d(7),  status: 'confirmed',   source: 'direct' },
      { guest: 0, room: 1, checkIn: d(5),  checkOut: d(8),  status: 'confirmed',   source: 'direct' },
      { guest: 1, room: 10,checkIn: d(7),  checkOut: d(10), status: 'confirmed',   source: 'booking_com' },
    ];

    for (let i = 0; i < bookings.length; i++) {
      const b = bookings[i];
      const room = rooms[b.room];
      const guest = guests[b.guest];
      const nights = Math.ceil(
        (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24),
      );
      const total = room.price * nights;
      const paid = b.status === 'checked_out' ? total : (b.status === 'checked_in' ? Math.round(total * 0.5) : 0);

      await qr.query(
        `INSERT INTO bookings (property_id, room_id, guest_id, booking_number, check_in, check_out, nights, adults, children, total_amount, paid_amount, status, source, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, $12, $13)`,
        [
          propertyId,
          room.id,
          guest.id,
          `SRD-${String(i + 1).padStart(4, '0')}`,
          b.checkIn,
          b.checkOut,
          nights,
          room.adults,
          total,
          paid,
          b.status,
          b.source,
          users[0].id, // owner as creator
        ],
      );
    }

    console.log(`Created ${bookings.length} bookings`);

    // ── Room Cleaning Statuses ────────────────────────────────────────────
    const statusChoices: string[] = ['clean', 'clean', 'clean', 'clean', 'dirty', 'dirty', 'cleaning', 'inspection'];
    for (const room of rooms) {
      const status = statusChoices[Math.floor(Math.random() * statusChoices.length)];
      await qr.query(
        `INSERT INTO room_cleaning_statuses (property_id, room_id, cleaning_status)
         VALUES ($1, $2, $3)`,
        [propertyId, room.id, status],
      );
    }

    console.log('Created room cleaning statuses');

    // ── Cleaning Tasks ────────────────────────────────────────────────────
    const taskTypes = ['standard', 'checkout', 'deep'];
    const taskStatuses = ['pending', 'assigned', 'in_progress', 'completed'];
    const priorities = ['low', 'normal', 'high', 'urgent'];

    for (let i = 0; i < 6; i++) {
      const room = rooms[i * 2];
      const taskType = taskTypes[i % taskTypes.length];
      const taskStatus = taskStatuses[i % taskStatuses.length];
      await qr.query(
        `INSERT INTO cleaning_tasks (property_id, room_id, assigned_to, task_type, cleaning_status, task_status, priority, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          propertyId,
          room.id,
          taskStatus !== 'pending' ? users[2].id : null,
          taskType,
          taskStatus === 'completed' ? 'clean' : 'dirty',
          taskStatus,
          priorities[i % priorities.length],
          i === 0 ? 'Гость просил дополнительные полотенца' : null,
        ],
      );
    }

    console.log('Created cleaning tasks');

    // ── Payments ──────────────────────────────────────────────────────────
    // Table: id, booking_id, amount, method, paid_at, notes, reference, created_by
    const ownerId = users[0].id;
    for (let i = 0; i < 5; i++) {
      const room = rooms[i];
      await qr.query(
        `INSERT INTO payments (booking_id, amount, method, paid_at, created_by)
         SELECT b.id, b.paid_amount, 'cash', NOW(), $3
         FROM bookings b
         WHERE b.property_id = $1 AND b.room_id = $2 AND b.paid_amount > 0
         LIMIT 1`,
        [propertyId, room.id, ownerId],
      );
    }

    console.log('Created payments');

    await qr.commitTransaction();

    console.log('\n✅ Demo data seeded successfully!');
    console.log('─────────────────────────────────');
    console.log('📧 Login: demo@sardoba.uz');
    console.log('🔑 Password: Demo2025!');
    console.log('🏨 Property: Sardoba Boutique Hotel');
    console.log('─────────────────────────────────\n');
  } catch (error) {
    await qr.rollbackTransaction();
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await qr.release();
    await ds.destroy();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
