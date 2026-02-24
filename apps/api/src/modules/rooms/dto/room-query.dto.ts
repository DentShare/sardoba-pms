import { IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const ROOM_TYPES = ['single', 'double', 'family', 'suite', 'dorm'] as const;
type RoomType = (typeof ROOM_TYPES)[number];

const ROOM_STATUSES = ['active', 'maintenance', 'inactive'] as const;
type RoomStatus = (typeof ROOM_STATUSES)[number];

export class RoomQueryDto {
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

  @ApiPropertyOptional({ enum: ROOM_TYPES, description: 'Filter by room type' })
  @IsOptional()
  @IsEnum(ROOM_TYPES, {
    message: `room_type must be one of: ${ROOM_TYPES.join(', ')}`,
  })
  room_type?: RoomType;

  @ApiPropertyOptional({ enum: ROOM_STATUSES, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(ROOM_STATUSES, {
    message: `status must be one of: ${ROOM_STATUSES.join(', ')}`,
  })
  status?: RoomStatus;

  @ApiPropertyOptional({ example: 2, description: 'Filter by floor' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  floor?: number;
}
