import { IsEnum, IsInt, IsOptional, IsString, IsBoolean, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

const CHANNELS = ['sms', 'email'] as const;
type Channel = (typeof CHANNELS)[number];

export class TemplateFilterDto {
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

  @ApiPropertyOptional({ enum: CHANNELS, description: 'Filter by channel' })
  @IsOptional()
  @IsEnum(CHANNELS, {
    message: `channel must be one of: ${CHANNELS.join(', ')}`,
  })
  channel?: Channel;

  @ApiPropertyOptional({ example: 'ru', description: 'Filter by language' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  is_active?: boolean;

  @ApiPropertyOptional({ example: 'booking', description: 'Search in name and body' })
  @IsOptional()
  @IsString()
  search?: string;
}
