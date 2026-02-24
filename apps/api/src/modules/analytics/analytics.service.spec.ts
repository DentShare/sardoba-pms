import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { Booking } from '../../database/entities/booking.entity';
import { Room } from '../../database/entities/room.entity';

// ── Mock factory ────────────────────────────────────────────────────────────

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
});

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(Booking), useFactory: mockRepository },
        { provide: getRepositoryToken(Room), useFactory: mockRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── getSummary ──────────────────────────────────────────────────────────

  describe('getSummary', () => {
    it('should calculate correct occupancy, ADR, and RevPAR', async () => {
      // 10 rooms, 30 days = 300 available nights
      // 150 occupied nights, 15,000,000 tiyin revenue (150,000 sum)
      dataSource.query
        // Room count
        .mockResolvedValueOnce([{ total_rooms: 10 }])
        // Metrics: revenue, bookings, occupied_nights, avg_stay
        .mockResolvedValueOnce([
          {
            revenue: '15000000',
            total_bookings: 50,
            occupied_nights: 150,
            avg_stay_nights: 3.0,
          },
        ])
        // Top source
        .mockResolvedValueOnce([{ source: 'direct', cnt: 30 }]);

      const result = await service.getSummary(1, '2025-01-01', '2025-01-31');

      // occupancyRate = (150 / 300) * 100 = 50%
      expect(result.occupancy_rate).toBe(50);
      // ADR = 15,000,000 / 150 = 100,000 tiyin
      expect(result.adr).toBe(100000);
      // RevPAR = 100,000 * (50/100) = 50,000 tiyin
      expect(result.revpar).toBe(50000);
      expect(result.revenue).toBe(15000000);
      expect(result.total_bookings).toBe(50);
      expect(result.avg_stay_nights).toBe(3.0);
      expect(result.top_source).toBe('direct');
    });

    it('should return zeros when there are no rooms', async () => {
      dataSource.query.mockResolvedValueOnce([{ total_rooms: 0 }]);

      const result = await service.getSummary(1, '2025-01-01', '2025-01-31');

      expect(result.occupancy_rate).toBe(0);
      expect(result.adr).toBe(0);
      expect(result.revpar).toBe(0);
      expect(result.revenue).toBe(0);
      expect(result.total_bookings).toBe(0);
      expect(result.top_source).toBeNull();
    });

    it('should calculate delta percentages when comparison period provided', async () => {
      // Primary period: 60% occupancy, 20M revenue
      dataSource.query
        .mockResolvedValueOnce([{ total_rooms: 10 }])
        .mockResolvedValueOnce([
          {
            revenue: '20000000',
            total_bookings: 60,
            occupied_nights: 180,
            avg_stay_nights: 3.0,
          },
        ])
        .mockResolvedValueOnce([{ source: 'booking_com', cnt: 35 }]);

      // Compare period: 40% occupancy, 10M revenue
      dataSource.query
        .mockResolvedValueOnce([{ total_rooms: 10 }])
        .mockResolvedValueOnce([
          {
            revenue: '10000000',
            total_bookings: 30,
            occupied_nights: 120,
            avg_stay_nights: 2.5,
          },
        ])
        .mockResolvedValueOnce([{ source: 'direct', cnt: 20 }]);

      const result = await service.getSummary(
        1,
        '2025-02-01',
        '2025-03-01',
        '2025-01-01',
        '2025-02-01',
      );

      expect(result.compare).toBeDefined();
      expect(result.delta).toBeDefined();

      // Revenue delta: (20M - 10M) / 10M * 100 = 100%
      expect(result.delta!.revenue).toBe(100);
      // Bookings delta: (60 - 30) / 30 * 100 = 100%
      expect(result.delta!.total_bookings).toBe(100);
    });

    it('should throw INVALID_DATE_RANGE when date_from >= date_to', async () => {
      await expect(
        service.getSummary(1, '2025-02-01', '2025-01-01'),
      ).rejects.toThrow();

      await expect(
        service.getSummary(1, '2025-01-01', '2025-01-01'),
      ).rejects.toThrow();
    });
  });

  // ── getOccupancy ────────────────────────────────────────────────────────

  describe('getOccupancy', () => {
    it('should return daily occupancy rows', async () => {
      dataSource.query.mockResolvedValueOnce([
        {
          date: '2025-01-01',
          bookings_count: 5,
          occupied_rooms: 5,
          total_rooms: 10,
          occupancy_rate: '50.0',
        },
        {
          date: '2025-01-02',
          bookings_count: 8,
          occupied_rooms: 8,
          total_rooms: 10,
          occupancy_rate: '80.0',
        },
      ]);

      const result = await service.getOccupancy(1, '2025-01-01', '2025-01-03');

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2025-01-01');
      expect(result[0].occupancy_rate).toBe(50.0);
      expect(result[1].occupancy_rate).toBe(80.0);
    });
  });

  // ── getRevenue ──────────────────────────────────────────────────────────

  describe('getRevenue', () => {
    it('should return monthly revenue grouped by month', async () => {
      dataSource.query.mockResolvedValueOnce([
        { month: '2025-01', revenue: '5000000', bookings_count: 20 },
        { month: '2025-02', revenue: '7000000', bookings_count: 30 },
      ]);

      const result = await service.getRevenue(1, '2025-01-01', '2025-03-01');

      expect(result).toHaveLength(2);
      expect(result[0].month).toBe('2025-01');
      expect(result[0].revenue).toBe(5000000);
      expect(result[1].revenue).toBe(7000000);
      expect(result[0].bookings_count).toBe(20);
    });
  });

  // ── getSources ──────────────────────────────────────────────────────────

  describe('getSources', () => {
    it('should return source breakdown with percentages summing to ~100', async () => {
      dataSource.query.mockResolvedValueOnce([
        { source: 'direct', count: 30, revenue: '3000000', percentage: '50.0' },
        { source: 'booking_com', count: 18, revenue: '2000000', percentage: '30.0' },
        { source: 'airbnb', count: 12, revenue: '1000000', percentage: '20.0' },
      ]);

      const result = await service.getSources(1, '2025-01-01', '2025-02-01');

      expect(result).toHaveLength(3);

      // Percentages should sum to 100
      const totalPercentage = result.reduce((sum, r) => sum + r.percentage, 0);
      expect(totalPercentage).toBe(100);

      // Sorted by count DESC
      expect(result[0].source).toBe('direct');
      expect(result[0].count).toBe(30);
      expect(result[0].revenue).toBe(3000000);
    });
  });

  // ── getGuestStats ───────────────────────────────────────────────────────

  describe('getGuestStats', () => {
    it('should return guest stats with nationality breakdown', async () => {
      dataSource.query
        // Total guests
        .mockResolvedValueOnce([{ total_guests: 50 }])
        // New guests
        .mockResolvedValueOnce([{ new_guests: 35 }])
        // Nationality breakdown
        .mockResolvedValueOnce([
          { nationality: 'UZ', count: 30 },
          { nationality: 'RU', count: 15 },
          { nationality: 'DE', count: 5 },
        ]);

      const result = await service.getGuestStats(1, '2025-01-01', '2025-02-01');

      expect(result.total_guests).toBe(50);
      expect(result.new_guests).toBe(35);
      expect(result.returning_guests).toBe(15);
      expect(result.by_nationality).toHaveLength(3);
      expect(result.by_nationality[0].nationality).toBe('UZ');
    });
  });

  // ── getRoomStats ────────────────────────────────────────────────────────

  describe('getRoomStats', () => {
    it('should return room stats ordered by revenue DESC', async () => {
      dataSource.query.mockResolvedValueOnce([
        {
          room_id: 2,
          room_name: 'Suite 201',
          room_type: 'suite',
          revenue: '8000000',
          nights_sold: 25,
          occupancy_rate: '83.3',
        },
        {
          room_id: 1,
          room_name: 'Room 101',
          room_type: 'double',
          revenue: '5000000',
          nights_sold: 20,
          occupancy_rate: '66.7',
        },
        {
          room_id: 3,
          room_name: 'Room 102',
          room_type: 'single',
          revenue: '2000000',
          nights_sold: 10,
          occupancy_rate: '33.3',
        },
      ]);

      const result = await service.getRoomStats(1, '2025-01-01', '2025-01-31');

      expect(result).toHaveLength(3);
      // Should be ordered by revenue DESC (suite first)
      expect(result[0].room_name).toBe('Suite 201');
      expect(result[0].revenue).toBe(8000000);
      expect(result[0].nights_sold).toBe(25);
      expect(result[0].occupancy_rate).toBe(83.3);

      // Verify descending order
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].revenue).toBeGreaterThanOrEqual(result[i + 1].revenue);
      }
    });
  });

  // ── getBookingsForExport ────────────────────────────────────────────────

  describe('getBookingsForExport', () => {
    it('should return formatted bookings for export', async () => {
      dataSource.query.mockResolvedValueOnce([
        {
          booking_number: 'BK-2025-0001',
          guest_name: 'Ivanov Ivan',
          room_name: 'Room 101',
          check_in: '2025-01-05',
          check_out: '2025-01-08',
          nights: 3,
          total_amount: '450000',
          paid_amount: '450000',
          status: 'checked_out',
          source: 'direct',
        },
      ]);

      const result = await service.getBookingsForExport(
        1,
        '2025-01-01',
        '2025-02-01',
      );

      expect(result).toHaveLength(1);
      expect(result[0].booking_number).toBe('BK-2025-0001');
      expect(result[0].total_amount).toBe(450000);
      expect(result[0].check_in).toBe('2025-01-05');
    });
  });
});
