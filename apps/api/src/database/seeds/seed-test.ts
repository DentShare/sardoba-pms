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

/**
 * Test seed — creates a predictable, isolated dataset for E2E / integration tests.
 * All IDs and values are deterministic so tests can reference them directly.
 *
 * Usage: npx ts-node apps/api/src/database/seeds/seed-test.ts
 */

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sardoba_dev',
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  synchronize: false,
});

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function dateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

async function seedTest(): Promise<void> {
  await dataSource.initialize();
  console.log('Database connected. Starting test seed...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.startTransaction();

  try {
    // ── Clean existing test data ──────────────────────────────────────────
    // Delete in reverse dependency order
    await queryRunner.query(`DELETE FROM booking_history`);
    await queryRunner.query(`DELETE FROM payments`);
    await queryRunner.query(`DELETE FROM bookings`);
    await queryRunner.query(`DELETE FROM rates`);
    await queryRunner.query(`DELETE FROM guests`);
    await queryRunner.query(`DELETE FROM property_extras`);
    await queryRunner.query(`DELETE FROM notification_settings`);
    await queryRunner.query(`DELETE FROM rooms`);
    await queryRunner.query(`DELETE FROM users`);
    await queryRunner.query(`DELETE FROM properties`);

    // ── 1. Property ──────────────────────────────────────────────────────
    const propertyRepo = dataSource.getRepository(Property);
    const property = await propertyRepo.save({
      name: 'Sardoba Guest House',
      city: 'Samarkand',
      address: 'ul. Registan, 15, Samarkand 140100',
      phone: '+998901234567',
      currency: 'UZS',
      timezone: 'Asia/Tashkent',
      locale: 'ru',
      checkinTime: '14:00',
      checkoutTime: '12:00',
      settings: { theme: 'default' },
      slug: 'sardoba-guest-house',
      description: 'Уютный гостевой дом в самом сердце Самарканда.',
      descriptionUz: 'Samarqand markazida joylashgan qulay mehmonxona.',
      coverPhoto: null,
      photos: [],
      bookingEnabled: true,
    });
    console.log(`  Property: ${property.name} (id=${property.id})`);

    // ── 2. Users ─────────────────────────────────────────────────────────
    const userRepo = dataSource.getRepository(User);
    const owner = await userRepo.save({
      propertyId: property.id,
      name: 'Admin Sardoba',
      email: 'admin@sardoba.uz',
      passwordHash: await hashPassword('Admin123!'),
      role: 'owner' as const,
      isActive: true,
    });

    const viewer = await userRepo.save({
      propertyId: property.id,
      name: 'Reception',
      email: 'reception@sardoba.uz',
      passwordHash: await hashPassword('Reception123!'),
      role: 'viewer' as const,
      isActive: true,
    });

    const superAdmin = await userRepo.save({
      propertyId: null,
      name: 'Super Admin',
      email: 'superadmin@sardoba.uz',
      passwordHash: await hashPassword('SuperAdmin123!'),
      role: 'super_admin' as const,
      isActive: true,
    });
    console.log(`  Users: owner(${owner.id}), viewer(${viewer.id}), super_admin(${superAdmin.id})`);

    // ── 3. Rooms (5 rooms, 2 floors) ──────────────────────────────────────
    const roomRepo = dataSource.getRepository(Room);
    const roomsData = [
      { name: '101 - Standard Single', roomType: 'single' as const, floor: 1, capacityAdults: 1, capacityChildren: 0, basePrice: 35000000, amenities: ['wifi', 'ac', 'tv', 'shower'], sortOrder: 1 },
      { name: '102 - Standard Double', roomType: 'double' as const, floor: 1, capacityAdults: 2, capacityChildren: 1, basePrice: 50000000, amenities: ['wifi', 'ac', 'tv', 'shower', 'fridge'], sortOrder: 2 },
      { name: '201 - Family Room', roomType: 'family' as const, floor: 2, capacityAdults: 2, capacityChildren: 2, basePrice: 70000000, amenities: ['wifi', 'ac', 'tv', 'shower', 'fridge', 'kettle'], sortOrder: 3 },
      { name: '202 - Suite', roomType: 'suite' as const, floor: 2, capacityAdults: 2, capacityChildren: 1, basePrice: 120000000, amenities: ['wifi', 'ac', 'tv', 'bathtub', 'fridge', 'minibar', 'safe', 'balcony'], sortOrder: 4 },
      { name: '301 - Dormitory', roomType: 'dorm' as const, floor: 3, capacityAdults: 4, capacityChildren: 0, basePrice: 15000000, amenities: ['wifi', 'ac', 'shower'], sortOrder: 5 },
    ];

    const rooms = await roomRepo.save(
      roomsData.map((r) => ({
        ...r,
        propertyId: property.id,
        status: 'active' as const,
        photos: [],
        descriptionRu: null,
        descriptionUz: null,
      })),
    );
    console.log(`  Rooms: ${rooms.length}`);

    // ── 4. Guests (5 guests with known data) ──────────────────────────────
    const guestRepo = dataSource.getRepository(Guest);
    const guestsData = [
      { firstName: 'Alisher', lastName: 'Karimov', phone: '+998901111111', nationality: 'UZ' },
      { firstName: 'Elena', lastName: 'Petrova', phone: '+998902222222', nationality: 'RU' },
      { firstName: 'Hans', lastName: 'Mueller', phone: '+491701234567', nationality: 'DE' },
      { firstName: 'Dilshod', lastName: 'Raximov', phone: '+998903333333', nationality: 'UZ' },
      { firstName: 'Marie', lastName: 'Dupont', phone: '+33612345678', nationality: 'FR' },
    ];

    const guests = await guestRepo.save(
      guestsData.map((g) => ({
        ...g,
        propertyId: property.id,
        email: null,
        documentType: null,
        documentNumber: null,
        dateOfBirth: null,
        isVip: false,
        notes: null,
        totalRevenue: 0,
        visitCount: 0,
      })),
    );
    console.log(`  Guests: ${guests.length}`);

    // ── 5. Rates ─────────────────────────────────────────────────────────
    const rateRepo = dataSource.getRepository(Rate);
    await rateRepo.save([
      { propertyId: property.id, name: 'Standard Rate', type: 'base' as const, price: null, discountPercent: 0, dateFrom: null, dateTo: null, minStay: 1, appliesToRooms: [], daysOfWeek: [], isActive: true },
      { propertyId: property.id, name: 'Weekend +20%', type: 'weekend' as const, price: null, discountPercent: -20, dateFrom: null, dateTo: null, minStay: 1, appliesToRooms: [], daysOfWeek: [4, 5], isActive: true },
    ]);
    console.log('  Rates: 2');

    // ── 6. Bookings (10 bookings in all statuses) ─────────────────────────
    const bookingRepo = dataSource.getRepository(Booking);
    const currentYear = new Date().getFullYear();

    const bookingsData = [
      // 2 new
      { guestIdx: 0, roomIdx: 0, offset: 10, nights: 2, status: 'new', source: 'direct', seq: 1 },
      { guestIdx: 1, roomIdx: 4, offset: 12, nights: 3, status: 'new', source: 'booking_com', seq: 2 },
      // 2 confirmed
      { guestIdx: 2, roomIdx: 1, offset: 5, nights: 3, status: 'confirmed', source: 'direct', seq: 3 },
      { guestIdx: 3, roomIdx: 2, offset: 7, nights: 2, status: 'confirmed', source: 'phone', seq: 4 },
      // 2 checked_in
      { guestIdx: 0, roomIdx: 1, offset: -1, nights: 4, status: 'checked_in', source: 'direct', seq: 5 },
      { guestIdx: 4, roomIdx: 3, offset: -2, nights: 5, status: 'checked_in', source: 'airbnb', seq: 6 },
      // 2 checked_out
      { guestIdx: 1, roomIdx: 0, offset: -15, nights: 3, status: 'checked_out', source: 'direct', seq: 7 },
      { guestIdx: 2, roomIdx: 2, offset: -10, nights: 2, status: 'checked_out', source: 'expedia', seq: 8 },
      // 2 cancelled
      { guestIdx: 3, roomIdx: 3, offset: -5, nights: 3, status: 'cancelled', source: 'direct', seq: 9 },
      { guestIdx: 4, roomIdx: 0, offset: -3, nights: 2, status: 'no_show', source: 'booking_com', seq: 10 },
    ];

    const bookings: Booking[] = [];
    for (const bd of bookingsData) {
      const room = rooms[bd.roomIdx];
      const guest = guests[bd.guestIdx];
      const checkIn = dateStr(bd.offset);
      const checkOut = dateStr(bd.offset + bd.nights);
      const totalAmount = room.basePrice * bd.nights;

      const booking = await bookingRepo.save({
        bookingNumber: `BK-${currentYear}-${String(bd.seq).padStart(4, '0')}`,
        propertyId: property.id,
        roomId: room.id,
        guestId: guest.id,
        rateId: null,
        checkIn,
        checkOut,
        nights: bd.nights,
        adults: 1,
        children: 0,
        totalAmount,
        paidAmount: 0,
        status: bd.status as any,
        source: bd.source as any,
        sourceReference: null,
        notes: null,
        cancelledAt: bd.status === 'cancelled' || bd.status === 'no_show' ? new Date() : null,
        cancelReason: bd.status === 'cancelled' ? 'Тест: отмена гостем' : bd.status === 'no_show' ? 'Тест: неявка' : null,
        createdBy: owner.id,
      });
      bookings.push(booking);
    }
    console.log(`  Bookings: ${bookings.length}`);

    // ── 7. Payments ──────────────────────────────────────────────────────
    const paymentRepo = dataSource.getRepository(Payment);
    const methods = ['cash', 'card', 'transfer'] as const;
    let payIdx = 0;

    for (const booking of bookings) {
      if (['checked_out', 'checked_in', 'confirmed'].includes(booking.status)) {
        const amount = booking.status === 'checked_out' ? booking.totalAmount : Math.floor(booking.totalAmount * 0.5);
        await paymentRepo.save({
          bookingId: booking.id,
          amount,
          method: methods[payIdx % methods.length],
          paidAt: new Date(),
          notes: null,
          reference: null,
          createdBy: owner.id,
        });
        payIdx++;
      }
    }
    console.log(`  Payments: ${payIdx}`);

    // ── 8. Booking history ───────────────────────────────────────────────
    const historyRepo = dataSource.getRepository(BookingHistory);
    for (const booking of bookings) {
      await historyRepo.save({
        bookingId: booking.id,
        userId: owner.id,
        action: 'STATUS_CHANGED',
        oldValue: null,
        newValue: { status: 'new' },
      });
      if (booking.status !== 'new') {
        await historyRepo.save({
          bookingId: booking.id,
          userId: owner.id,
          action: 'STATUS_CHANGED',
          oldValue: { status: 'new' },
          newValue: { status: booking.status },
        });
      }
    }
    console.log('  Booking history: done');

    // ── 9. Notification settings ─────────────────────────────────────────
    const nsRepo = dataSource.getRepository(NotificationSettings);
    await nsRepo.save({
      propertyId: property.id,
      telegramRecipients: [{ name: 'Test', chatId: '000000000', isActive: false }],
      eventNewBooking: true,
      eventCancellation: true,
      eventDailyDigest: false,
      dailyDigestTime: '08:00',
      eventPayment: true,
      eventSyncError: false,
    });
    console.log('  Notification settings: done');

    // ── 10. Property Extras ──────────────────────────────────────────────
    const extrasRepo = dataSource.getRepository(PropertyExtra);
    await extrasRepo.save([
      { propertyId: property.id, name: 'Завтрак', nameUz: 'Nonushta', description: 'Шведский стол', price: 5000000, priceType: 'per_person' as const, icon: 'coffee', isActive: true, sortOrder: 1 },
      { propertyId: property.id, name: 'Трансфер', nameUz: 'Transport', description: 'Из аэропорта', price: 15000000, priceType: 'per_booking' as const, icon: 'car', isActive: true, sortOrder: 2 },
    ]);
    console.log('  Extras: 2');

    await queryRunner.commitTransaction();
    console.log('\nTest seed completed successfully!');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Test seed failed, rolled back:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seedTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
