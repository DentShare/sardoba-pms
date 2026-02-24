import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationSettings } from '@/database/entities/notification-settings.entity';
import { Booking } from '@/database/entities/booking.entity';
import { Room } from '@/database/entities/room.entity';
import { Guest } from '@/database/entities/guest.entity';
import { Property } from '@/database/entities/property.entity';
import { NotificationsService } from './notifications.service';
import { TelegramService } from './telegram/telegram.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import { DailyDigestCron } from './cron/daily-digest.cron';
import { NotificationSettingsService } from './settings/notification-settings.service';
import { NotificationSettingsController } from './settings/notification-settings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationSettings,
      Booking,
      Room,
      Guest,
      Property,
    ]),
  ],
  controllers: [NotificationSettingsController],
  providers: [
    NotificationsService,
    TelegramService,
    WhatsAppService,
    DailyDigestCron,
    NotificationSettingsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
