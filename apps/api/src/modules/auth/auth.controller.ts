import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  AuthResponseDto,
  RefreshResponseDto,
  MeResponseDto,
} from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { JwtRefreshPayload } from './strategies/jwt-refresh.strategy';

@ApiTags('Auth')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── POST /v1/auth/login ────────────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @ApiOperation({ summary: 'Authenticate user and get tokens' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'INVALID_CREDENTIALS — wrong email or password' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN — user account is deactivated' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  // ─── POST /v1/auth/register ─────────────────────────────────────────────────

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'ALREADY_EXISTS — email already registered for this property' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  // ─── POST /v1/auth/refresh ──────────────────────────────────────────────────

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'New access token generated',
    type: RefreshResponseDto,
  })
  @ApiResponse({ status: 401, description: 'REFRESH_TOKEN_EXPIRED or TOKEN_INVALID' })
  async refresh(
    @CurrentUser() user: JwtRefreshPayload,
  ): Promise<RefreshResponseDto> {
    return this.authService.refresh(user.sub, user.refreshToken);
  }

  // ─── POST /v1/auth/logout ──────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED — not authenticated' })
  async logout(@CurrentUser('sub') userId: number): Promise<void> {
    await this.authService.logout(userId);
  }

  // ─── GET /v1/auth/me ────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile',
    type: MeResponseDto,
  })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED — not authenticated' })
  async getMe(@CurrentUser() user: JwtPayload): Promise<MeResponseDto> {
    return this.authService.getMe(user.sub);
  }
}
