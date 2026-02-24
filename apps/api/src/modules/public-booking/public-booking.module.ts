import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from '@/database/entities/property.entity';
import { PropertyExtra } from '@/database/entities/property-extra.entity';
import { BookingExtra } from '@/database/entities/booking-extra.entity';
import { Booking } from '@/database/entities/booking.entity';
import { Guest } from '@/database/entities/guest.entity';
import { BookingsModule } from '../bookings/bookings.module';
import { RatesModule } from '../rates/rates.module';
import { GuestsModule } from '../guests/guests.module';
import { PublicBookingController } from './public-booking.controller';
import { PublicBookingService } from './public-booking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Property,
      PropertyExtra,
      BookingExtra,
      Booking,
      Guest,
    ]),
    BookingsModule,
    RatesModule,
    GuestsModule,
  ],
  controllers: [PublicBookingController],
  providers: [PublicBookingService],
})
export class PublicBookingModule {}
