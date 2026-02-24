import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsEmail,
  IsDateString,
  Matches,
  MaxLength,
  Length,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const DOCUMENT_TYPES = ['passport', 'id_card', 'other'] as const;
type DocumentType = (typeof DOCUMENT_TYPES)[number];

export class UpdateGuestDto {
  @ApiPropertyOptional({ example: 'Anvar', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  first_name?: string;

  @ApiPropertyOptional({ example: 'Karimov', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @ApiPropertyOptional({
    example: '+998901234567',
    description: 'Uzbekistan phone number in format +998XXXXXXXXX',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+998\d{9}$/, {
    message: 'phone must be a valid Uzbekistan number in format +998XXXXXXXXX',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'anvar@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    example: 'UZ',
    description: 'ISO 3166-1 alpha-2 country code',
    minLength: 2,
    maxLength: 2,
  })
  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'nationality must be a 2-letter ISO alpha-2 code' })
  nationality?: string;

  @ApiPropertyOptional({
    enum: DOCUMENT_TYPES,
    example: 'passport',
  })
  @IsOptional()
  @IsEnum(DOCUMENT_TYPES, {
    message: `document_type must be one of: ${DOCUMENT_TYPES.join(', ')}`,
  })
  document_type?: DocumentType;

  @ApiPropertyOptional({
    example: 'AA1234567',
    description: 'Document number (will be encrypted at rest)',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  document_number?: string;

  @ApiPropertyOptional({
    example: '1990-05-15',
    description: 'Date of birth in YYYY-MM-DD format',
  })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_vip?: boolean;

  @ApiPropertyOptional({ example: 'Frequent guest, prefers room with view' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
