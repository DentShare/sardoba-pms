import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../../database/entities/user.entity';

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

  @ApiProperty({ example: 'P@ssw0rd!', description: 'Password (min 8 chars)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 1, description: 'Property ID the user belongs to' })
  @IsInt()
  @Min(1)
  property_id!: number;

  @ApiProperty({
    example: 'admin',
    description: 'User role',
    enum: ['owner', 'admin', 'viewer'],
  })
  @IsString()
  @IsIn(['owner', 'admin', 'viewer'])
  role!: UserRole;
}
