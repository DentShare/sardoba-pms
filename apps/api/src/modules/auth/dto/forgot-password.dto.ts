import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@sardoba.uz', description: 'Email address for password reset' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
