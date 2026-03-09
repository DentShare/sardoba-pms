import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '@/database/entities/invoice.entity';
import { Booking } from '@/database/entities/booking.entity';
import { Property } from '@/database/entities/property.entity';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './pdf/invoice-pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Booking, Property])],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicePdfService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
