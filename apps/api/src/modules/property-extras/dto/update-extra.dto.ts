import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const PRICE_TYPES = ['per_booking', 'per_night', 'per_person'] as const;

export class UpdateExtraDto {
  @ApiPropertyOptional({ example: 'Breakfast', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Nonushta', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name_uz?: string;

  @ApiPropertyOptional({ example: 'Full buffet breakfast included' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example: 5000000,
    description: 'Price in tiyin (1 som = 100 tiyin). 0 = free.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    enum: PRICE_TYPES,
    description: 'How the price is calculated',
  })
  @IsOptional()
  @IsEnum(PRICE_TYPES, {
    message: `price_type must be one of: ${PRICE_TYPES.join(', ')}`,
  })
  price_type?: 'per_booking' | 'per_night' | 'per_person';

  @ApiPropertyOptional({ example: 'coffee', description: 'Icon name or URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  icon?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
