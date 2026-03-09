import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DynamicPricingRule } from '@/database/entities/dynamic-pricing-rule.entity';
import { PricingChangeLog } from '@/database/entities/pricing-change-log.entity';
import { DynamicPriceOverride } from '@/database/entities/dynamic-price-override.entity';
import { Room } from '@/database/entities/room.entity';
import { Booking } from '@/database/entities/booking.entity';
import { DynamicPricingController } from './dynamic-pricing.controller';
import { DynamicPricingService } from './dynamic-pricing.service';
import { PricingSchedulerService } from './pricing-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DynamicPricingRule,
      PricingChangeLog,
      DynamicPriceOverride,
      Room,
      Booking,
    ]),
  ],
  controllers: [DynamicPricingController],
  providers: [DynamicPricingService, PricingSchedulerService],
  exports: [DynamicPricingService],
})
export class DynamicPricingModule {}
