import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const CLEANING_STATUSES = [
  'clean',
  'dirty',
  'cleaning',
  'inspection',
  'do_not_disturb',
  'out_of_order',
] as const;
type CleaningStatus = (typeof CLEANING_STATUSES)[number];

export class UpdateRoomStatusDto {
  @ApiProperty({ enum: CLEANING_STATUSES, example: 'clean' })
  @IsEnum(CLEANING_STATUSES, {
    message: `cleaning_status must be one of: ${CLEANING_STATUSES.join(', ')}`,
  })
  @IsNotEmpty()
  cleaning_status!: CleaningStatus;
}
