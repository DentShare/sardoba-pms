import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromoCode } from '@/database/entities/promo-code.entity';
import { Booking } from '@/database/entities/booking.entity';
import { PromoCodesController } from './promo-codes.controller';
import { PromoCodesService } from './promo-codes.service';

@Module({
  imports: [TypeOrmModule.forFeature([PromoCode, Booking])],
  controllers: [PromoCodesController],
  providers: [PromoCodesService],
  exports: [PromoCodesService],
})
export class PromoCodesModule {}
