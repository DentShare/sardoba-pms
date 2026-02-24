import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Channel } from '@/database/entities/channel.entity';
import { RoomMapping } from '@/database/entities/room-mapping.entity';
import { SyncLog } from '@/database/entities/sync-log.entity';
import { Booking } from '@/database/entities/booking.entity';
import { Room } from '@/database/entities/room.entity';
import { Guest } from '@/database/entities/guest.entity';
import { ChannelManagerService } from './channel-manager.service';
import { ChannelManagerController } from './channel-manager.controller';
import { ChannelManagerListener } from './channel-manager.listener';
import { BookingComService } from './channels/booking-com.service';
import { AirbnbIcalService } from './channels/airbnb-ical.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Channel,
      RoomMapping,
      SyncLog,
      Booking,
      Room,
      Guest,
    ]),
    BullModule.registerQueue({ name: 'channel-sync' }),
  ],
  controllers: [ChannelManagerController],
  providers: [
    ChannelManagerService,
    ChannelManagerListener,
    BookingComService,
    AirbnbIcalService,
  ],
  exports: [ChannelManagerService],
})
export class ChannelModule {}
