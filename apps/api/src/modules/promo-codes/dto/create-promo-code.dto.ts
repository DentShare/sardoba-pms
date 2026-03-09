import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromoCodeDto {
  @ApiProperty({ example: 'SUMMER10', description: 'Promo code string (will be uppercased)' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ enum: ['percent', 'fixed'], example: 'percent' })
  @IsEnum(['percent', 'fixed'] as const)
  discountType!: 'percent' | 'fixed';

  @ApiProperty({
    description: 'Percent (1-100) or fixed amount in tiyin',
    example: 10,
  })
  @IsInt()
  @Min(1)
  discountValue!: number;

  @ApiPropertyOptional({ description: 'Max number of uses, null = unlimited' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({ default: 1, description: 'Minimum nights for the booking' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  minNights?: number;

  @ApiPropertyOptional({ description: 'Minimum booking amount in tiyin' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Room IDs this code applies to. Empty = all rooms' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  appliesToRooms?: number[];

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  validTo?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
