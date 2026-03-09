import { IsEnum, IsInt, IsOptional, IsDateString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const CHANNELS = ['sms', 'email'] as const;
type Channel = (typeof CHANNELS)[number];

const MESSAGE_STATUSES = ['pending', 'sent', 'delivered', 'failed'] as const;
type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export class MessageFilterDto {
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

  @ApiPropertyOptional({ enum: MESSAGE_STATUSES, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(MESSAGE_STATUSES, {
    message: `status must be one of: ${MESSAGE_STATUSES.join(', ')}`,
  })
  status?: MessageStatus;

  @ApiPropertyOptional({ enum: CHANNELS, description: 'Filter by channel' })
  @IsOptional()
  @IsEnum(CHANNELS, {
    message: `channel must be one of: ${CHANNELS.join(', ')}`,
  })
  channel?: Channel;

  @ApiPropertyOptional({ example: 1, description: 'Filter by campaign' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  campaign_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by template' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  template_id?: number;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Filter from date' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Filter to date' })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}
