import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsArray,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const ROOM_TYPES = ['single', 'double', 'family', 'suite', 'dorm'] as const;
type RoomType = (typeof ROOM_TYPES)[number];

const ROOM_STATUSES = ['active', 'maintenance', 'inactive'] as const;
type RoomStatus = (typeof ROOM_STATUSES)[number];

const ROOM_AMENITIES = [
  'wifi',
  'ac',
  'tv',
  'fridge',
  'balcony',
  'view',
  'bathtub',
  'shower',
  'safe',
  'minibar',
  'kettle',
] as const;
type RoomAmenity = (typeof ROOM_AMENITIES)[number];

export class UpdateRoomDto {
  @ApiPropertyOptional({ example: 'Deluxe 101', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: ROOM_TYPES, example: 'double' })
  @IsOptional()
  @IsEnum(ROOM_TYPES, {
    message: `room_type must be one of: ${ROOM_TYPES.join(', ')}`,
  })
  room_type?: RoomType;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  floor?: number;

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  capacity_adults?: number;

  @ApiPropertyOptional({ example: 1, minimum: 0, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  capacity_children?: number;

  @ApiPropertyOptional({
    example: 50000000,
    description: 'Base price in tiyin (1 sum = 100 tiyin)',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  base_price?: number;

  @ApiPropertyOptional({ enum: ROOM_STATUSES, example: 'active' })
  @IsOptional()
  @IsEnum(ROOM_STATUSES, {
    message: `status must be one of: ${ROOM_STATUSES.join(', ')}`,
  })
  status?: RoomStatus;

  @ApiPropertyOptional({
    enum: ROOM_AMENITIES,
    isArray: true,
    example: ['wifi', 'ac', 'tv'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ROOM_AMENITIES, {
    each: true,
    message: `Each amenity must be one of: ${ROOM_AMENITIES.join(', ')}`,
  })
  amenities?: RoomAmenity[];

  @ApiPropertyOptional({ example: 'Просторный номер с видом на сад', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description_ru?: string;

  @ApiPropertyOptional({ example: 'Bogcha manzarali keng xona', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description_uz?: string;

  @ApiPropertyOptional({ example: 0, description: 'Sort order for display' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sort_order?: number;
}
