import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '@/database/entities/payment.entity';
import { Booking } from '@/database/entities/booking.entity';
import { PaymeTransaction } from '@/database/entities/payme-transaction.entity';
import { ClickTransaction } from '@/database/entities/click-transaction.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymeService } from './payme.service';
import { ClickService } from './click.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Booking, PaymeTransaction, ClickTransaction])],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymeService, ClickService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
