import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController, ReportsController } from './analytics.controller';
import { ExportService } from './export.service';
import { Booking } from '../../database/entities/booking.entity';
import { Room } from '../../database/entities/room.entity';
import { Payment } from '../../database/entities/payment.entity';
import { Guest } from '../../database/entities/guest.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Room, Payment, Guest])],
  controllers: [AnalyticsController, ReportsController],
  providers: [AnalyticsService, ExportService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
