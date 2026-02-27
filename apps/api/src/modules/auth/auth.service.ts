import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User } from '../../database/entities/user.entity';
import { Property } from '../../database/entities/property.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { EmailService } from '../notifications/email/email.service';

const BCRYPT_SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_HOURS = 1;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
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
    const { name, email, password, phone, property_name, property_id } = dto;

    let resolvedPropertyId = property_id;

    // If property_name is provided and no property_id, create a new property (self-registration)
    if (property_name && !property_id) {
      // Check if email already exists globally (for self-registration)
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        throw new SardobaException(
          ErrorCode.ALREADY_EXISTS,
          { email },
          'Пользователь с таким email уже существует',
        );
      }

      // Create a new property
      const property = this.propertyRepository.create({
        name: property_name,
        city: 'Tashkent',
        address: 'To be updated',
        phone: phone || '+998000000000',
        currency: 'UZS',
        timezone: 'Asia/Tashkent',
        locale: 'ru',
      });

      const savedProperty = await this.propertyRepository.save(property);
      resolvedPropertyId = savedProperty.id;

      this.logger.log(`New property "${property_name}" created (ID: ${resolvedPropertyId})`);
    } else if (property_id) {
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
    } else {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        undefined,
        'Either property_name or property_id must be provided',
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Create user
    const user = this.userRepository.create({
      name,
      email,
      phone: phone || null,
      passwordHash,
      propertyId: resolvedPropertyId!,
      role: 'owner',
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

  // ─── FORGOT PASSWORD ──────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      this.logger.warn(`Forgot password attempt for non-existent email: ${email}`);
      return { message: 'If an account with this email exists, a reset link has been sent.' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Store hashed token in DB
    await this.userRepository.update(user.id, {
      resetToken: hashedToken,
      resetTokenExpiresAt: expiresAt,
    });

    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3002')}/reset-password?token=${resetToken}`;

    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.name,
      resetUrl,
    );

    this.logger.log(`Password reset email sent to ${email}`);

    return { message: 'If an account with this email exists, a reset link has been sent.' };
  }

  // ─── RESET PASSWORD ───────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const { token, password } = dto;

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userRepository.findOne({
      where: { resetToken: hashedToken },
    });

    if (!user) {
      throw new SardobaException(
        ErrorCode.TOKEN_INVALID,
        undefined,
        'Недействительный или истёкший токен сброса пароля',
      );
    }

    // Check if token has expired
    if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      // Clear the expired token
      await this.userRepository.update(user.id, {
        resetToken: null,
        resetTokenExpiresAt: null,
      });

      throw new SardobaException(
        ErrorCode.TOKEN_EXPIRED,
        undefined,
        'Токен сброса пароля истёк. Запросите новый.',
      );
    }

    // Hash new password and clear reset token
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    await this.userRepository.update(user.id, {
      passwordHash,
      resetToken: null,
      resetTokenExpiresAt: null,
      refreshToken: null, // Invalidate all existing sessions
    });

    this.logger.log(`Password reset for user ${user.email}`);

    return { message: 'Пароль успешно изменён. Теперь вы можете войти с новым паролем.' };
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
    const payload = {
      sub: user.id,
      role: user.role,
      propertyId: user.propertyId,
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
