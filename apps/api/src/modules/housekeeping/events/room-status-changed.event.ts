export class RoomStatusChangedEvent {
  constructor(
    public readonly propertyId: number,
    public readonly roomName: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
    public readonly changedBy: string,
  ) {}
}
