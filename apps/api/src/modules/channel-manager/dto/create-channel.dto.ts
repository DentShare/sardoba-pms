import {
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CHANNEL_TYPES = [
  'booking_com',
  'airbnb',
  'expedia',
  'hotels_com',
  'ostrovok',
] as const;

type ChannelTypeDto = (typeof CHANNEL_TYPES)[number];

export class CreateChannelDto {
  @ApiProperty({
    enum: CHANNEL_TYPES,
    example: 'booking_com',
    description: 'OTA channel type',
  })
  @IsEnum(CHANNEL_TYPES, {
    message: `type must be one of: ${CHANNEL_TYPES.join(', ')}`,
  })
  type!: ChannelTypeDto;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether the channel is active',
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    example: {
      api_key: 'bk_xxx',
      hotel_id: '12345',
      webhook_secret: 'whsec_xxx',
    },
    description: 'Channel-specific credentials (encrypted at rest)',
  })
  @IsObject()
  credentials!: Record<string, unknown>;
}
