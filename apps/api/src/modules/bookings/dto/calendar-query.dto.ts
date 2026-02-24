import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const ROOM_TYPES = ['single', 'double', 'family', 'suite', 'dorm'] as const;
type RoomType = (typeof ROOM_TYPES)[number];

export class CalendarQueryDto {
  @ApiProperty({ example: '2025-07-01', description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  date_from!: string;

  @ApiProperty({ example: '2025-07-31', description: 'End date (YYYY-MM-DD)' })
  @IsDateString()
  date_to!: string;

  @ApiPropertyOptional({ enum: ROOM_TYPES, description: 'Filter by room type' })
  @IsOptional()
  @IsEnum(ROOM_TYPES, {
    message: `room_type must be one of: ${ROOM_TYPES.join(', ')}`,
  })
  room_type?: RoomType;
}
