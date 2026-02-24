import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../database/entities/user.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── LOGIN ──────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const { email, password, property_id } = dto;

    // Find user by email (optionally scoped to property)
    const whereClause: Record<string, any> = { email };
    if (property_id) {
      whereClause.propertyId = property_id;
    }

    const user = await this.userRepository.findOne({
      where: whereClause,
    });

    if (!user) {
      throw new SardobaException(
        ErrorCode.INVALID_CREDENTIALS,
        undefined,
        'Invalid email or password',
      );
    }

    // Check if user is active
    if (!user.isActive) {
      throw new SardobaException(
        ErrorCode.FORBIDDEN,
        undefined,
        'User account is deactivated',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new SardobaException(
        ErrorCode.INVALID_CREDENTIALS,
        undefined,
        'Invalid email or password',
      );
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store hashed refresh token in DB and update last login
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, BCRYPT_SALT_ROUNDS);
    await this.userRepository.update(user.id, {
      refreshToken: hashedRefreshToken,
      lastLoginAt: new Date(),
    });

    this.logger.log(`User ${user.email} logged in (property: ${user.propertyId})`);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: this.getAccessTokenTtl(),
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        property_id: user.propertyId,
      },
    };
  }

  // ─── REGISTER ───────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const { name, email, password, property_id, role } = dto;

    // Check if email already exists for this property
    const existingUser = await this.userRepository.findOne({
      where: { email, propertyId: property_id },
    });

    if (existingUser) {
      throw new SardobaException(
        ErrorCode.ALREADY_EXISTS,
        { email, property_id },
        'User with this email already exists for this property',
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Create user
    const user = this.userRepository.create({
      name,
      email,
      passwordHash,
      propertyId: property_id,
      role,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(savedUser);

    // Store hashed refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, BCRYPT_SALT_ROUNDS);
    await this.userRepository.update(savedUser.id, {
      refreshToken: hashedRefreshToken,
      lastLoginAt: new Date(),
    });

    this.logger.log(`User ${savedUser.email} registered (property: ${savedUser.propertyId})`);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: this.getAccessTokenTtl(),
      user: {
        id: savedUser.id,
        name: savedUser.name,
        role: savedUser.role,
        property_id: savedUser.propertyId,
      },
    };
  }

  // ─── REFRESH ────────────────────────────────────────────────────────────────

  async refresh(userId: number, refreshToken: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      throw new SardobaException(
        ErrorCode.TOKEN_INVALID,
        undefined,
        'Invalid refresh token',
      );
    }

    // Check if user is active
    if (!user.isActive) {
      throw new SardobaException(
        ErrorCode.FORBIDDEN,
        undefined,
        'User account is deactivated',
      );
    }

    // Compare the provided refresh token with the stored hash
    const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isRefreshTokenValid) {
      throw new SardobaException(
        ErrorCode.TOKEN_INVALID,
        undefined,
        'Invalid refresh token',
      );
    }

    // Generate new access token only
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      propertyId: user.propertyId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.getAccessTokenTtl(),
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`Token refreshed for user ${user.email}`);

    return {
      access_token: accessToken,
      expires_in: this.getAccessTokenTtl(),
    };
  }

  // ─── LOGOUT ─────────────────────────────────────────────────────────────────

  async logout(userId: number): Promise<void> {
    // Invalidate refresh token by setting it to NULL
    await this.userRepository.update(userId, {
      refreshToken: null,
    });

    this.logger.log(`User ${userId} logged out`);
  }

  // ─── GET ME ─────────────────────────────────────────────────────────────────

  async getMe(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        undefined,
        'User not found',
      );
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      property_id: user.propertyId,
      is_active: user.isActive,
      last_login_at: user.lastLoginAt?.toISOString() ?? null,
      created_at: user.createdAt.toISOString(),
    };
  }

  // ─── PRIVATE HELPERS ────────────────────────────────────────────────────────

  private async generateTokens(user: User) {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      role: user.role,
      propertyId: user.propertyId,
      iat: 0, // will be overridden by jwt.sign
      exp: 0, // will be overridden by jwt.sign
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: payload.sub, role: payload.role, propertyId: payload.propertyId },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.getAccessTokenTtl(),
        },
      ),
      this.jwtService.signAsync(
        { sub: payload.sub, role: payload.role, propertyId: payload.propertyId },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.getRefreshTokenTtl(),
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private getAccessTokenTtl(): number {
    return this.configService.get<number>('JWT_EXPIRES_IN', 86400);
  }

  private getRefreshTokenTtl(): number {
    return this.configService.get<number>('JWT_REFRESH_EXPIRES_IN', 604800);
  }
}
