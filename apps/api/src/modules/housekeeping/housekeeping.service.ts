import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CleaningTask } from '@/database/entities/cleaning-task.entity';
import { RoomCleaningStatus } from '@/database/entities/room-cleaning-status.entity';
import { Room } from '@/database/entities/room.entity';
import { Booking } from '@/database/entities/booking.entity';
import { User } from '@/database/entities/user.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';

@Injectable()
export class HousekeepingService {
  constructor(
    @InjectRepository(CleaningTask)
    private readonly taskRepository: Repository<CleaningTask>,
    @InjectRepository(RoomCleaningStatus)
    private readonly roomStatusRepository: Repository<RoomCleaningStatus>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── Get all room cleaning statuses with room info ─────────────────────────

  async getRoomStatuses(propertyId: number) {
    const rooms = await this.roomRepository.find({
      where: { propertyId, status: 'active' },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    const statuses = await this.roomStatusRepository.find({
      where: { propertyId },
    });

    const statusMap = new Map(
      statuses.map((s) => [s.roomId, s]),
    );

    const data = rooms.map((room) => {
      const status = statusMap.get(room.id);
      return {
        room_id: room.id,
        room_name: room.name,
        room_type: room.roomType,
        floor: room.floor,
        cleaning_status: status?.cleaningStatus ?? 'clean',
        last_cleaned_at: status?.lastCleanedAt ?? null,
        last_cleaned_by: status?.lastCleanedBy ?? null,
        updated_at: status?.updatedAt ?? null,
      };
    });

    return { data };
  }

  // ── Update a room's cleaning status ───────────────────────────────────────

  async updateRoomStatus(
    propertyId: number,
    roomId: number,
    cleaningStatus: string,
    userId: number,
  ): Promise<Record<string, unknown>> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId, propertyId },
    });

    if (!room) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'room',
        id: roomId,
      });
    }

    let status = await this.roomStatusRepository.findOne({
      where: { propertyId, roomId },
    });

    const oldStatus = status?.cleaningStatus ?? 'clean';

    if (!status) {
      status = this.roomStatusRepository.create({
        propertyId,
        roomId,
        cleaningStatus: cleaningStatus as RoomCleaningStatus['cleaningStatus'],
      });
    } else {
      status.cleaningStatus = cleaningStatus as RoomCleaningStatus['cleaningStatus'];
    }

    if (cleaningStatus === 'clean') {
      status.lastCleanedAt = new Date();
      status.lastCleanedBy = userId;
    }

    const saved = await this.roomStatusRepository.save(status);

    if (oldStatus !== cleaningStatus) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      this.eventEmitter.emit('housekeeping.room.status_changed', {
        propertyId,
        roomName: room.name,
        oldStatus,
        newStatus: cleaningStatus,
        changedBy: user?.name ?? `User #${userId}`,
      });
    }

    return this.roomStatusToResponseFormat(saved, room);
  }

  // ── List tasks with pagination and filters ────────────────────────────────

  async findAllTasks(propertyId: number, filter: TaskFilterDto) {
    const page = filter.page ?? 1;
    const perPage = filter.per_page ?? 20;
    const skip = (page - 1) * perPage;

    const qb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.room', 'room')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.propertyId = :propertyId', { propertyId });

    if (filter.task_status) {
      qb.andWhere('task.taskStatus = :taskStatus', { taskStatus: filter.task_status });
    }

    if (filter.task_type) {
      qb.andWhere('task.taskType = :taskType', { taskType: filter.task_type });
    }

    if (filter.assigned_to) {
      qb.andWhere('task.assignedTo = :assignedTo', { assignedTo: filter.assigned_to });
    }

    if (filter.room_id) {
      qb.andWhere('task.roomId = :roomId', { roomId: filter.room_id });
    }

    qb.orderBy('task.createdAt', 'DESC');

    const [tasks, total] = await qb.skip(skip).take(perPage).getManyAndCount();

    return {
      data: tasks.map((task) => this.taskToResponseFormat(task)),
      meta: {
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage) || 1,
      },
    };
  }

  // ── Get single task with relations ────────────────────────────────────────

  async findOneTask(taskId: number): Promise<Record<string, unknown>> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['room', 'assignee'],
    });

    if (!task) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'cleaning_task',
        id: taskId,
      });
    }

    return this.taskToResponseFormat(task);
  }

  // ── Create cleaning task ──────────────────────────────────────────────────

  async createTask(
    propertyId: number,
    dto: CreateTaskDto,
  ): Promise<Record<string, unknown>> {
    const room = await this.roomRepository.findOne({
      where: { id: dto.room_id, propertyId },
    });

    if (!room) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'room',
        id: dto.room_id,
      });
    }

    if (dto.assigned_to) {
      const user = await this.userRepository.findOne({
        where: { id: dto.assigned_to, propertyId },
      });

      if (!user) {
        throw new SardobaException(ErrorCode.NOT_FOUND, {
          resource: 'user',
          id: dto.assigned_to,
        });
      }
    }

    const task = this.taskRepository.create({
      propertyId,
      roomId: dto.room_id,
      assignedTo: dto.assigned_to ?? null,
      taskType: dto.task_type,
      cleaningStatus: 'dirty',
      taskStatus: dto.assigned_to ? 'assigned' : 'pending',
      priority: dto.priority ?? 'normal',
      notes: dto.notes ?? null,
    });

    const saved = await this.taskRepository.save(task);

    await this.updateRoomStatusInternal(propertyId, dto.room_id, 'dirty');

    const full = await this.taskRepository.findOne({
      where: { id: saved.id },
      relations: ['room', 'assignee'],
    });

    this.eventEmitter.emit('housekeeping.task.created', {
      propertyId,
      roomName: room.name,
      roomType: room.roomType,
      taskType: dto.task_type,
      priority: dto.priority ?? 'normal',
      assignedTo: full!.assignee?.name,
      notes: dto.notes,
    });

    if (dto.assigned_to && full!.assignee) {
      this.eventEmitter.emit('housekeeping.task.assigned', {
        propertyId,
        roomName: room.name,
        taskType: dto.task_type,
        maidName: full!.assignee.name,
        priority: dto.priority ?? 'normal',
        notes: dto.notes,
      });
    }

    return this.taskToResponseFormat(full!);
  }

  // ── Update task (assign, start, complete, verify) ─────────────────────────

  async updateTask(
    taskId: number,
    dto: UpdateTaskDto,
    userId: number,
  ): Promise<Record<string, unknown>> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['room', 'assignee'],
    });

    if (!task) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'cleaning_task',
        id: taskId,
      });
    }

    if (dto.assigned_to !== undefined) {
      if (dto.assigned_to) {
        const user = await this.userRepository.findOne({
          where: { id: dto.assigned_to, propertyId: task.propertyId },
        });

        if (!user) {
          throw new SardobaException(ErrorCode.NOT_FOUND, {
            resource: 'user',
            id: dto.assigned_to,
          });
        }
      }
      task.assignedTo = dto.assigned_to;
    }

    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.notes !== undefined) task.notes = dto.notes;

    if (dto.task_status !== undefined) {
      task.taskStatus = dto.task_status;

      if (dto.task_status === 'in_progress') {
        task.startedAt = new Date();
        task.cleaningStatus = 'cleaning';
        await this.updateRoomStatusInternal(task.propertyId, task.roomId, 'cleaning');
      }

      if (dto.task_status === 'completed') {
        task.completedAt = new Date();
        task.cleaningStatus = 'inspection';

        if (task.startedAt) {
          const diffMs = task.completedAt.getTime() - task.startedAt.getTime();
          task.durationMinutes = Math.round(diffMs / 60000);
        }

        await this.updateRoomStatusInternal(task.propertyId, task.roomId, 'inspection');
      }

      if (dto.task_status === 'verified') {
        task.cleaningStatus = 'clean';
        await this.updateRoomStatusInternal(
          task.propertyId,
          task.roomId,
          'clean',
          userId,
        );
      }

      if (dto.task_status === 'assigned' && !task.assignedTo && dto.assigned_to) {
        task.assignedTo = dto.assigned_to;
      }
    }

    const saved = await this.taskRepository.save(task);

    const full = await this.taskRepository.findOne({
      where: { id: saved.id },
      relations: ['room', 'assignee'],
    });

    const roomName = full!.room?.name ?? `Room #${full!.roomId}`;

    if (dto.task_status === 'assigned' && full!.assignee) {
      this.eventEmitter.emit('housekeeping.task.assigned', {
        propertyId: full!.propertyId,
        roomName,
        taskType: full!.taskType,
        maidName: full!.assignee.name,
        priority: full!.priority,
        notes: full!.notes,
      });
    }

    if (dto.task_status === 'completed') {
      this.eventEmitter.emit('housekeeping.task.completed', {
        propertyId: full!.propertyId,
        roomName,
        taskType: full!.taskType,
        maidName: full!.assignee?.name ?? 'Не назначена',
        durationMinutes: full!.durationMinutes ?? 0,
      });
    }

    return this.taskToResponseFormat(full!);
  }

  // ── Delete a task ─────────────────────────────────────────────────────────

  async deleteTask(taskId: number): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'cleaning_task',
        id: taskId,
      });
    }

    await this.taskRepository.remove(task);
  }

  // ── Dashboard stats: counts by status ─────────────────────────────────────

  async getHousekeepingStats(propertyId: number) {
    const roomStatuses = await this.roomStatusRepository
      .createQueryBuilder('rs')
      .select('rs.cleaningStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('rs.propertyId = :propertyId', { propertyId })
      .groupBy('rs.cleaningStatus')
      .getRawMany();

    const taskStatuses = await this.taskRepository
      .createQueryBuilder('t')
      .select('t.taskStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('t.propertyId = :propertyId', { propertyId })
      .groupBy('t.taskStatus')
      .getRawMany();

    const totalRooms = await this.roomRepository.count({
      where: { propertyId, status: 'active' },
    });

    const roomStatusMap: Record<string, number> = {};
    for (const row of roomStatuses) {
      roomStatusMap[row.status] = parseInt(row.count, 10);
    }

    const taskStatusMap: Record<string, number> = {};
    for (const row of taskStatuses) {
      taskStatusMap[row.status] = parseInt(row.count, 10);
    }

    return {
      total_rooms: totalRooms,
      room_statuses: {
        clean: roomStatusMap['clean'] ?? 0,
        dirty: roomStatusMap['dirty'] ?? 0,
        cleaning: roomStatusMap['cleaning'] ?? 0,
        inspection: roomStatusMap['inspection'] ?? 0,
        do_not_disturb: roomStatusMap['do_not_disturb'] ?? 0,
        out_of_order: roomStatusMap['out_of_order'] ?? 0,
      },
      task_statuses: {
        pending: taskStatusMap['pending'] ?? 0,
        assigned: taskStatusMap['assigned'] ?? 0,
        in_progress: taskStatusMap['in_progress'] ?? 0,
        completed: taskStatusMap['completed'] ?? 0,
        verified: taskStatusMap['verified'] ?? 0,
      },
    };
  }

  // ── Auto-create checkout tasks for today's checkouts ──────────────────────

  async autoCreateTasksForCheckouts(propertyId: number) {
    const today = new Date().toISOString().split('T')[0];

    const checkouts = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.propertyId = :propertyId', { propertyId })
      .andWhere('booking.checkOut = :today', { today })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: ['confirmed', 'checked_in'],
      })
      .getMany();

    const existingTasks = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.propertyId = :propertyId', { propertyId })
      .andWhere('task.taskType = :taskType', { taskType: 'checkout' })
      .andWhere('task.createdAt >= :today', { today })
      .getMany();

    const existingRoomIds = new Set(existingTasks.map((t) => t.roomId));
    const created: Record<string, unknown>[] = [];

    for (const booking of checkouts) {
      if (existingRoomIds.has(booking.roomId)) continue;

      const task = this.taskRepository.create({
        propertyId,
        roomId: booking.roomId,
        assignedTo: null,
        taskType: 'checkout',
        cleaningStatus: 'dirty',
        taskStatus: 'pending',
        priority: 'normal',
        notes: `Auto-created for checkout booking #${booking.bookingNumber}`,
      });

      const saved = await this.taskRepository.save(task);
      await this.updateRoomStatusInternal(propertyId, booking.roomId, 'dirty');

      const full = await this.taskRepository.findOne({
        where: { id: saved.id },
        relations: ['room', 'assignee'],
      });

      created.push(this.taskToResponseFormat(full!));
    }

    return {
      created_count: created.length,
      data: created,
    };
  }

  // ── Verify task belongs to property (for controller) ──────────────────────

  async verifyTaskProperty(taskId: number, propertyId: number): Promise<CleaningTask> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'cleaning_task',
        id: taskId,
      });
    }

    if (task.propertyId !== propertyId) {
      throw new SardobaException(ErrorCode.FORBIDDEN, {
        reason: 'Task does not belong to your property',
      });
    }

    return task;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async updateRoomStatusInternal(
    propertyId: number,
    roomId: number,
    cleaningStatus: string,
    cleanedByUserId?: number,
  ): Promise<void> {
    let status = await this.roomStatusRepository.findOne({
      where: { propertyId, roomId },
    });

    if (!status) {
      status = this.roomStatusRepository.create({
        propertyId,
        roomId,
        cleaningStatus: cleaningStatus as RoomCleaningStatus['cleaningStatus'],
      });
    } else {
      status.cleaningStatus = cleaningStatus as RoomCleaningStatus['cleaningStatus'];
    }

    if (cleaningStatus === 'clean' && cleanedByUserId) {
      status.lastCleanedAt = new Date();
      status.lastCleanedBy = cleanedByUserId;
    }

    await this.roomStatusRepository.save(status);
  }

  private taskToResponseFormat(task: CleaningTask): Record<string, unknown> {
    const response: Record<string, unknown> = {
      id: task.id,
      property_id: task.propertyId,
      room_id: task.roomId,
      assigned_to: task.assignedTo,
      task_type: task.taskType,
      cleaning_status: task.cleaningStatus,
      task_status: task.taskStatus,
      priority: task.priority,
      notes: task.notes,
      started_at: task.startedAt,
      completed_at: task.completedAt,
      duration_minutes: task.durationMinutes,
      created_at: task.createdAt,
      updated_at: task.updatedAt,
    };

    if (task.room) {
      response.room = {
        id: task.room.id,
        name: task.room.name,
        room_type: task.room.roomType,
        floor: task.room.floor,
      };
    }

    if (task.assignee) {
      response.assignee = {
        id: task.assignee.id,
        name: task.assignee.name,
        email: task.assignee.email,
      };
    }

    return response;
  }

  private roomStatusToResponseFormat(
    status: RoomCleaningStatus,
    room: Room,
  ): Record<string, unknown> {
    return {
      id: status.id,
      property_id: status.propertyId,
      room_id: status.roomId,
      cleaning_status: status.cleaningStatus,
      last_cleaned_at: status.lastCleanedAt,
      last_cleaned_by: status.lastCleanedBy,
      updated_at: status.updatedAt,
      room: {
        id: room.id,
        name: room.name,
        room_type: room.roomType,
        floor: room.floor,
      },
    };
  }
}
