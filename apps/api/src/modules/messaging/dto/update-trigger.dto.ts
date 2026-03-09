import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const CHANNELS = ['sms', 'email'] as const;
type Channel = (typeof CHANNELS)[number];

const EVENT_TYPES = [
  'booking_confirmed',
  'pre_arrival',
  'check_in',
  'check_out',
  'post_stay',
  'payment_received',
] as const;
type EventType = (typeof EVENT_TYPES)[number];

export class UpdateTriggerDto {
  @ApiPropertyOptional({ enum: EVENT_TYPES })
  @IsOptional()
  @IsString()
  @IsEnum(EVENT_TYPES, {
    message: `event_type must be one of: ${EVENT_TYPES.join(', ')}`,
  })
  event_type?: EventType;

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

  @ApiPropertyOptional({ example: -60 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  delay_minutes?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
