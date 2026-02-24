import { BookingStatus } from '@/database/entities/booking.entity';

export class BookingStatusChangedEvent {
  constructor(
    public readonly bookingId: number,
    public readonly propertyId: number,
    public readonly roomId: number,
    public readonly bookingNumber: string,
    public readonly oldStatus: BookingStatus,
    public readonly newStatus: BookingStatus,
    public readonly changedBy: number,
  ) {}
}
