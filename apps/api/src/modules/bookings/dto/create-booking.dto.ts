import {
  IsInt,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const BOOKING_SOURCES = [
  'direct',
  'booking_com',
  'airbnb',
  'expedia',
  'phone',
  'other',
] as const;
type BookingSource = (typeof BOOKING_SOURCES)[number];

export class GuestDataDto {
  @ApiProperty({ example: 'Aziz' })
  @IsString()
  @MaxLength(100)
  first_name!: string;

  @ApiProperty({ example: 'Karimov' })
  @IsString()
  @MaxLength(100)
  last_name!: string;

  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @MaxLength(20)
  phone!: string;

  @ApiPropertyOptional({ example: 'aziz@mail.uz' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'UZ' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  nationality?: string;
}

export class CreateBookingDto {
  @ApiProperty({ example: 1, description: 'Property ID' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  property_id!: number;

  @ApiProperty({ example: 5, description: 'Room ID' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  room_id!: number;

  @ApiProperty({ example: '2025-07-01', description: 'Check-in date (YYYY-MM-DD)' })
  @IsDateString()
  check_in!: string;

  @ApiProperty({ example: '2025-07-05', description: 'Check-out date (YYYY-MM-DD)' })
  @IsDateString()
  check_out!: string;

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 20, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  adults?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0, maximum: 10, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  children?: number;

  @ApiPropertyOptional({ example: 1, description: 'Existing guest ID' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  guest_id?: number;

  @ApiPropertyOptional({ description: 'Guest data for find-or-create' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuestDataDto)
  guest?: GuestDataDto;

  @ApiPropertyOptional({ example: 1, description: 'Rate ID (optional, auto-calculate if omitted)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  rate_id?: number;

  @ApiPropertyOptional({
    enum: BOOKING_SOURCES,
    default: 'direct',
    example: 'direct',
  })
  @IsOptional()
  @IsEnum(BOOKING_SOURCES, {
    message: `source must be one of: ${BOOKING_SOURCES.join(', ')}`,
  })
  source?: BookingSource;

  @ApiPropertyOptional({ example: 'OTA-12345', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source_reference?: string;

  @ApiPropertyOptional({ example: 'Late check-in requested' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
