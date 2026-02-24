import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsOptional,
  IsArray,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const ROOM_TYPES = ['single', 'double', 'family', 'suite', 'dorm'] as const;
type RoomType = (typeof ROOM_TYPES)[number];

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

export class CreateRoomDto {
  @ApiProperty({ example: 'Deluxe 101', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: ROOM_TYPES, example: 'double' })
  @IsEnum(ROOM_TYPES, {
    message: `room_type must be one of: ${ROOM_TYPES.join(', ')}`,
  })
  @IsNotEmpty()
  room_type!: RoomType;

  @ApiPropertyOptional({ example: 2, minimum: -5, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  floor?: number;

  @ApiProperty({ example: 2, minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  capacity_adults!: number;

  @ApiPropertyOptional({ example: 1, minimum: 0, maximum: 10, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  capacity_children?: number;

  @ApiProperty({
    example: 50000000,
    description: 'Base price in tiyin (1 sum = 100 tiyin)',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  base_price!: number;

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
