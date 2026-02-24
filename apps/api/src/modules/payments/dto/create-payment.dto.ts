import {
  IsInt,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const PAYMENT_METHODS = [
  'cash',
  'card',
  'transfer',
  'payme',
  'click',
  'other',
] as const;
type PaymentMethodEnum = (typeof PAYMENT_METHODS)[number];

export class CreatePaymentDto {
  @ApiProperty({ example: 5000000, description: 'Amount in tiyin (1 som = 100 tiyin)' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({
    enum: PAYMENT_METHODS,
    example: 'cash',
    description: 'Payment method',
  })
  @IsEnum(PAYMENT_METHODS, {
    message: `method must be one of: ${PAYMENT_METHODS.join(', ')}`,
  })
  method!: PaymentMethodEnum;

  @ApiPropertyOptional({
    example: '2025-07-01T14:00:00Z',
    description: 'Payment date (ISO 8601). Defaults to now.',
  })
  @IsOptional()
  @IsDateString()
  paid_at?: string;

  @ApiPropertyOptional({ example: 'Partial payment for first night', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @ApiPropertyOptional({ example: 'TXN-123456', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;
}
