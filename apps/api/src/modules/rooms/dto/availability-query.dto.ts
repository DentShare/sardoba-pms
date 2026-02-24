import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AvailabilityQueryDto {
  @ApiProperty({
    example: '2025-06-01',
    description: 'Start date (YYYY-MM-DD)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from must be in YYYY-MM-DD format',
  })
  from!: string;

  @ApiProperty({
    example: '2025-06-10',
    description: 'End date (YYYY-MM-DD)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to must be in YYYY-MM-DD format',
  })
  to!: string;
}
