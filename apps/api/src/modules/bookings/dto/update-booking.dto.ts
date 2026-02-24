import {
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateBookingDto {
  @ApiPropertyOptional({ example: 5, description: 'Room ID (triggers re-check availability)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  room_id?: number;

  @ApiPropertyOptional({ example: '2025-07-02', description: 'Check-in date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  check_in?: string;

  @ApiPropertyOptional({ example: '2025-07-06', description: 'Check-out date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  check_out?: string;

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  adults?: number;

  @ApiPropertyOptional({ example: 1, minimum: 0, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  children?: number;

  @ApiPropertyOptional({ example: 1, description: 'Rate ID' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  rate_id?: number;

  @ApiPropertyOptional({ example: 'Guest requests extra pillow' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
