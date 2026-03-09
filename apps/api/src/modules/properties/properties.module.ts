import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from '@/database/entities/property.entity';
import { Room } from '@/database/entities/room.entity';
import { WidgetEvent } from '@/database/entities/widget-event.entity';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { MiniSiteSettingsController } from './mini-site-settings.controller';
import { MiniSiteSettingsService } from './mini-site-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Property, Room, WidgetEvent])],
  controllers: [PropertiesController, MiniSiteSettingsController],
  providers: [PropertiesService, MiniSiteSettingsService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
