export class BookingCreatedEvent {
  constructor(
    public readonly bookingId: number,
    public readonly propertyId: number,
    public readonly roomId: number,
    public readonly guestId: number,
    public readonly checkIn: string,
    public readonly checkOut: string,
    public readonly totalAmount: number,
    public readonly bookingNumber: string,
    public readonly createdBy: number,
  ) {}
}
