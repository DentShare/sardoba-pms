import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';
import { Booking, BookingStatus } from '@/database/entities/booking.entity';
import { Channel } from '@/database/entities/channel.entity';
import { Guest } from '@/database/entities/guest.entity';
import { ChannelManagerService } from '../channel-manager.service';

/**
 * Parsed VEVENT entry from an iCal feed.
 */
interface ICalEvent {
  uid: string;
  summary: string;
  dtstart: string;
  dtend: string;
  description?: string;
}

@Injectable()
export class AirbnbIcalService {
  private readonly logger = new Logger(AirbnbIcalService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Guest)
    private readonly guestRepository: Repository<Guest>,
    private readonly channelManagerService: ChannelManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── Cron job: poll iCal feeds every 15 minutes ──────────────────────────

  @Cron('*/15 * * * *')
  async pollAllAirbnbChannels(): Promise<void> {
    this.logger.log('Starting Airbnb iCal polling cycle...');

    const channels =
      await this.channelManagerService.getActiveChannelsByType('airbnb');

    if (channels.length === 0) {
      this.logger.debug('No active Airbnb channels found, skipping poll.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const channel of channels) {
      try {
        await this.pollChannel(channel);
        successCount++;
      } catch (error) {
        errorCount++;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        this.logger.error(
          `Failed to poll Airbnb iCal for channelId=${channel.id}: ${errorMessage}`,
        );

        await this.channelManagerService.createSyncLog(
          channel.id,
          'ical_poll',
          'error',
          { property_id: channel.propertyId },
          errorMessage,
        );

        this.eventEmitter.emit('sync.error', {
          channelId: channel.id,
          channelType: 'airbnb',
          eventType: 'ical_poll',
          error: errorMessage,
        });
      }
    }

    this.logger.log(
      `Airbnb iCal polling complete: ${successCount} success, ${errorCount} errors`,
    );
  }

  // ── pollChannel ──────────────────────────────────────────────────────────

  /**
   * Poll a single Airbnb channel's iCal feed and sync bookings.
   */
  async pollChannel(channel: Channel): Promise<void> {
    let credentials: Record<string, unknown>;
    try {
      credentials = JSON.parse(channel.credentials.toString('utf-8'));
    } catch {
      throw new Error('Failed to parse channel credentials');
    }

    const icalUrl = credentials.ical_url as string;
    if (!icalUrl) {
      throw new Error('No ical_url configured for this Airbnb channel');
    }

    // Fetch the iCal feed
    const icalData = await this.fetchIcalFeed(icalUrl);
    const events = this.parseIcal(icalData);

    this.logger.debug(
      `Parsed ${events.length} events from Airbnb iCal for channelId=${channel.id}`,
    );

    let created = 0;
    let updated = 0;
    let unchanged = 0;

    for (const event of events) {
      try {
        const result = await this.syncEvent(channel, event);
        if (result === 'created') created++;
        else if (result === 'updated') updated++;
        else unchanged++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Failed to sync iCal event uid=${event.uid}: ${errorMessage}`,
        );
      }
    }

    // Log sync results
    await this.channelManagerService.createSyncLog(
      channel.id,
      'ical_poll',
      'success',
      {
        total_events: events.length,
        created,
        updated,
        unchanged,
      },
    );

    await this.channelManagerService.updateLastSyncAt(channel.id);

    this.logger.log(
      `Airbnb iCal sync for channelId=${channel.id}: ` +
        `${created} created, ${updated} updated, ${unchanged} unchanged`,
    );
  }

  // ── syncEvent ────────────────────────────────────────────────────────────

  /**
   * Sync a single iCal VEVENT with the booking database.
   * Returns 'created', 'updated', or 'unchanged'.
   */
  private async syncEvent(
    channel: Channel,
    event: ICalEvent,
  ): Promise<'created' | 'updated' | 'unchanged'> {
    // Use UID as the source reference
    const sourceRef = `airbnb-${event.uid}`;

    // Check if booking already exists
    const existing = await this.bookingRepository.findOne({
      where: {
        sourceReference: sourceRef,
        source: 'airbnb',
        propertyId: channel.propertyId,
      },
    });

    if (existing) {
      // Check if dates changed
      const checkIn = this.normalizeDate(event.dtstart);
      const checkOut = this.normalizeDate(event.dtend);

      if (existing.checkIn === checkIn && existing.checkOut === checkOut) {
        return 'unchanged';
      }

      // Update existing booking
      existing.checkIn = checkIn;
      existing.checkOut = checkOut;
      existing.nights = differenceInCalendarDays(
        parseISO(checkOut),
        parseISO(checkIn),
      );

      await this.bookingRepository.save(existing);
      return 'updated';
    }

    // Resolve room mapping - get the first mapping for this channel
    // (Airbnb iCal typically represents a single listing/room)
    const mappings = await this.channelManagerService.getMappings(channel.id);
    const mappingData = mappings.data;

    if (!mappingData || mappingData.length === 0) {
      this.logger.warn(
        `No room mapping for Airbnb channelId=${channel.id}, skipping event uid=${event.uid}`,
      );
      return 'unchanged';
    }

    const roomId = (mappingData[0] as any).room_id as number;
    const checkIn = this.normalizeDate(event.dtstart);
    const checkOut = this.normalizeDate(event.dtend);
    const nights = differenceInCalendarDays(
      parseISO(checkOut),
      parseISO(checkIn),
    );

    if (nights <= 0) {
      return 'unchanged';
    }

    // Parse guest name from summary
    const guestName = event.summary || 'Airbnb Guest';
    const nameParts = guestName.split(/\s+/);
    const firstName = nameParts[0] || 'Airbnb';
    const lastName = nameParts.slice(1).join(' ') || 'Guest';

    // Find or create guest
    const guest = await this.findOrCreateAirbnbGuest(
      channel.propertyId,
      firstName,
      lastName,
    );

    // Generate booking number
    const bookingNumber = await this.generateIcalBookingNumber();

    // Create booking
    const booking = this.bookingRepository.create({
      bookingNumber,
      propertyId: channel.propertyId,
      roomId,
      guestId: guest.id,
      rateId: null,
      checkIn,
      checkOut,
      nights,
      adults: 1,
      children: 0,
      totalAmount: 0,
      paidAmount: 0,
      status: 'confirmed' as BookingStatus,
      source: 'airbnb',
      sourceReference: sourceRef,
      notes: event.description || 'Imported from Airbnb iCal',
      createdBy: 0,
    });

    await this.bookingRepository.save(booking);

    // Emit booking.created event
    this.eventEmitter.emit('booking.created', {
      bookingId: booking.id,
      propertyId: booking.propertyId,
      roomId: booking.roomId,
      guestId: booking.guestId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalAmount: booking.totalAmount,
      bookingNumber: booking.bookingNumber,
      createdBy: 0,
    });

    return 'created';
  }

  // ── fetchIcalFeed ────────────────────────────────────────────────────────

  /**
   * Fetch an iCal feed from a URL.
   * Uses native fetch (Node 18+).
   */
  async fetchIcalFeed(url: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SardobaPMS/1.0 iCal Sync',
        },
      });

      if (!response.ok) {
        throw new Error(
          `iCal fetch failed: HTTP ${response.status} ${response.statusText}`,
        );
      }

      return response.text();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── parseIcal ────────────────────────────────────────────────────────────

  /**
   * Parse an iCal string and extract VEVENT entries.
   * Lightweight parser that handles Airbnb iCal format.
   */
  parseIcal(icalData: string): ICalEvent[] {
    const events: ICalEvent[] = [];
    const lines = icalData.replace(/\r\n /g, '').split(/\r?\n/);

    let inEvent = false;
    let currentEvent: Partial<ICalEvent> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === 'BEGIN:VEVENT') {
        inEvent = true;
        currentEvent = {};
        continue;
      }

      if (trimmed === 'END:VEVENT') {
        inEvent = false;
        if (currentEvent.uid && currentEvent.dtstart && currentEvent.dtend) {
          events.push(currentEvent as ICalEvent);
        }
        continue;
      }

      if (!inEvent) continue;

      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;

      let key = trimmed.substring(0, colonIdx);
      const value = trimmed.substring(colonIdx + 1);

      // Handle parameters like DTSTART;VALUE=DATE:20250301
      const semicolonIdx = key.indexOf(';');
      if (semicolonIdx !== -1) {
        key = key.substring(0, semicolonIdx);
      }

      switch (key) {
        case 'UID':
          currentEvent.uid = value;
          break;
        case 'SUMMARY':
          currentEvent.summary = value;
          break;
        case 'DTSTART':
          currentEvent.dtstart = value;
          break;
        case 'DTEND':
          currentEvent.dtend = value;
          break;
        case 'DESCRIPTION':
          currentEvent.description = value;
          break;
      }
    }

    return events;
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Normalize iCal date formats to YYYY-MM-DD.
   * Handles: 20250301, 20250301T140000Z, 2025-03-01
   */
  private normalizeDate(dateStr: string): string {
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // YYYYMMDD or YYYYMMDDTHHMMSSZ format
    const cleaned = dateStr.replace(/[TZ]/g, '').substring(0, 8);
    if (/^\d{8}$/.test(cleaned)) {
      return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 8)}`;
    }

    // Fallback: try to parse with date-fns
    try {
      const parsed = parseISO(dateStr);
      return format(parsed, 'yyyy-MM-dd');
    } catch {
      return dateStr;
    }
  }

  /**
   * Find or create a guest for Airbnb bookings.
   */
  private async findOrCreateAirbnbGuest(
    propertyId: number,
    firstName: string,
    lastName: string,
  ): Promise<Guest> {
    // Try to find existing guest with same name
    const existing = await this.guestRepository.findOne({
      where: { propertyId, firstName, lastName },
    });

    if (existing) {
      return existing;
    }

    const guest = this.guestRepository.create({
      propertyId,
      firstName,
      lastName,
      phone: `airbnb-${Date.now()}`,
      email: null,
      nationality: null,
      documentType: null,
      documentNumber: null,
      dateOfBirth: null,
      isVip: false,
      notes: 'Created from Airbnb iCal import',
    });

    return this.guestRepository.save(guest);
  }

  /**
   * Generate a booking number for iCal-imported bookings.
   */
  private async generateIcalBookingNumber(): Promise<string> {
    const now = new Date();
    const dateStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');

    const randomSuffix = String(
      Math.floor(1000 + Math.random() * 9000),
    );

    const bookingNumber = `AIR-${dateStr}-${randomSuffix}`;

    // Ensure uniqueness
    const existing = await this.bookingRepository.findOne({
      where: { bookingNumber },
    });

    if (existing) {
      return this.generateIcalBookingNumber();
    }

    return bookingNumber;
  }
}
