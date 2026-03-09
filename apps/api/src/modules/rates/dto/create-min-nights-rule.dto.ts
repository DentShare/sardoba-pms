import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMinNightsRuleDto {
  @ApiPropertyOptional({
    example: 'Навруз — минимум 3 ночи',
    maxLength: 100,
    description: 'Human-readable name for the rule',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    example: '2026-03-21',
    description: 'Start date of the rule period (YYYY-MM-DD)',
  })
  @IsDateString({}, { message: 'date_from must be a valid date string (YYYY-MM-DD)' })
  date_from!: string;

  @ApiProperty({
    example: '2026-03-25',
    description: 'End date of the rule period (YYYY-MM-DD)',
  })
  @IsDateString({}, { message: 'date_to must be a valid date string (YYYY-MM-DD)' })
  date_to!: string;

  @ApiProperty({
    example: 3,
    description: 'Minimum number of nights required',
    minimum: 1,
    maximum: 30,
  })
  @IsInt()
  @Min(1)
  @Max(30)
  @Type(() => Number)
  min_nights!: number;

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
}
