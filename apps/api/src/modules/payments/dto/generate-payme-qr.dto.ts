import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GeneratePaymeQrDto {
  @ApiProperty({
    example: 42,
    description: 'Booking ID to generate payment QR for',
  })
  @IsInt()
  @Type(() => Number)
  bookingId!: number;

  @ApiPropertyOptional({
    example: 5000000,
    description:
      'Amount in tiyin (1 som = 100 tiyin). Defaults to remaining balance if not specified.',
  })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Type(() => Number)
  amount?: number;
}
