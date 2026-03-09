import {
  IsString,
  IsInt,
  IsOptional,
  IsEmail,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const GROUP_STATUSES = [
  'tentative',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
] as const;
type GroupStatus = (typeof GROUP_STATUSES)[number];

export class UpdateGroupDto {
  @ApiPropertyOptional({ example: 'Туристическая группа из Москвы', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  group_name?: string;

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

  @ApiPropertyOptional({ example: '2026-03-15', description: 'Check-in date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  check_in?: string;

  @ApiPropertyOptional({ example: '2026-03-20', description: 'Check-out date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  check_out?: string;

  @ApiPropertyOptional({
    enum: GROUP_STATUSES,
    description: 'Group booking status',
  })
  @IsOptional()
  @IsEnum(GROUP_STATUSES, {
    message: `status must be one of: ${GROUP_STATUSES.join(', ')}`,
  })
  status?: GroupStatus;

  @ApiPropertyOptional({ example: 'Завтрак включён', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
