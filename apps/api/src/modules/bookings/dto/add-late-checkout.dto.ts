import { IsString, IsInt, Min, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddLateCheckoutDto {
  @ApiProperty({
    example: '18:00',
    description: 'Late check-out time in HH:MM format',
  })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'time must be in HH:MM format (e.g. 18:00)',
  })
  time!: string;

  @ApiProperty({
    example: 5000000,
    description: 'Late check-out price in tiyin',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  price!: number;
}
