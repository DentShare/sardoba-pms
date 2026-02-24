import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../../database/entities/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PropertyGuard } from './guards/property.guard';

@Module({
  imports: [
    // Register User entity for TypeORM injection
    TypeOrmModule.forFeature([User]),

    // Passport with default JWT strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT module with async config from environment
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<number>('JWT_EXPIRES_IN', 86400),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
    RolesGuard,
    PropertyGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    PropertyGuard,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}
