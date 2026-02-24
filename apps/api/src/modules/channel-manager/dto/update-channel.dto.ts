import {
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateChannelDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Whether the channel is active',
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    example: {
      api_key: 'bk_xxx_updated',
      hotel_id: '12345',
      webhook_secret: 'whsec_xxx_updated',
    },
    description: 'Channel-specific credentials (encrypted at rest)',
  })
  @IsOptional()
  @IsObject()
  credentials?: Record<string, unknown>;
}
