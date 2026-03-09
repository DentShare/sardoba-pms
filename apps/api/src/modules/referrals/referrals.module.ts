import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Referral } from '@/database/entities/referral.entity';
import { Guest } from '@/database/entities/guest.entity';
import { Property } from '@/database/entities/property.entity';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

@Module({
  imports: [TypeOrmModule.forFeature([Referral, Guest, Property])],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
