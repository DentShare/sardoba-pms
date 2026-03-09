import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { NotificationSettings } from '@/database/entities/notification-settings.entity';
import { PushSubscription } from '@/database/entities/push-subscription.entity';
import { Booking } from '@/database/entities/booking.entity';
import { Room } from '@/database/entities/room.entity';
import { Guest } from '@/database/entities/guest.entity';
import { Property } from '@/database/entities/property.entity';
import { CleaningTask } from '@/database/entities/cleaning-task.entity';
import { RoomCleaningStatus } from '@/database/entities/room-cleaning-status.entity';
import { NotificationLog } from '@/database/entities/notification-log.entity';
import { PropertyExtra } from '@/database/entities/property-extra.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TelegramService } from './telegram/telegram.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import { EmailService } from './email/email.service';
import { DailyDigestCron } from './cron/daily-digest.cron';
import { UpsellPreArrivalCron } from './cron/upsell-pre-arrival.cron';
import { ReviewRequestCron } from './cron/review-request.cron';
import { BirthdayCron } from './cron/birthday.cron';
import { BookingConfirmedListener } from './listeners/booking-confirmed.listener';
import { NotificationSettingsService } from './settings/notification-settings.service';
import { NotificationSettingsController } from './settings/notification-settings.controller';
import { PushController } from './push/push.controller';
import { PushService } from './push/push.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationSettings,
      PushSubscription,
      Booking,
      Room,
      Guest,
      Property,
      CleaningTask,
      RoomCleaningStatus,
      NotificationLog,
      PropertyExtra,
    ]),
    ConfigModule,
  ],
  controllers: [NotificationsController, NotificationSettingsController, PushController],
  providers: [
    NotificationsService,
    TelegramService,
    WhatsAppService,
    EmailService,
    DailyDigestCron,
    UpsellPreArrivalCron,
    ReviewRequestCron,
    BirthdayCron,
    BookingConfirmedListener,
    NotificationSettingsService,
    PushService,
  ],
  exports: [NotificationsService, TelegramService, EmailService, PushService],
})
export class NotificationsModule {}
