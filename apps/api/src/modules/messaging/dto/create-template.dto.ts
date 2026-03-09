import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CHANNELS = ['sms', 'email'] as const;
type Channel = (typeof CHANNELS)[number];

export class CreateTemplateDto {
  @ApiProperty({ example: 'Booking Confirmation', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ enum: CHANNELS, default: 'sms' })
  @IsOptional()
  @IsEnum(CHANNELS, {
    message: `channel must be one of: ${CHANNELS.join(', ')}`,
  })
  channel?: Channel;

  @ApiPropertyOptional({ example: 'ru', maxLength: 5, default: 'ru' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string;

  @ApiPropertyOptional({ example: 'Your booking is confirmed', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @ApiProperty({ example: 'Dear {{guest_name}}, your booking #{{booking_id}} is confirmed.' })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({ example: ['guest_name', 'booking_id'], isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}
