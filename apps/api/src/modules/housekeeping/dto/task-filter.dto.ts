import { IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const TASK_STATUSES = ['pending', 'assigned', 'in_progress', 'completed', 'verified'] as const;
type TaskStatus = (typeof TASK_STATUSES)[number];

const TASK_TYPES = ['standard', 'checkout', 'deep'] as const;
type TaskType = (typeof TASK_TYPES)[number];

export class TaskFilterDto {
  @ApiPropertyOptional({ enum: TASK_STATUSES, description: 'Filter by task status' })
  @IsOptional()
  @IsEnum(TASK_STATUSES, {
    message: `task_status must be one of: ${TASK_STATUSES.join(', ')}`,
  })
  task_status?: TaskStatus;

  @ApiPropertyOptional({ enum: TASK_TYPES, description: 'Filter by task type' })
  @IsOptional()
  @IsEnum(TASK_TYPES, {
    message: `task_type must be one of: ${TASK_TYPES.join(', ')}`,
  })
  task_type?: TaskType;

  @ApiPropertyOptional({ example: 5, description: 'Filter by assigned user' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  assigned_to?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by room' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  room_id?: number;

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
}
