import { IsString, IsNotEmpty, IsOptional, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoomBlockDto {
  @ApiProperty({
    example: '2025-06-01',
    description: 'Block start date (YYYY-MM-DD)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date_from must be in YYYY-MM-DD format',
  })
  date_from!: string;

  @ApiProperty({
    example: '2025-06-05',
    description: 'Block end date (YYYY-MM-DD)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date_to must be in YYYY-MM-DD format',
  })
  date_to!: string;

  @ApiPropertyOptional({
    example: 'Maintenance: plumbing repair',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
