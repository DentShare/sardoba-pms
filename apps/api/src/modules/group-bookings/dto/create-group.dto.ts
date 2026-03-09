import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsEmail,
  IsArray,
  IsDateString,
  MaxLength,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GroupRoomItemDto {
  @ApiProperty({ example: 1, description: 'Room ID' })
  @IsInt()
  @Type(() => Number)
  room_id!: number;

  @ApiPropertyOptional({ example: 'Иван Иванов', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  guest_name?: string;

  @ApiPropertyOptional({ example: '+998901234567', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  guest_phone?: string;

  @ApiPropertyOptional({ example: 'AA1234567', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  guest_passport?: string;

  @ApiProperty({
    example: 50000000,
    description: 'Price per night in tiyin',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  price_per_night!: number;
}

export class CreateGroupDto {
  @ApiProperty({ example: 'Туристическая группа из Москвы', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  group_name!: string;

  @ApiPropertyOptional({ example: 1, description: 'Agency ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  agency_id?: number;

  @ApiPropertyOptional({ example: 'Иван Петров', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contact_person?: string;

  @ApiPropertyOptional({ example: '+998901234567', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contact_phone?: string;

  @ApiPropertyOptional({ example: 'group@example.com', maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contact_email?: string;

  @ApiProperty({ example: '2026-03-15', description: 'Check-in date (YYYY-MM-DD)' })
  @IsDateString()
  check_in!: string;

  @ApiProperty({ example: '2026-03-20', description: 'Check-out date (YYYY-MM-DD)' })
  @IsDateString()
  check_out!: string;

  @ApiPropertyOptional({ example: 'Завтрак включён', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ type: [GroupRoomItemDto], description: 'Rooms to assign' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GroupRoomItemDto)
  rooms!: GroupRoomItemDto[];
}
