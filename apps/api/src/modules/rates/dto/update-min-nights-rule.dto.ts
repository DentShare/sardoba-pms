import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsBoolean,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateMinNightsRuleDto {
  @ApiPropertyOptional({
    example: 'Навруз — минимум 3 ночи',
    maxLength: 100,
    description: 'Human-readable name for the rule',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: '2026-03-21',
    description: 'Start date of the rule period (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'date_from must be a valid date string (YYYY-MM-DD)' })
  date_from?: string;

  @ApiPropertyOptional({
    example: '2026-03-25',
    description: 'End date of the rule period (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'date_to must be a valid date string (YYYY-MM-DD)' })
  date_to?: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'Minimum number of nights required',
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  @Type(() => Number)
  min_nights?: number;

  @ApiPropertyOptional({
    example: [1, 2, 3],
    description: 'Array of room IDs this rule applies to. Empty = all rooms.',
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  applies_to_rooms?: number[];

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the rule is active',
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
