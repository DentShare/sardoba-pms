import { IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const CHANNELS = ['sms', 'email'] as const;
type Channel = (typeof CHANNELS)[number];

const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'sending', 'completed', 'cancelled'] as const;
type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export class CampaignFilterDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  per_page?: number = 20;

  @ApiPropertyOptional({ enum: CAMPAIGN_STATUSES, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(CAMPAIGN_STATUSES, {
    message: `status must be one of: ${CAMPAIGN_STATUSES.join(', ')}`,
  })
  status?: CampaignStatus;

  @ApiPropertyOptional({ enum: CHANNELS, description: 'Filter by channel' })
  @IsOptional()
  @IsEnum(CHANNELS, {
    message: `channel must be one of: ${CHANNELS.join(', ')}`,
  })
  channel?: Channel;
}
