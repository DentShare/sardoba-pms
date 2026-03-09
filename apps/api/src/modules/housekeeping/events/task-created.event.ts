export class TaskCreatedEvent {
  constructor(
    public readonly propertyId: number,
    public readonly roomName: string,
    public readonly roomType: string,
    public readonly taskType: 'standard' | 'checkout' | 'deep',
    public readonly priority: string,
    public readonly assignedTo?: string,
    public readonly notes?: string,
  ) {}
}
