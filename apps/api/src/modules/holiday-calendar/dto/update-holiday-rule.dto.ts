import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateHolidayRuleDto {
  @ApiPropertyOptional({
    example: 'Навруз',
    maxLength: 100,
    description: 'Holiday name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: '2026-03-21',
    description: 'Start date of the holiday period (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'date_from must be a valid date string (YYYY-MM-DD)' })
  date_from?: string;

  @ApiPropertyOptional({
    example: '2026-03-23',
    description: 'End date of the holiday period (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'date_to must be a valid date string (YYYY-MM-DD)' })
  date_to?: string;

  @ApiPropertyOptional({
    example: 50,
    description: 'Price boost percentage during this holiday (0-200)',
    minimum: 0,
    maximum: 200,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  @Type(() => Number)
  price_boost_percent?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Minimum nights required during this holiday',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  min_nights?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this holiday recurs every year',
  })
  @IsOptional()
  @IsBoolean()
  recur_yearly?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the holiday rule is active',
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
