import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DynamicPricingRule } from '@/database/entities/dynamic-pricing-rule.entity';
import { DynamicPricingService } from './dynamic-pricing.service';

@Injectable()
export class PricingSchedulerService {
  private readonly logger = new Logger(PricingSchedulerService.name);

  constructor(
    @InjectRepository(DynamicPricingRule)
    private readonly ruleRepository: Repository<DynamicPricingRule>,
    private readonly dynamicPricingService: DynamicPricingService,
  ) {}

  @Cron('0 0,6,12,18 * * *', { timeZone: 'Asia/Tashkent' })
  async schedulePricingRun() {
    this.logger.log('Starting scheduled pricing calculation...');

    const propertyIds = await this.ruleRepository
      .createQueryBuilder('rule')
      .select('DISTINCT rule.property_id', 'propertyId')
      .where('rule.is_active = true')
      .getRawMany<{ propertyId: number }>();

    for (const { propertyId } of propertyIds) {
      try {
        await this.dynamicPricingService.runPricingCalculation(propertyId);
        this.logger.log(`Pricing updated for property ${propertyId}`);
      } catch (err) {
        this.logger.error(`Pricing failed for property ${propertyId}`, err);
      }
    }

    this.logger.log(`Pricing calculation finished for ${propertyIds.length} properties`);
  }
}
