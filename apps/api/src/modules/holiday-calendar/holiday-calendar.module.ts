import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HolidayRule } from '@/database/entities/holiday-rule.entity';
import { HolidayCalendarController } from './holiday-calendar.controller';
import { HolidayCalendarService } from './holiday-calendar.service';

@Module({
  imports: [TypeOrmModule.forFeature([HolidayRule])],
  controllers: [HolidayCalendarController],
  providers: [HolidayCalendarService],
  exports: [HolidayCalendarService],
})
export class HolidayCalendarModule {}
