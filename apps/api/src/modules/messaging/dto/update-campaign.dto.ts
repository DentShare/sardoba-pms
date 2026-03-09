import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsObject,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const CHANNELS = ['sms', 'email'] as const;
type Channel = (typeof CHANNELS)[number];

const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'sending', 'completed', 'cancelled'] as const;
type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export class UpdateCampaignDto {
  @ApiPropertyOptional({ example: 'Summer Promotion', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  template_id?: number;

  @ApiPropertyOptional({ enum: CHANNELS })
  @IsOptional()
  @IsEnum(CHANNELS, {
    message: `channel must be one of: ${CHANNELS.join(', ')}`,
  })
  channel?: Channel;

  @ApiPropertyOptional({ example: { guest_type: 'returning' } })
  @IsOptional()
  @IsObject()
  segment_filters?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: CAMPAIGN_STATUSES })
  @IsOptional()
  @IsEnum(CAMPAIGN_STATUSES, {
    message: `status must be one of: ${CAMPAIGN_STATUSES.join(', ')}`,
  })
  status?: CampaignStatus;

  @ApiPropertyOptional({ example: '2026-03-01T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;
}
