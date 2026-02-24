import { IsDateString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Query parameters for analytics endpoints.
 * date_from and date_to define the analysis period.
 * compare_from and compare_to optionally define a comparison period (e.g. previous month).
 */
export class AnalyticsQueryDto {
  @ApiProperty({
    description: 'Start date of the analysis period (inclusive)',
    example: '2025-01-01',
  })
  @IsDateString()
  date_from!: string;

  @ApiProperty({
    description: 'End date of the analysis period (exclusive)',
    example: '2025-02-01',
  })
  @IsDateString()
  date_to!: string;

  @ApiPropertyOptional({
    description: 'Start date of the comparison period (inclusive)',
    example: '2024-12-01',
  })
  @IsOptional()
  @IsDateString()
  compare_from?: string;

  @ApiPropertyOptional({
    description: 'End date of the comparison period (exclusive)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  compare_to?: string;
}

/**
 * Query parameters for report export endpoint.
 */
export class ExportQueryDto {
  @ApiProperty({
    description: 'Start date for the export period (inclusive)',
    example: '2025-01-01',
  })
  @IsDateString()
  date_from!: string;

  @ApiProperty({
    description: 'End date for the export period (exclusive)',
    example: '2025-02-01',
  })
  @IsDateString()
  date_to!: string;

  @ApiPropertyOptional({
    description: 'Export format',
    example: 'xlsx',
    enum: ['xlsx'],
    default: 'xlsx',
  })
  @IsOptional()
  @IsIn(['xlsx'])
  format?: string;
}
