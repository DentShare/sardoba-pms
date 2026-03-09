import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsNumber,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateAgencyDto {
  @ApiProperty({ example: 'Uzbekistan Travel', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Алишер Каримов', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contact_person?: string;

  @ApiPropertyOptional({ example: '+998901234567', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: 'info@uztravel.com', maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    example: 10.0,
    description: 'Commission percentage (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @Type(() => Number)
  commission?: number;

  @ApiPropertyOptional({ example: 'Специализируется на туристах из России' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
