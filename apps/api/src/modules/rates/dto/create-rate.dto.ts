import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  MaxLength,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const RATE_TYPES = ['base', 'seasonal', 'weekend', 'longstay', 'special'] as const;
type RateType = (typeof RATE_TYPES)[number];

export class CreateRateDto {
  @ApiProperty({ example: 'Summer Season 2025', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    enum: RATE_TYPES,
    example: 'seasonal',
    description: 'Rate type: base, seasonal, weekend, longstay, special',
  })
  @IsEnum(RATE_TYPES, {
    message: `type must be one of: ${RATE_TYPES.join(', ')}`,
  })
  @IsNotEmpty()
  type!: RateType;

  @ApiProperty({ example: 42, description: 'Property ID' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  property_id!: number;

  @ApiPropertyOptional({
    example: 45000000,
    description: 'Fixed price in tiyin. Either price or discount_percent must be provided.',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Discount percentage off room base_price. Either price or discount_percent must be provided.',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  discount_percent?: number;

  @ApiPropertyOptional({
    example: '2025-06-01',
    description: 'Start date for seasonal/special rates (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'date_from must be a valid date string (YYYY-MM-DD)' })
  date_from?: string;

  @ApiPropertyOptional({
    example: '2025-08-31',
    description: 'End date for seasonal/special rates (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'date_to must be a valid date string (YYYY-MM-DD)' })
  date_to?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Minimum stay in nights (for longstay rates)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  min_stay?: number;

  @ApiPropertyOptional({
    example: [1, 2, 3],
    description: 'Array of room IDs this rate applies to. Empty = all rooms.',
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  applies_to_rooms?: number[];

  @ApiPropertyOptional({
    example: [5, 6],
    description: 'Days of week (0=Sunday, 1=Monday, ..., 6=Saturday). Used for weekend rates.',
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @Type(() => Number)
  days_of_week?: number[];

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the rate is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
