export class TaskCompletedEvent {
  constructor(
    public readonly propertyId: number,
    public readonly roomName: string,
    public readonly taskType: string,
    public readonly maidName: string,
    public readonly durationMinutes: number,
  ) {}
}
