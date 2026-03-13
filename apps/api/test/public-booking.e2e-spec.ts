import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Public Booking API Integration Tests
 *
 * Tests the public-facing booking endpoints that don't require auth.
 * These are the endpoints used by the guest booking widget.
 *
 * Run: npx jest --config apps/api/test/jest-e2e.json public-booking.e2e-spec
 */

const SLUG = 'sardoba-guest-house';

describe('Public Booking API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ── GET /v1/book/:slug ──────────────────────────────────────────────

  it('should return hotel public info', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/book/${SLUG}`)
      .expect(200);

    expect(res.body.property).toBeDefined();
    expect(res.body.property.name).toBe('Sardoba Guest House');
    expect(res.body.property.currency).toBe('UZS');
    expect(res.body.rooms).toBeDefined();
    expect(Array.isArray(res.body.rooms)).toBe(true);
    expect(res.body.rooms.length).toBeGreaterThan(0);
    expect(res.body.extras).toBeDefined();
    expect(Array.isArray(res.body.extras)).toBe(true);
  });

  it('should return 404 for non-existent slug', async () => {
    await request(app.getHttpServer())
      .get('/v1/book/non-existent-hotel-xyz')
      .expect(404);
  });

  // ── GET /v1/book/:slug/rooms ────────────────────────────────────────

  it('should return available rooms for date range', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkIn = tomorrow.toISOString().split('T')[0];
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const checkOut = dayAfter.toISOString().split('T')[0];

    const res = await request(app.getHttpServer())
      .get(`/v1/book/${SLUG}/rooms?check_in=${checkIn}&check_out=${checkOut}`)
      .expect(200);

    // Should return rooms array (possibly nested in response)
    const rooms = res.body.rooms || res.body;
    expect(Array.isArray(rooms)).toBe(true);
    expect(rooms.length).toBeGreaterThan(0);

    // Each room should have price info
    const firstRoom = rooms[0];
    expect(firstRoom.id).toBeDefined();
    expect(firstRoom.name).toBeDefined();
  });

  // ── POST /v1/book/:slug/calculate ───────────────────────────────────

  it('should calculate price for room and dates', async () => {
    // First get rooms to get a valid room ID
    const hotelRes = await request(app.getHttpServer())
      .get(`/v1/book/${SLUG}`)
      .expect(200);

    const roomId = hotelRes.body.rooms[0].id;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 40);
    const checkIn = tomorrow.toISOString().split('T')[0];
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 3);
    const checkOut = dayAfter.toISOString().split('T')[0];

    const res = await request(app.getHttpServer())
      .post(`/v1/book/${SLUG}/calculate`)
      .send({
        room_id: roomId,
        check_in: checkIn,
        check_out: checkOut,
        adults: 2,
        children: 0,
      })
      .expect(200);

    // Should return price calculation
    expect(res.body.room || res.body.grand_total || res.body.total).toBeDefined();
    if (res.body.room) {
      expect(res.body.room.total).toBeGreaterThan(0);
      expect(res.body.room.nights).toBe(3);
    }
  });

  it('should calculate price with extras', async () => {
    const hotelRes = await request(app.getHttpServer())
      .get(`/v1/book/${SLUG}`)
      .expect(200);

    const roomId = hotelRes.body.rooms[0].id;
    const extras = hotelRes.body.extras;

    if (extras.length === 0) {
      // Skip if no extras in seed
      return;
    }

    const extraId = extras[0].id;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 41);
    const checkIn = tomorrow.toISOString().split('T')[0];
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const checkOut = dayAfter.toISOString().split('T')[0];

    const res = await request(app.getHttpServer())
      .post(`/v1/book/${SLUG}/calculate`)
      .send({
        room_id: roomId,
        check_in: checkIn,
        check_out: checkOut,
        adults: 2,
        children: 0,
        extras: [{ extra_id: extraId, quantity: 1 }],
      })
      .expect(200);

    // Grand total should include extras
    if (res.body.extras_total !== undefined) {
      expect(res.body.extras_total).toBeGreaterThan(0);
    }
  });

  // ── POST /v1/book/:slug (create booking) ────────────────────────────

  it('should create a public booking', async () => {
    const hotelRes = await request(app.getHttpServer())
      .get(`/v1/book/${SLUG}`)
      .expect(200);

    const roomId = hotelRes.body.rooms[0].id;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 50);
    const checkIn = futureDate.toISOString().split('T')[0];
    futureDate.setDate(futureDate.getDate() + 2);
    const checkOut = futureDate.toISOString().split('T')[0];

    const res = await request(app.getHttpServer())
      .post(`/v1/book/${SLUG}`)
      .send({
        room_id: roomId,
        check_in: checkIn,
        check_out: checkOut,
        adults: 2,
        children: 0,
        first_name: 'E2E',
        last_name: 'TestGuest',
        phone: '+998909876543',
      })
      .expect(201);

    expect(res.body.booking_number || res.body.bookingNumber).toBeDefined();
    expect(res.body.status).toBe('new');

    // Save booking number for confirmation test
    const bookingNumber = res.body.booking_number || res.body.bookingNumber;

    // ── GET confirmation ────────────────────────────────────────────

    const confirmRes = await request(app.getHttpServer())
      .get(`/v1/book/${SLUG}/confirmation/${bookingNumber}`)
      .expect(200);

    expect(confirmRes.body.booking_number || confirmRes.body.bookingNumber).toBe(bookingNumber);
    expect(confirmRes.body.check_in || confirmRes.body.checkIn).toBe(checkIn);

    // ── GET payment info ────────────────────────────────────────────

    const paymentRes = await request(app.getHttpServer())
      .get(`/v1/book/${SLUG}/payment-info/${bookingNumber}`)
      .expect(200);

    expect(paymentRes.body.booking_number || paymentRes.body.bookingNumber).toBe(bookingNumber);
    expect(paymentRes.body.total_amount || paymentRes.body.totalAmount).toBeGreaterThan(0);
  });

  // ── Validation ──────────────────────────────────────────────────────

  it('should reject booking with missing required fields', async () => {
    await request(app.getHttpServer())
      .post(`/v1/book/${SLUG}`)
      .send({
        // Missing room_id, dates, guest info
      })
      .expect(400);
  });

  it('should reject booking with checkout before checkin', async () => {
    const hotelRes = await request(app.getHttpServer())
      .get(`/v1/book/${SLUG}`)
      .expect(200);

    const roomId = hotelRes.body.rooms[0].id;

    await request(app.getHttpServer())
      .post(`/v1/book/${SLUG}`)
      .send({
        room_id: roomId,
        check_in: '2026-12-15',
        check_out: '2026-12-10', // before check_in
        adults: 1,
        first_name: 'Test',
        last_name: 'Invalid',
        phone: '+998901111111',
      })
      .expect(400);
  });

  // ── Promo Code ──────────────────────────────────────────────────────

  it('should handle promo code validation', async () => {
    const res = await request(app.getHttpServer())
      .post(`/v1/book/${SLUG}/validate-promo`)
      .send({ code: 'INVALID-CODE-XYZ' });

    // Should return 404 or 400 for invalid promo code
    expect([400, 404]).toContain(res.status);
  });
});
