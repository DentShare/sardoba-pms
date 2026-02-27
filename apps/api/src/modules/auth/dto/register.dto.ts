import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Alisher Karimov', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'admin@sardoba.uz', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ example: '+998901234567', description: 'Phone number (+998...)' })
  @IsOptional()
  @IsString()
  @Matches(/^\+998\d{9}$/, {
    message: 'Phone must be in format +998XXXXXXXXX',
  })
  phone?: string;

  @ApiProperty({
    example: 'P@ssw0rd!',
    description: 'Password: min 8 chars, must contain uppercase, lowercase, digit, and special character',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
  })
  password!: string;

  @ApiPropertyOptional({ example: 'Sardoba Hotel', description: 'Property name (for self-registration)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  property_name?: string;

  @ApiPropertyOptional({ example: 1, description: 'Property ID the user belongs to (for admin-created users)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  property_id?: number;

}
