import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidatePromoCodeDto {
  @ApiProperty({ example: 'SUMMER10', description: 'Promo code to validate' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Booking amount in tiyin', example: 50000000 })
  @IsInt()
  @Min(0)
  bookingAmount!: number;

  @ApiPropertyOptional({ description: 'Number of nights', example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  nights?: number;

  @ApiPropertyOptional({ description: 'Room ID to check applicability' })
  @IsOptional()
  @IsInt()
  roomId?: number;
}
