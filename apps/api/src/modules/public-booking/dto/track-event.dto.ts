import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TrackWidgetEventDto {
  @ApiProperty({ example: 'page_view' })
  @IsString()
  event_type!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  room_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  meta?: Record<string, unknown>;
}
