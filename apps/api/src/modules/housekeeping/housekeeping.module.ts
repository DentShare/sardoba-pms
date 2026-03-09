import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CleaningTask } from '@/database/entities/cleaning-task.entity';
import { RoomCleaningStatus } from '@/database/entities/room-cleaning-status.entity';
import { Room } from '@/database/entities/room.entity';
import { Booking } from '@/database/entities/booking.entity';
import { User } from '@/database/entities/user.entity';
import { NotificationSettings } from '@/database/entities/notification-settings.entity';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { HousekeepingController } from './housekeeping.controller';
import { HousekeepingService } from './housekeeping.service';
import { HousekeepingListener } from './housekeeping.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CleaningTask,
      RoomCleaningStatus,
      Room,
      Booking,
      User,
      NotificationSettings,
    ]),
    NotificationsModule,
  ],
  controllers: [HousekeepingController],
  providers: [HousekeepingService, HousekeepingListener],
  exports: [HousekeepingService],
})
export class HousekeepingModule {}
