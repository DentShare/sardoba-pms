import {
  IsInt,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const TASK_STATUSES = ['pending', 'assigned', 'in_progress', 'completed', 'verified'] as const;
type TaskStatus = (typeof TASK_STATUSES)[number];

const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
type Priority = (typeof PRIORITIES)[number];

export class UpdateTaskDto {
  @ApiPropertyOptional({ enum: TASK_STATUSES, example: 'in_progress' })
  @IsOptional()
  @IsEnum(TASK_STATUSES, {
    message: `task_status must be one of: ${TASK_STATUSES.join(', ')}`,
  })
  task_status?: TaskStatus;

  @ApiPropertyOptional({ example: 5, description: 'User ID of assigned maid' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  assigned_to?: number;

  @ApiPropertyOptional({ enum: PRIORITIES, example: 'high' })
  @IsOptional()
  @IsEnum(PRIORITIES, {
    message: `priority must be one of: ${PRIORITIES.join(', ')}`,
  })
  priority?: Priority;

  @ApiPropertyOptional({ example: 'Bathroom needs extra attention', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
