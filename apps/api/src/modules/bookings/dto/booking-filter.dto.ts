import {
  IsEnum,
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

const BOOKING_STATUSES = [
  'new',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
] as const;
type BookingStatus = (typeof BOOKING_STATUSES)[number];

const BOOKING_SOURCES = [
  'direct',
  'booking_com',
  'airbnb',
  'expedia',
  'phone',
  'other',
] as const;
type BookingSource = (typeof BOOKING_SOURCES)[number];

export class BookingFilterDto {
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

  @ApiPropertyOptional({ enum: BOOKING_STATUSES, description: 'Filter by booking status' })
  @IsOptional()
  @IsEnum(BOOKING_STATUSES, {
    message: `status must be one of: ${BOOKING_STATUSES.join(', ')}`,
  })
  status?: BookingStatus;

  @ApiPropertyOptional({ enum: BOOKING_SOURCES, description: 'Filter by booking source' })
  @IsOptional()
  @IsEnum(BOOKING_SOURCES, {
    message: `source must be one of: ${BOOKING_SOURCES.join(', ')}`,
  })
  source?: BookingSource;

  @ApiPropertyOptional({ example: 5, description: 'Filter by room ID' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  room_id?: number;

  @ApiPropertyOptional({ example: 10, description: 'Filter by guest ID' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  guest_id?: number;

  @ApiPropertyOptional({
    example: 'Karimov',
    description: 'Search by guest name, booking number, or room name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ example: '2025-07-01', description: 'Filter: check-in from this date' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ example: '2025-07-31', description: 'Filter: check-in before this date' })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}
