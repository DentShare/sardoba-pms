import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guest } from '@/database/entities/guest.entity';
import { Booking } from '@/database/entities/booking.entity';
import { AiService } from './ai.service';
import { GuestTipsService } from './guest-tips.service';
import { PassportOcrService } from './passport-ocr.service';

@Module({
  imports: [TypeOrmModule.forFeature([Guest, Booking])],
  providers: [AiService, GuestTipsService, PassportOcrService],
  exports: [GuestTipsService, PassportOcrService],
})
export class AiModule {}
