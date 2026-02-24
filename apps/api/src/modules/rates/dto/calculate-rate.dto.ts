import { IsInt, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CalculateRateDto {
  @ApiProperty({
    example: 1,
    description: 'Room ID to calculate the rate for',
  })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  room_id!: number;

  @ApiProperty({
    example: '2025-07-01',
    description: 'Check-in date (YYYY-MM-DD)',
  })
  @IsDateString({}, { message: 'check_in must be a valid date string (YYYY-MM-DD)' })
  @IsNotEmpty()
  check_in!: string;

  @ApiProperty({
    example: '2025-07-05',
    description: 'Check-out date (YYYY-MM-DD)',
  })
  @IsDateString({}, { message: 'check_out must be a valid date string (YYYY-MM-DD)' })
  @IsNotEmpty()
  check_out!: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Explicit rate ID to use (bypasses priority system)',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  rate_id?: number;
}
