import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rate } from '@/database/entities/rate.entity';
import { Room } from '@/database/entities/room.entity';
import { MinNightsRule } from '@/database/entities/min-nights-rule.entity';
import { HolidayCalendarModule } from '../holiday-calendar/holiday-calendar.module';
import { RatesController } from './rates.controller';
import { RatesService } from './rates.service';
import { MinNightsService } from './min-nights.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rate, Room, MinNightsRule]),
    HolidayCalendarModule,
  ],
  controllers: [RatesController],
  providers: [RatesService, MinNightsService],
  exports: [RatesService, MinNightsService],
})
export class RatesModule {}
