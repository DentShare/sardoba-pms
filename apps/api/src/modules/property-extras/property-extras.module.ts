import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyExtra } from '@/database/entities/property-extra.entity';
import { PropertyExtrasController } from './property-extras.controller';
import { PropertyExtrasService } from './property-extras.service';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyExtra])],
  controllers: [PropertyExtrasController],
  providers: [PropertyExtrasService],
  exports: [PropertyExtrasService],
})
export class PropertyExtrasModule {}
