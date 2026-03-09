import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Property } from '../entities/property.entity';
import { User } from '../entities/user.entity';
import { Room, type RoomType } from '../entities/room.entity';
import { Rate } from '../entities/rate.entity';
import { NotificationSettings } from '../entities/notification-settings.entity';

/**
 * Hotel onboarding script.
 * Creates a new hotel with rooms, owner account, receptionist account,
 * base rate, and notification settings. No demo data.
 *
 * Usage:
 *   npx ts-node apps/api/src/database/seeds/seed-hotel.ts \
 *     --name "Hotel Name" \
 *     --city "Samarkand" \
 *     --address "ul. Example 1" \
 *     --phone "+998901234567" \
 *     --rooms 10 \
 *     --owner-email "owner@hotel.uz" \
 *     --owner-password "SecurePass123!" \
 *     [--reception-email "reception@hotel.uz"] \
 *     [--reception-password "Reception123!"] \
 *     [--base-price 50000000] \
 *     [--slug "hotel-name"]
 */

// ── Parse CLI args ────────────────────────────────────────────────────────────

function getArg(name: string, required: boolean = false): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) {
    if (required) {
      console.error(`Missing required argument: --${name}`);
      process.exit(1);
    }
    return undefined;
  }
  return process.argv[idx + 1];
}

const config = {
  name: getArg('name', true)!,
  city: getArg('city', true)!,
  address: getArg('address', true)!,
  phone: getArg('phone', true)!,
  roomCount: parseInt(getArg('rooms', true)!, 10),
  ownerEmail: getArg('owner-email', true)!,
  ownerPassword: getArg('owner-password', true)!,
  receptionEmail: getArg('reception-email'),
  receptionPassword: getArg('reception-password') || 'Reception123!',
  basePrice: parseInt(getArg('base-price') || '50000000', 10), // 500,000 UZS default
  slug: getArg('slug') || config_slug(),
};

function config_slug(): string {
  const name = getArg('name', true)!;
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ── Database ──────────────────────────────────────────────────────────────────

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sardoba_dev',
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  synchronize: false,
});

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// ── Room templates by type ────────────────────────────────────────────────────

interface RoomTemplate {
  type: 'single' | 'double' | 'family' | 'suite';
  capacityAdults: number;
  capacityChildren: number;
  priceMultiplier: number;
  amenities: string[];
}

const ROOM_TEMPLATES: RoomTemplate[] = [
  { type: 'single', capacityAdults: 1, capacityChildren: 0, priceMultiplier: 0.7, amenities: ['wifi', 'ac', 'tv', 'shower'] },
  { type: 'double', capacityAdults: 2, capacityChildren: 1, priceMultiplier: 1.0, amenities: ['wifi', 'ac', 'tv', 'shower', 'fridge'] },
  { type: 'family', capacityAdults: 2, capacityChildren: 2, priceMultiplier: 1.4, amenities: ['wifi', 'ac', 'tv', 'shower', 'fridge', 'kettle'] },
  { type: 'suite', capacityAdults: 2, capacityChildren: 1, priceMultiplier: 2.0, amenities: ['wifi', 'ac', 'tv', 'bathtub', 'fridge', 'minibar', 'safe'] },
];

function generateRooms(count: number, basePrice: number): Array<{
  name: string;
  roomType: RoomType;
  floor: number;
  capacityAdults: number;
  capacityChildren: number;
  basePrice: number;
  amenities: string[];
  sortOrder: number;
}> {
  const rooms: ReturnType<typeof generateRooms> = [];
  const roomsPerFloor = Math.max(3, Math.ceil(count / 3));

  for (let i = 0; i < count; i++) {
    const floor = Math.floor(i / roomsPerFloor) + 1;
    const roomOnFloor = (i % roomsPerFloor) + 1;
    const roomNumber = floor * 100 + roomOnFloor;

    // Distribute room types: mostly doubles, some singles, fewer family/suites
    let template: RoomTemplate;
    const ratio = i / count;
    if (ratio < 0.2) {
      template = ROOM_TEMPLATES[0]; // single ~20%
    } else if (ratio < 0.7) {
      template = ROOM_TEMPLATES[1]; // double ~50%
    } else if (ratio < 0.9) {
      template = ROOM_TEMPLATES[2]; // family ~20%
    } else {
      template = ROOM_TEMPLATES[3]; // suite ~10%
    }

    const typeLabels: Record<string, string> = {
      single: 'Стандарт одноместный',
      double: 'Стандарт двухместный',
      family: 'Семейный',
      suite: 'Люкс',
    };

    rooms.push({
      name: `${roomNumber} - ${typeLabels[template.type]}`,
      roomType: template.type,
      floor,
      capacityAdults: template.capacityAdults,
      capacityChildren: template.capacityChildren,
      basePrice: Math.round(basePrice * template.priceMultiplier),
      amenities: template.amenities,
      sortOrder: i + 1,
    });
  }

  return rooms;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seedHotel(): Promise<void> {
  await dataSource.initialize();
  console.log('Database connected. Creating hotel...\n');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.startTransaction();

  try {
    // ── 1. Property ────────────────────────────────────────────────────────
    const propertyRepo = dataSource.getRepository(Property);
    const property = await propertyRepo.save({
      name: config.name,
      city: config.city,
      address: config.address,
      phone: config.phone,
      currency: 'UZS',
      timezone: 'Asia/Tashkent',
      locale: 'ru',
      checkinTime: '14:00',
      checkoutTime: '12:00',
      settings: {},
      slug: config.slug,
      description: null,
      descriptionUz: null,
      coverPhoto: null,
      photos: [],
      bookingEnabled: true,
    });
    console.log(`  Property: ${property.name} (id=${property.id}, slug=${property.slug})`);

    // ── 2. Users ───────────────────────────────────────────────────────────
    const userRepo = dataSource.getRepository(User);
    const owner = await userRepo.save({
      propertyId: property.id,
      name: 'Владелец',
      email: config.ownerEmail,
      passwordHash: await hashPassword(config.ownerPassword),
      role: 'owner' as const,
      isActive: true,
    });
    console.log(`  Owner:    ${owner.email} (id=${owner.id})`);

    if (config.receptionEmail) {
      const reception = await userRepo.save({
        propertyId: property.id,
        name: 'Ресепшн',
        email: config.receptionEmail,
        passwordHash: await hashPassword(config.receptionPassword),
        role: 'viewer' as const,
        isActive: true,
      });
      console.log(`  Reception: ${reception.email} (id=${reception.id})`);
    }

    // ── 3. Rooms ───────────────────────────────────────────────────────────
    const roomRepo = dataSource.getRepository(Room);
    const roomsData = generateRooms(config.roomCount, config.basePrice);
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
    console.log(`  Rooms:    ${rooms.length} created`);

    // Print room summary
    const typeCounts: Record<string, number> = {};
    for (const r of roomsData) {
      typeCounts[r.roomType] = (typeCounts[r.roomType] || 0) + 1;
    }
    console.log(`            ${Object.entries(typeCounts).map(([t, c]) => `${t}: ${c}`).join(', ')}`);

    // ── 4. Base Rate ───────────────────────────────────────────────────────
    const rateRepo = dataSource.getRepository(Rate);
    await rateRepo.save({
      propertyId: property.id,
      name: 'Базовый тариф',
      type: 'base' as const,
      price: null,
      discountPercent: 0,
      dateFrom: null,
      dateTo: null,
      minStay: 1,
      appliesToRooms: [],
      daysOfWeek: [],
      isActive: true,
    });
    console.log('  Rate:     Базовый тариф (base)');

    // ── 5. Notification Settings ───────────────────────────────────────────
    const nsRepo = dataSource.getRepository(NotificationSettings);
    await nsRepo.save({
      propertyId: property.id,
      telegramRecipients: [],
      eventNewBooking: true,
      eventCancellation: true,
      eventDailyDigest: true,
      dailyDigestTime: '08:00',
      eventPayment: true,
      eventSyncError: false,
    });
    console.log('  Notifications: configured (Telegram recipients empty — add via settings)');

    await queryRunner.commitTransaction();

    console.log('\n========================================');
    console.log('Hotel onboarding complete!');
    console.log('========================================');
    console.log(`\n  Login: ${config.ownerEmail}`);
    console.log(`  Password: ${config.ownerPassword}`);
    if (config.slug) {
      console.log(`  Public booking: /book/${config.slug}`);
    }
    console.log(`\n  Next steps:`);
    console.log(`  1. Login to the web app`);
    console.log(`  2. Set room prices in Settings → Rates`);
    console.log(`  3. Configure Telegram notifications in Settings → Notifications`);
    console.log(`  4. Test full cycle: Book → Confirm → Check-in → Pay → Check-out`);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Onboarding failed, rolled back:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seedHotel().catch((err) => {
  console.error(err);
  process.exit(1);
});
