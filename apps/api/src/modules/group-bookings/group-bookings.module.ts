import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupBooking } from '@/database/entities/group-booking.entity';
import { GroupBookingRoom } from '@/database/entities/group-booking-room.entity';
import { Agency } from '@/database/entities/agency.entity';
import { Room } from '@/database/entities/room.entity';
import { Booking } from '@/database/entities/booking.entity';
import { GroupBookingsController } from './group-bookings.controller';
import { GroupBookingsService } from './group-bookings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GroupBooking,
      GroupBookingRoom,
      Agency,
      Room,
      Booking,
    ]),
  ],
  controllers: [GroupBookingsController],
  providers: [GroupBookingsService],
  exports: [GroupBookingsService],
})
export class GroupBookingsModule {}
