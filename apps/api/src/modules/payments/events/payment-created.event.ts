export class PaymentCreatedEvent {
  constructor(
    public readonly paymentId: number,
    public readonly bookingId: number,
    public readonly propertyId: number,
    public readonly amount: number,
    public readonly method: string,
    public readonly paidAmount: number,
    public readonly totalAmount: number,
    public readonly createdBy: number | null,
  ) {}
}
