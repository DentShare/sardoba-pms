import {
  IsInt,
  IsString,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReferralDto {
  @ApiProperty({ description: 'Guest ID of the referrer', example: 1 })
  @IsInt()
  referrerGuestId!: number;

  @ApiPropertyOptional({ description: 'Guest ID of the referred person', example: 2 })
  @IsOptional()
  @IsInt()
  referredGuestId?: number;

  @ApiProperty({ description: 'Referral code', example: 'REF-1-A3B9C2' })
  @IsString()
  referralCode!: string;

  @ApiPropertyOptional({ description: 'Booking ID created by the referred guest', example: 10 })
  @IsOptional()
  @IsInt()
  referredBookingId?: number;

  @ApiPropertyOptional({
    enum: ['discount', 'free_night', 'credit'],
    description: 'Type of bonus to award',
    example: 'discount',
  })
  @IsOptional()
  @IsEnum(['discount', 'free_night', 'credit'] as const)
  bonusType?: 'discount' | 'free_night' | 'credit';

  @ApiPropertyOptional({
    description: 'Bonus value in tiyin (for discount/credit) or number of nights',
    example: 50000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  bonusValue?: number;
}
