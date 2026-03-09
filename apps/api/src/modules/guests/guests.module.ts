import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guest } from '@/database/entities/guest.entity';
import { Booking } from '@/database/entities/booking.entity';
import { AiModule } from '@/modules/ai/ai.module';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';
import { CryptoService } from './crypto.service';

@Module({
  imports: [TypeOrmModule.forFeature([Guest, Booking]), AiModule],
  controllers: [GuestsController],
  providers: [GuestsService, CryptoService],
  exports: [GuestsService],
})
export class GuestsModule {}
