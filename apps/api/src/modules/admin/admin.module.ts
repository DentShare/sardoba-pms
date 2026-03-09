import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Property } from '../../database/entities/property.entity';
import { User } from '../../database/entities/user.entity';
import { Booking } from '../../database/entities/booking.entity';
import { Payment } from '../../database/entities/payment.entity';
import { SyncLog } from '../../database/entities/sync-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Property, User, Booking, Payment, SyncLog]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
