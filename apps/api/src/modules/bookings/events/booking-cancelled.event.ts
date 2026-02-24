export class BookingCancelledEvent {
  constructor(
    public readonly bookingId: number,
    public readonly propertyId: number,
    public readonly roomId: number,
    public readonly guestId: number,
    public readonly checkIn: string,
    public readonly checkOut: string,
    public readonly bookingNumber: string,
    public readonly cancelReason: string | null,
    public readonly cancelledBy: number,
  ) {}
}
