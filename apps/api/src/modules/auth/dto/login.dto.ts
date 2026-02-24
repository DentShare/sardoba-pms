import { IsEmail, IsNotEmpty, IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@sardoba.uz', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'P@ssw0rd!', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({ example: 1, description: 'Property ID to login into' })
  @IsOptional()
  @IsInt()
  @Min(1)
  property_id?: number;
}
