import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageTemplate } from '@/database/entities/message-template.entity';
import { NotificationTrigger } from '@/database/entities/notification-trigger.entity';
import { Campaign } from '@/database/entities/campaign.entity';
import { SentMessage } from '@/database/entities/sent-message.entity';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessageTemplate,
      NotificationTrigger,
      Campaign,
      SentMessage,
    ]),
  ],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
