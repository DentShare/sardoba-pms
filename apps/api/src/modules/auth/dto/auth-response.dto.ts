import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Alisher Karimov' })
  name!: string;

  @ApiProperty({ example: 'admin', enum: ['owner', 'admin', 'viewer'] })
  role!: string;

  @ApiProperty({ example: 1 })
  property_id!: number;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token (TTL 24h)',
  })
  access_token!: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token (TTL 7d)',
  })
  refresh_token!: string;

  @ApiProperty({ example: 86400, description: 'Token TTL in seconds' })
  expires_in!: number;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}

export class RefreshResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'New JWT access token',
  })
  access_token!: string;

  @ApiProperty({ example: 86400, description: 'Token TTL in seconds' })
  expires_in!: number;
}

export class MeResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Alisher Karimov' })
  name!: string;

  @ApiProperty({ example: 'admin@sardoba.uz' })
  email!: string;

  @ApiProperty({ example: 'admin', enum: ['owner', 'admin', 'viewer'] })
  role!: string;

  @ApiProperty({ example: 1 })
  property_id!: number;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty({ example: '2025-06-01T12:00:00Z', nullable: true })
  last_login_at!: string | null;

  @ApiProperty({ example: '2025-01-15T10:30:00Z' })
  created_at!: string;
}
