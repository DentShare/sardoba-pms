import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateTriggerDto {
  @ApiProperty({
    enum: EVENT_TYPES,
    example: 'booking_confirmed',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(EVENT_TYPES, {
    message: `event_type must be one of: ${EVENT_TYPES.join(', ')}`,
  })
  event_type!: EventType;

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

  @ApiPropertyOptional({
    example: -60,
    description: 'Delay in minutes (negative = before event, positive = after)',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  delay_minutes?: number;
}
