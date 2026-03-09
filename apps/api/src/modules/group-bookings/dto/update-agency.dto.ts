import {
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  IsBoolean,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateAgencyDto {
  @ApiPropertyOptional({ example: 'Uzbekistan Travel', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

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

  @ApiPropertyOptional({ example: true, description: 'Whether the agency is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
