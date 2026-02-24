import {
  IsArray,
  ValidateNested,
  IsInt,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RoomMappingItemDto {
  @ApiProperty({ example: 5, description: 'Internal room ID' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  room_id!: number;

  @ApiProperty({
    example: 'ota_room_12345',
    description: 'External room/unit ID on the OTA side',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  external_id!: string;
}

export class UpdateMappingsDto {
  @ApiProperty({
    type: [RoomMappingItemDto],
    description: 'Array of room-to-external-ID mappings. Replaces all existing mappings for this channel.',
    example: [
      { room_id: 5, external_id: 'ota_room_101' },
      { room_id: 6, external_id: 'ota_room_102' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomMappingItemDto)
  mappings!: RoomMappingItemDto[];
}
