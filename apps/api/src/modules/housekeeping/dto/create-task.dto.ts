import {
  IsInt,
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const TASK_TYPES = ['standard', 'checkout', 'deep'] as const;
type TaskType = (typeof TASK_TYPES)[number];

const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
type Priority = (typeof PRIORITIES)[number];

export class CreateTaskDto {
  @ApiProperty({ example: 1, description: 'Room ID to clean' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  room_id!: number;

  @ApiProperty({ enum: TASK_TYPES, example: 'standard' })
  @IsEnum(TASK_TYPES, {
    message: `task_type must be one of: ${TASK_TYPES.join(', ')}`,
  })
  @IsNotEmpty()
  task_type!: TaskType;

  @ApiPropertyOptional({ example: 5, description: 'User ID of assigned maid' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  assigned_to?: number;

  @ApiPropertyOptional({ enum: PRIORITIES, example: 'normal', default: 'normal' })
  @IsOptional()
  @IsEnum(PRIORITIES, {
    message: `priority must be one of: ${PRIORITIES.join(', ')}`,
  })
  priority?: Priority;

  @ApiPropertyOptional({ example: 'Guest requested extra towels', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
