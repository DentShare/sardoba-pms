import { IsString, IsInt, Min, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddEarlyCheckinDto {
  @ApiProperty({
    example: '10:00',
    description: 'Early check-in time in HH:MM format',
  })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'time must be in HH:MM format (e.g. 10:00)',
  })
  time!: string;

  @ApiProperty({
    example: 5000000,
    description: 'Early check-in price in tiyin',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  price!: number;
}
