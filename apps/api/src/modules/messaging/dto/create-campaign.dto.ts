import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  IsObject,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const CHANNELS = ['sms', 'email'] as const;
type Channel = (typeof CHANNELS)[number];

export class CreateCampaignDto {
  @ApiProperty({ example: 'Summer Promotion', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 1, description: 'Template ID to use' })
  @IsInt()
  @Type(() => Number)
  template_id!: number;

  @ApiPropertyOptional({ enum: CHANNELS, default: 'sms' })
  @IsOptional()
  @IsEnum(CHANNELS, {
    message: `channel must be one of: ${CHANNELS.join(', ')}`,
  })
  channel?: Channel;

  @ApiPropertyOptional({ example: { guest_type: 'returning' }, description: 'Segment filter criteria' })
  @IsOptional()
  @IsObject()
  segment_filters?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '2026-03-01T10:00:00Z', description: 'Scheduled send time' })
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;
}
