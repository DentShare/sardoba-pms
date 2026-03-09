import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetBlacklistDto {
  @ApiProperty({
    example: 'Property damage in room 305',
    description: 'Reason for blacklisting the guest',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
}
