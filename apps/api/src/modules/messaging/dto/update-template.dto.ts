import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const CHANNELS = ['sms', 'email'] as const;
type Channel = (typeof CHANNELS)[number];

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: 'Booking Confirmation', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ enum: CHANNELS })
  @IsOptional()
  @IsEnum(CHANNELS, {
    message: `channel must be one of: ${CHANNELS.join(', ')}`,
  })
  channel?: Channel;

  @ApiPropertyOptional({ example: 'ru', maxLength: 5 })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string;

  @ApiPropertyOptional({ example: 'Your booking is confirmed', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @ApiPropertyOptional({ example: 'Dear {{guest_name}}, your booking is confirmed.' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ example: ['guest_name', 'booking_id'], isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
