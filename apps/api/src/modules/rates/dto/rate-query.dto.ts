import { IsEnum, IsInt, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

const RATE_TYPES = ['base', 'seasonal', 'weekend', 'longstay', 'special'] as const;
type RateType = (typeof RATE_TYPES)[number];

export class RateQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  per_page?: number = 20;

  @ApiPropertyOptional({
    enum: RATE_TYPES,
    description: 'Filter by rate type',
  })
  @IsOptional()
  @IsEnum(RATE_TYPES, {
    message: `type must be one of: ${RATE_TYPES.join(', ')}`,
  })
  type?: RateType;

  @ApiPropertyOptional({
    description: 'Filter by active status (true/false)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  is_active?: boolean;
}
