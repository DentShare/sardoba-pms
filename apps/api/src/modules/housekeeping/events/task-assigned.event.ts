export class TaskAssignedEvent {
  constructor(
    public readonly propertyId: number,
    public readonly roomName: string,
    public readonly taskType: string,
    public readonly maidName: string,
    public readonly priority: string,
    public readonly notes?: string,
  ) {}
}
