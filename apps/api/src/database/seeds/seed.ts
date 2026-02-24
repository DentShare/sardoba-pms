import 'dotenv/config';
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
import * as crypto from 'crypto';

/**
 * Seed script for development.
 * Creates a demo hotel with rooms, guests, bookings, and payments.
 *
 * Usage: npx ts-node apps/api/src/database/seeds/seed.ts
 */

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sardoba_dev',
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  synchronize: false,
});

function hashPassword(password: string): string {
  // Simple bcrypt-compatible placeholder; real app uses bcryptjs
  return crypto.createHash('sha256').update(password).digest('hex');
}

function bookingNumber(year: number, seq: number): string {
  return `BK-${year}-${String(seq).padStart(4, '0')}`;
}

function dateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

async function seed(): Promise<void> {
  await dataSource.initialize();
  console.log('Database connected. Starting seed...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.startTransaction();

  try {
    // ── 1. Property ──────────────────────────────────────────────────────────
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
    });
    console.log(`  Property created: ${property.name} (id=${property.id})`);

    // ── 2. Users ─────────────────────────────────────────────────────────────
    const userRepo = dataSource.getRepository(User);
    const owner = await userRepo.save({
      propertyId: property.id,
      name: 'Admin Sardoba',
      email: 'admin@sardoba.uz',
      passwordHash: hashPassword('admin123'),
      role: 'owner' as const,
      isActive: true,
    });

    const viewer = await userRepo.save({
      propertyId: property.id,
      name: 'Reception',
      email: 'reception@sardoba.uz',
      passwordHash: hashPassword('reception123'),
      role: 'viewer' as const,
      isActive: true,
    });
    console.log(`  Users created: owner(id=${owner.id}), viewer(id=${viewer.id})`);

    // ── 3. Rooms (5 rooms) ──────────────────────────────────────────────────
    const roomRepo = dataSource.getRepository(Room);
    const roomsData = [
      {
        name: '101 - Standard Single',
        roomType: 'single' as const,
        floor: 1,
        capacityAdults: 1,
        capacityChildren: 0,
        basePrice: 35000000, // 350,000 UZS
        amenities: ['wifi', 'ac', 'tv', 'shower'],
        sortOrder: 1,
      },
      {
        name: '102 - Standard Double',
        roomType: 'double' as const,
        floor: 1,
        capacityAdults: 2,
        capacityChildren: 1,
        basePrice: 50000000, // 500,000 UZS
        amenities: ['wifi', 'ac', 'tv', 'shower', 'fridge'],
        sortOrder: 2,
      },
      {
        name: '201 - Family Room',
        roomType: 'family' as const,
        floor: 2,
        capacityAdults: 2,
        capacityChildren: 2,
        basePrice: 70000000, // 700,000 UZS
        amenities: ['wifi', 'ac', 'tv', 'shower', 'fridge', 'kettle'],
        sortOrder: 3,
      },
      {
        name: '202 - Suite',
        roomType: 'suite' as const,
        floor: 2,
        capacityAdults: 2,
        capacityChildren: 1,
        basePrice: 120000000, // 1,200,000 UZS
        amenities: ['wifi', 'ac', 'tv', 'bathtub', 'fridge', 'minibar', 'safe', 'balcony', 'view'],
        sortOrder: 4,
      },
      {
        name: '301 - Dormitory',
        roomType: 'dorm' as const,
        floor: 3,
        capacityAdults: 4,
        capacityChildren: 0,
        basePrice: 15000000, // 150,000 UZS per bed
        amenities: ['wifi', 'ac', 'shower'],
        sortOrder: 5,
      },
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
    console.log(`  Rooms created: ${rooms.length}`);

    // ── 4. Guests (10 guests) ───────────────────────────────────────────────
    const guestRepo = dataSource.getRepository(Guest);
    const guestsData = [
      { firstName: 'Alisher', lastName: 'Karimov', phone: '+998901111111', nationality: 'UZ' },
      { firstName: 'Elena', lastName: 'Petrova', phone: '+998902222222', nationality: 'RU' },
      { firstName: 'Hans', lastName: 'Mueller', phone: '+491701234567', nationality: 'DE' },
      { firstName: 'Dilshod', lastName: 'Raximov', phone: '+998903333333', nationality: 'UZ' },
      { firstName: 'Marie', lastName: 'Dupont', phone: '+33612345678', nationality: 'FR' },
      { firstName: 'Sardor', lastName: 'Toshmatov', phone: '+998904444444', nationality: 'UZ' },
      { firstName: 'Yuki', lastName: 'Tanaka', phone: '+819012345678', nationality: 'JP' },
      { firstName: 'Anna', lastName: 'Smirnova', phone: '+79161234567', nationality: 'RU' },
      { firstName: 'James', lastName: 'Smith', phone: '+12025551234', nationality: 'US' },
      { firstName: 'Gulnora', lastName: 'Azimova', phone: '+998905555555', nationality: 'UZ' },
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
    console.log(`  Guests created: ${guests.length}`);

    // ── 5. Rates ─────────────────────────────────────────────────────────────
    const rateRepo = dataSource.getRepository(Rate);
    const rates = await rateRepo.save([
      {
        propertyId: property.id,
        name: 'Standard Rate',
        type: 'base' as const,
        price: null,
        discountPercent: null,
        dateFrom: null,
        dateTo: null,
        minStay: 1,
        appliesToRooms: [],
        daysOfWeek: [],
        isActive: true,
      },
      {
        propertyId: property.id,
        name: 'Weekend Surcharge +20%',
        type: 'weekend' as const,
        price: null,
        discountPercent: -20, // negative = surcharge
        dateFrom: null,
        dateTo: null,
        minStay: 1,
        appliesToRooms: [],
        daysOfWeek: [4, 5], // Fri-Sat (0=Mon)
        isActive: true,
      },
      {
        propertyId: property.id,
        name: 'Long Stay -10%',
        type: 'longstay' as const,
        price: null,
        discountPercent: 10,
        dateFrom: null,
        dateTo: null,
        minStay: 7,
        appliesToRooms: [],
        daysOfWeek: [],
        isActive: true,
      },
    ]);
    console.log(`  Rates created: ${rates.length}`);

    // ── 6. Bookings (20 bookings) ───────────────────────────────────────────
    const bookingRepo = dataSource.getRepository(Booking);
    const currentYear = new Date().getFullYear();

    const bookingsData: Array<{
      guestIndex: number;
      roomIndex: number;
      checkInOffset: number;
      nights: number;
      status: string;
      source: string;
    }> = [
      // Past bookings (checked out)
      { guestIndex: 0, roomIndex: 0, checkInOffset: -30, nights: 3, status: 'checked_out', source: 'direct' },
      { guestIndex: 1, roomIndex: 1, checkInOffset: -25, nights: 2, status: 'checked_out', source: 'booking_com' },
      { guestIndex: 2, roomIndex: 3, checkInOffset: -20, nights: 5, status: 'checked_out', source: 'airbnb' },
      { guestIndex: 3, roomIndex: 2, checkInOffset: -15, nights: 4, status: 'checked_out', source: 'direct' },
      { guestIndex: 4, roomIndex: 1, checkInOffset: -12, nights: 2, status: 'checked_out', source: 'expedia' },
      { guestIndex: 5, roomIndex: 0, checkInOffset: -10, nights: 1, status: 'checked_out', source: 'phone' },
      { guestIndex: 6, roomIndex: 3, checkInOffset: -8, nights: 3, status: 'checked_out', source: 'booking_com' },
      { guestIndex: 7, roomIndex: 4, checkInOffset: -7, nights: 2, status: 'checked_out', source: 'direct' },
      // Cancelled
      { guestIndex: 8, roomIndex: 2, checkInOffset: -5, nights: 3, status: 'cancelled', source: 'direct' },
      { guestIndex: 9, roomIndex: 0, checkInOffset: -3, nights: 2, status: 'no_show', source: 'booking_com' },
      // Currently checked in
      { guestIndex: 0, roomIndex: 1, checkInOffset: -2, nights: 5, status: 'checked_in', source: 'direct' },
      { guestIndex: 2, roomIndex: 3, checkInOffset: -1, nights: 4, status: 'checked_in', source: 'airbnb' },
      { guestIndex: 5, roomIndex: 4, checkInOffset: -1, nights: 3, status: 'checked_in', source: 'direct' },
      // Confirmed (upcoming)
      { guestIndex: 1, roomIndex: 0, checkInOffset: 2, nights: 3, status: 'confirmed', source: 'booking_com' },
      { guestIndex: 3, roomIndex: 2, checkInOffset: 3, nights: 2, status: 'confirmed', source: 'direct' },
      { guestIndex: 4, roomIndex: 1, checkInOffset: 5, nights: 4, status: 'confirmed', source: 'expedia' },
      { guestIndex: 6, roomIndex: 3, checkInOffset: 7, nights: 3, status: 'confirmed', source: 'phone' },
      // New (just created)
      { guestIndex: 7, roomIndex: 0, checkInOffset: 10, nights: 2, status: 'new', source: 'direct' },
      { guestIndex: 8, roomIndex: 4, checkInOffset: 12, nights: 5, status: 'new', source: 'booking_com' },
      { guestIndex: 9, roomIndex: 2, checkInOffset: 15, nights: 3, status: 'new', source: 'direct' },
    ];

    const bookings: Booking[] = [];
    for (let i = 0; i < bookingsData.length; i++) {
      const bd = bookingsData[i];
      const room = rooms[bd.roomIndex];
      const guest = guests[bd.guestIndex];
      const checkIn = dateStr(bd.checkInOffset);
      const checkOut = dateStr(bd.checkInOffset + bd.nights);
      const totalAmount = room.basePrice * bd.nights;

      const booking = await bookingRepo.save({
        bookingNumber: bookingNumber(currentYear, i + 1),
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
        cancelledAt: bd.status === 'cancelled' ? new Date() : null,
        cancelReason: bd.status === 'cancelled' ? 'Guest requested cancellation' : null,
        createdBy: owner.id,
      });
      bookings.push(booking);
    }
    console.log(`  Bookings created: ${bookings.length}`);

    // ── 7. Payments for checked_out and checked_in bookings ─────────────────
    const paymentRepo = dataSource.getRepository(Payment);
    const methods = ['cash', 'card', 'transfer', 'payme', 'click'] as const;
    let paymentCount = 0;

    for (const booking of bookings) {
      if (['checked_out', 'checked_in', 'confirmed'].includes(booking.status)) {
        const method = methods[paymentCount % methods.length];
        const amount =
          booking.status === 'checked_out'
            ? booking.totalAmount
            : Math.floor(booking.totalAmount * 0.5); // 50% prepayment

        await paymentRepo.save({
          bookingId: booking.id,
          amount,
          method,
          paidAt: new Date(),
          notes: null,
          reference: method === 'payme' || method === 'click' ? `TXN-${Date.now()}-${paymentCount}` : null,
          createdBy: owner.id,
        });
        paymentCount++;
      }
    }
    console.log(`  Payments created: ${paymentCount}`);

    // ── 8. Booking history entries ──────────────────────────────────────────
    const historyRepo = dataSource.getRepository(BookingHistory);
    let historyCount = 0;

    for (const booking of bookings) {
      // Every booking gets a "created" entry
      await historyRepo.save({
        bookingId: booking.id,
        userId: owner.id,
        action: 'STATUS_CHANGED',
        oldValue: null,
        newValue: { status: 'new' },
      });
      historyCount++;

      if (booking.status !== 'new') {
        await historyRepo.save({
          bookingId: booking.id,
          userId: owner.id,
          action: 'STATUS_CHANGED',
          oldValue: { status: 'new' },
          newValue: { status: booking.status },
        });
        historyCount++;
      }
    }
    console.log(`  Booking history entries: ${historyCount}`);

    // ── 9. Notification settings ────────────────────────────────────────────
    const nsRepo = dataSource.getRepository(NotificationSettings);
    await nsRepo.save({
      propertyId: property.id,
      telegramRecipients: [
        { name: 'Admin', chatId: '123456789', isActive: true },
      ],
      eventNewBooking: true,
      eventCancellation: true,
      eventDailyDigest: true,
      dailyDigestTime: '08:00',
      eventPayment: true,
      eventSyncError: true,
    });
    console.log('  Notification settings created');

    await queryRunner.commitTransaction();
    console.log('\nSeed completed successfully!');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Seed failed, rolled back:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
