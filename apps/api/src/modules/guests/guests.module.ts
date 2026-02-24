import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guest } from '@/database/entities/guest.entity';
import { Booking } from '@/database/entities/booking.entity';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';
import { CryptoService } from './crypto.service';

@Module({
  imports: [TypeOrmModule.forFeature([Guest, Booking])],
  controllers: [GuestsController],
  providers: [GuestsService, CryptoService],
  exports: [GuestsService],
})
export class GuestsModule {}
