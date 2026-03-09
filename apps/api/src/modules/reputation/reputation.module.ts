import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewScore } from '@/database/entities/review-score.entity';
import { ReputationController } from './reputation.controller';
import { ReputationService } from './reputation.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReviewScore])],
  controllers: [ReputationController],
  providers: [ReputationService],
  exports: [ReputationService],
})
export class ReputationModule {}
