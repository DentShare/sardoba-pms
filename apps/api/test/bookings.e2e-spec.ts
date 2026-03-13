import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Bookings API Integration Tests
 *
 * Tests the full booking lifecycle through real HTTP requests.
 * Requires a running PostgreSQL database with seed-test data.
 *
 * Run: npx jest --config apps/api/test/jest-e2e.json bookings.e2e-spec
 */

describe('Bookings API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let propertyId: number;
  let createdBookingId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Login to get auth token
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'admin@sardoba.uz', password: 'Admin123!' })
      .expect(200);

    authToken = loginRes.body.access_token || loginRes.body.accessToken;
    expect(authToken).toBeTruthy();

    // Get user info to find propertyId
    const meRes = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    propertyId = meRes.body.propertyId || meRes.body.property_id;
    expect(propertyId).toBeTruthy();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ── Authentication ──────────────────────────────────────────────────

  it('should reject requests without auth token', async () => {
    await request(app.getHttpServer())
      .get(`/v1/properties/${propertyId}/bookings`)
      .expect(401);
  });

  // ── List Bookings ───────────────────────────────────────────────────

  it('should list bookings with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/properties/${propertyId}/bookings`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data || res.body).toBeDefined();
    // Should have bookings from seed data
    const bookings = res.body.data || res.body;
    expect(Array.isArray(bookings)).toBe(true);
    expect(bookings.length).toBeGreaterThan(0);
  });

  it('should filter bookings by status', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/properties/${propertyId}/bookings?status=new`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const bookings = res.body.data || res.body;
    if (Array.isArray(bookings) && bookings.length > 0) {
      bookings.forEach((b: any) => {
        expect(b.status).toBe('new');
      });
    }
  });

  // ── Create Booking ──────────────────────────────────────────────────

  it('should create a new booking', async () => {
    // First, get rooms to find a valid room ID
    const roomsRes = await request(app.getHttpServer())
      .get(`/v1/properties/${propertyId}/rooms`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const rooms = roomsRes.body.data || roomsRes.body;
    expect(rooms.length).toBeGreaterThan(0);
    const roomId = rooms[0].id;

    // Get guests
    const guestsRes = await request(app.getHttpServer())
      .get(`/v1/properties/${propertyId}/guests`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const guests = guestsRes.body.data || guestsRes.body;
    expect(guests.length).toBeGreaterThan(0);
    const guestId = guests[0].id;

    // Create booking (far future to avoid conflicts)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 60);
    const checkIn = futureDate.toISOString().split('T')[0];
    futureDate.setDate(futureDate.getDate() + 2);
    const checkOut = futureDate.toISOString().split('T')[0];

    const res = await request(app.getHttpServer())
      .post('/v1/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        property_id: propertyId,
        room_id: roomId,
        guest_id: guestId,
        check_in: checkIn,
        check_out: checkOut,
        adults: 2,
        children: 0,
        source: 'direct',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.bookingNumber || res.body.booking_number).toBeDefined();
    expect(res.body.status).toBe('new');

    createdBookingId = res.body.id;
  });

  // ── Get Booking Detail ──────────────────────────────────────────────

  it('should get booking details', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.id).toBe(createdBookingId);
    expect(res.body.status).toBe('new');
    // Should include guest and room info
    expect(res.body.guestId || res.body.guest_id || res.body.guest).toBeTruthy();
    expect(res.body.roomId || res.body.room_id || res.body.room).toBeTruthy();
  });

  // ── Confirm Booking ─────────────────────────────────────────────────

  it('should confirm a new booking', async () => {
    const res = await request(app.getHttpServer())
      .post(`/v1/bookings/${createdBookingId}/confirm`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.status).toBe('confirmed');
  });

  // ── Check In ────────────────────────────────────────────────────────

  it('should check in a confirmed booking', async () => {
    const res = await request(app.getHttpServer())
      .post(`/v1/bookings/${createdBookingId}/check-in`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.status).toBe('checked_in');
  });

  // ── Check Out ───────────────────────────────────────────────────────

  it('should check out a checked-in booking', async () => {
    const res = await request(app.getHttpServer())
      .post(`/v1/bookings/${createdBookingId}/check-out`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.status).toBe('checked_out');
  });

  // ── Cancel Booking ──────────────────────────────────────────────────

  it('should cancel a new booking', async () => {
    // Create another booking to cancel
    const roomsRes = await request(app.getHttpServer())
      .get(`/v1/properties/${propertyId}/rooms`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const rooms = roomsRes.body.data || roomsRes.body;
    const guestsRes = await request(app.getHttpServer())
      .get(`/v1/properties/${propertyId}/guests`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const guests = guestsRes.body.data || guestsRes.body;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 70);
    const checkIn = futureDate.toISOString().split('T')[0];
    futureDate.setDate(futureDate.getDate() + 1);
    const checkOut = futureDate.toISOString().split('T')[0];

    const createRes = await request(app.getHttpServer())
      .post('/v1/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        property_id: propertyId,
        room_id: rooms[0].id,
        guest_id: guests[0].id,
        check_in: checkIn,
        check_out: checkOut,
        adults: 1,
        source: 'direct',
      })
      .expect(201);

    const cancelRes = await request(app.getHttpServer())
      .post(`/v1/bookings/${createRes.body.id}/cancel`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: 'E2E test cancellation' })
      .expect(200);

    expect(cancelRes.body.status).toBe('cancelled');
    expect(cancelRes.body.cancelReason || cancelRes.body.cancel_reason).toBe('E2E test cancellation');
  });

  // ── Error Cases ─────────────────────────────────────────────────────

  it('should return 404 for non-existent booking', async () => {
    await request(app.getHttpServer())
      .get('/v1/bookings/999999')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });

  it('should reject confirm on already checked-out booking', async () => {
    // The createdBookingId is now checked_out; confirm should fail
    await request(app.getHttpServer())
      .post(`/v1/bookings/${createdBookingId}/confirm`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(422);
  });

  // ── Calendar ────────────────────────────────────────────────────────

  it('should return calendar data for a date range', async () => {
    const today = new Date();
    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0];

    const res = await request(app.getHttpServer())
      .get(`/v1/properties/${propertyId}/calendar?date_from=${dateFrom}&date_to=${dateTo}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Should have rooms and bookings data
    expect(res.body).toBeDefined();
  });

  // ── Today Summary ───────────────────────────────────────────────────

  it('should return today summary', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/properties/${propertyId}/today`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body).toBeDefined();
  });
});
