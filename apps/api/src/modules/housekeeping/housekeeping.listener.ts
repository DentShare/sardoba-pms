import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationSettings } from '@/database/entities/notification-settings.entity';
import { TelegramService } from '@/modules/notifications/telegram/telegram.service';
import {
  housekeepingTaskCreatedTemplate,
  housekeepingTaskAssignedTemplate,
  housekeepingTaskCompletedTemplate,
  housekeepingRoomStatusChangedTemplate,
} from '@/modules/notifications/telegram/telegram.templates';

@Injectable()
export class HousekeepingListener {
  private readonly logger = new Logger(HousekeepingListener.name);

  constructor(
    private readonly telegramService: TelegramService,
    @InjectRepository(NotificationSettings)
    private readonly settingsRepository: Repository<NotificationSettings>,
  ) {}

  @OnEvent('housekeeping.task.created')
  async handleTaskCreated(payload: {
    propertyId: number;
    roomName: string;
    roomType: string;
    taskType: 'standard' | 'checkout' | 'deep';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    assignedTo?: string;
    notes?: string;
  }) {
    await this.notifyProperty(
      payload.propertyId,
      housekeepingTaskCreatedTemplate(payload),
    );
  }

  @OnEvent('housekeeping.task.assigned')
  async handleTaskAssigned(payload: {
    propertyId: number;
    roomName: string;
    taskType: string;
    maidName: string;
    priority: string;
  }) {
    await this.notifyProperty(
      payload.propertyId,
      housekeepingTaskAssignedTemplate(payload),
    );
  }

  @OnEvent('housekeeping.task.completed')
  async handleTaskCompleted(payload: {
    propertyId: number;
    roomName: string;
    taskType: string;
    maidName: string;
    durationMinutes: number;
  }) {
    await this.notifyProperty(
      payload.propertyId,
      housekeepingTaskCompletedTemplate(payload),
    );
  }

  @OnEvent('housekeeping.room.status_changed')
  async handleRoomStatusChanged(payload: {
    propertyId: number;
    roomName: string;
    oldStatus: string;
    newStatus: string;
    changedBy: string;
  }) {
    await this.notifyProperty(
      payload.propertyId,
      housekeepingRoomStatusChangedTemplate(payload),
    );
  }

  private async notifyProperty(propertyId: number, message: string) {
    try {
      const settings = await this.settingsRepository.findOne({
        where: { propertyId },
      });

      if (!settings?.telegramRecipients?.length) return;

      for (const recipient of settings.telegramRecipients) {
        if (recipient.isActive) {
          await this.telegramService.sendMessage(recipient.chatId, message);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to send housekeeping notification for propertyId=${propertyId}`,
        error,
      );
    }
  }
}
