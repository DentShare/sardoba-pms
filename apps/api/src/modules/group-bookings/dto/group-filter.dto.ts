import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const GROUP_STATUSES = [
  'tentative',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
] as const;
type GroupStatus = (typeof GROUP_STATUSES)[number];

export class GroupFilterDto {
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

  @ApiPropertyOptional({ enum: GROUP_STATUSES, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(GROUP_STATUSES, {
    message: `status must be one of: ${GROUP_STATUSES.join(', ')}`,
  })
  status?: GroupStatus;

  @ApiPropertyOptional({ example: 1, description: 'Filter by agency ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  agency_id?: number;

  @ApiPropertyOptional({ example: 'Москва', description: 'Search by group name or number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2026-03-01', description: 'Filter groups from date' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ example: '2026-03-31', description: 'Filter groups to date' })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}
