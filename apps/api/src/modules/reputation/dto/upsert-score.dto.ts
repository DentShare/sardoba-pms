import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertScoreDto {
  @ApiProperty({
    enum: ['google', 'booking_com', 'tripadvisor', 'airbnb'],
    example: 'google',
    description: 'Review platform identifier',
  })
  @IsEnum(['google', 'booking_com', 'tripadvisor', 'airbnb'] as const)
  platform!: 'google' | 'booking_com' | 'tripadvisor' | 'airbnb';

  @ApiProperty({
    description: 'Review score (0-10)',
    example: 8.5,
    minimum: 0,
    maximum: 10,
  })
  @IsNumber({}, { message: 'Score must be a number' })
  @Min(0)
  @Max(10)
  score!: number;

  @ApiPropertyOptional({
    description: 'Total number of reviews on the platform',
    example: 142,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  reviewCount?: number;
}
