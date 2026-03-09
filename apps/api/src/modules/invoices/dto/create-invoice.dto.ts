import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateInvoiceDto {
  @ApiProperty({
    example: 42,
    description: 'Booking ID to create invoice for',
  })
  @IsInt()
  @Type(() => Number)
  bookingId!: number;

  @ApiProperty({
    example: 'ООО "Silk Road Travel"',
    description: 'Company name for the invoice',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  companyName!: string;

  @ApiPropertyOptional({
    example: '123456789',
    description: 'Company INN (tax identification number)',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  companyInn?: string;

  @ApiPropertyOptional({
    example: 'г. Ташкент, ул. Навои 10',
    description: 'Company legal address',
  })
  @IsOptional()
  @IsString()
  companyAddress?: string;

  @ApiPropertyOptional({
    example: 'АКБ "Капиталбанк"',
    description: 'Company bank name',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyBank?: string;

  @ApiPropertyOptional({
    example: '20208000123456789012',
    description: 'Company bank account number',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  companyAccount?: string;

  @ApiPropertyOptional({
    example: '01057',
    description: 'Company bank MFO code',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  companyMfo?: string;
}
