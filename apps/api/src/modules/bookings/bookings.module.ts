import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '@/database/entities/booking.entity';
import { BookingHistory } from '@/database/entities/booking-history.entity';
import { Room } from '@/database/entities/room.entity';
import { RoomBlock } from '@/database/entities/room-block.entity';
import { Guest } from '@/database/entities/guest.entity';
import { RatesModule } from '../rates/rates.module';
import { GuestsModule } from '../guests/guests.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { AvailabilityService } from './availability.service';
import { BookingNumberService } from './booking-number.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingHistory, Room, RoomBlock, Guest]),
    RatesModule,
    GuestsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, AvailabilityService, BookingNumberService],
  exports: [BookingsService],
})
export class BookingsModule {}
