import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { User, UserRole } from '../../database/entities/user.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

const mockUser: Partial<User> = {
  id: 1,
  propertyId: 42,
  name: 'Test User',
  email: 'test@sardoba.uz',
  passwordHash: '', // will be set in beforeEach
  role: 'admin' as UserRole,
  isActive: true,
  refreshToken: null,
  lastLoginAt: null,
  createdAt: new Date('2025-01-15T10:30:00Z'),
  updatedAt: new Date('2025-01-15T10:30:00Z'),
};

const mockInactiveUser: Partial<User> = {
  ...mockUser,
  id: 2,
  email: 'inactive@sardoba.uz',
  isActive: false,
};

const createMockRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

const createMockJwtService = () => ({
  sign: jest.fn().mockReturnValue('mock-access-token'),
  signAsync: jest.fn().mockResolvedValue('mock-token'),
  verify: jest.fn(),
});

const createMockConfigService = () => ({
  get: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, any> = {
      JWT_SECRET: 'test-jwt-secret-minimum-32-characters!!',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-min-32-chars!!',
      JWT_EXPIRES_IN: 86400,
      JWT_REFRESH_EXPIRES_IN: 604800,
    };
    return config[key] ?? defaultValue;
  }),
});

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: ReturnType<typeof createMockRepository>;
  let jwtService: ReturnType<typeof createMockJwtService>;
  let configService: ReturnType<typeof createMockConfigService>;

  beforeEach(async () => {
    userRepository = createMockRepository();
    jwtService = createMockJwtService();
    configService = createMockConfigService();

    // Generate a real bcrypt hash for the test password
    const passwordHash = await bcrypt.hash('correct-password', 12);
    (mockUser as any).passwordHash = passwordHash;
    (mockInactiveUser as any).passwordHash = passwordHash;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── LOGIN ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      jwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');
      userRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.login({
        email: 'test@sardoba.uz',
        password: 'correct-password',
      });

      expect(result).toHaveProperty('access_token', 'mock-access-token');
      expect(result).toHaveProperty('refresh_token', 'mock-refresh-token');
      expect(result).toHaveProperty('expires_in', 86400);
      expect(result.user).toEqual({
        id: 1,
        name: 'Test User',
        role: 'admin',
        property_id: 42,
      });

      // Verify refresh token was stored in DB
      expect(userRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
        }),
      );
    });

    it('should throw INVALID_CREDENTIALS on wrong password', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.login({
          email: 'test@sardoba.uz',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(SardobaException);

      try {
        await service.login({
          email: 'test@sardoba.uz',
          password: 'wrong-password',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.INVALID_CREDENTIALS);
      }
    });

    it('should throw INVALID_CREDENTIALS when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@sardoba.uz',
          password: 'any-password',
        }),
      ).rejects.toThrow(SardobaException);

      try {
        await service.login({
          email: 'nonexistent@sardoba.uz',
          password: 'any-password',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.INVALID_CREDENTIALS);
      }
    });

    it('should throw FORBIDDEN when user is inactive', async () => {
      userRepository.findOne.mockResolvedValue(mockInactiveUser);

      await expect(
        service.login({
          email: 'inactive@sardoba.uz',
          password: 'correct-password',
        }),
      ).rejects.toThrow(SardobaException);

      try {
        await service.login({
          email: 'inactive@sardoba.uz',
          password: 'correct-password',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.FORBIDDEN);
      }
    });

    it('should scope login to property_id when provided', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      jwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');
      userRepository.update.mockResolvedValue({ affected: 1 });

      await service.login({
        email: 'test@sardoba.uz',
        password: 'correct-password',
        property_id: 42,
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@sardoba.uz', propertyId: 42 },
      });
    });
  });

  // ─── REGISTER ───────────────────────────────────────────────────────────────

  describe('register', () => {
    it('should create a new user and return tokens', async () => {
      userRepository.findOne.mockResolvedValue(null); // no existing user
      userRepository.create.mockReturnValue({
        id: 3,
        propertyId: 42,
        name: 'New User',
        email: 'new@sardoba.uz',
        role: 'viewer',
        isActive: true,
      });
      userRepository.save.mockResolvedValue({
        id: 3,
        propertyId: 42,
        name: 'New User',
        email: 'new@sardoba.uz',
        role: 'viewer',
        isActive: true,
      });
      jwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');
      userRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.register({
        name: 'New User',
        email: 'new@sardoba.uz',
        password: 'securepassword',
        property_id: 42,
        role: 'viewer',
      });

      expect(result).toHaveProperty('access_token', 'mock-access-token');
      expect(result).toHaveProperty('refresh_token', 'mock-refresh-token');
      expect(result.user).toEqual({
        id: 3,
        name: 'New User',
        role: 'viewer',
        property_id: 42,
      });
    });

    it('should throw ALREADY_EXISTS when email is taken for property', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.register({
          name: 'Duplicate User',
          email: 'test@sardoba.uz',
          password: 'securepassword',
          property_id: 42,
          role: 'admin',
        }),
      ).rejects.toThrow(SardobaException);

      try {
        await service.register({
          name: 'Duplicate User',
          email: 'test@sardoba.uz',
          password: 'securepassword',
          property_id: 42,
          role: 'admin',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.ALREADY_EXISTS);
      }
    });
  });

  // ─── REFRESH ────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('should return new access_token on valid refresh_token', async () => {
      const refreshToken = 'valid-refresh-token';
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);

      const userWithRefresh = {
        ...mockUser,
        refreshToken: hashedRefreshToken,
      };

      userRepository.findOne.mockResolvedValue(userWithRefresh);
      jwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refresh(1, refreshToken);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('expires_in', 86400);
    });

    it('should throw TOKEN_INVALID when refresh_token does not match', async () => {
      const hashedRefreshToken = await bcrypt.hash('original-token', 12);

      const userWithRefresh = {
        ...mockUser,
        refreshToken: hashedRefreshToken,
      };

      userRepository.findOne.mockResolvedValue(userWithRefresh);

      await expect(
        service.refresh(1, 'wrong-refresh-token'),
      ).rejects.toThrow(SardobaException);

      try {
        await service.refresh(1, 'wrong-refresh-token');
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.TOKEN_INVALID);
      }
    });

    it('should throw TOKEN_INVALID when user has no stored refresh token', async () => {
      const userWithoutRefresh = { ...mockUser, refreshToken: null };
      userRepository.findOne.mockResolvedValue(userWithoutRefresh);

      await expect(
        service.refresh(1, 'any-token'),
      ).rejects.toThrow(SardobaException);

      try {
        await service.refresh(1, 'any-token');
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.TOKEN_INVALID);
      }
    });

    it('should throw TOKEN_INVALID when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.refresh(999, 'any-token'),
      ).rejects.toThrow(SardobaException);

      try {
        await service.refresh(999, 'any-token');
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.TOKEN_INVALID);
      }
    });

    it('should throw FORBIDDEN when user is inactive', async () => {
      const refreshToken = 'valid-refresh-token';
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);

      const inactiveWithRefresh = {
        ...mockInactiveUser,
        refreshToken: hashedRefreshToken,
      };

      userRepository.findOne.mockResolvedValue(inactiveWithRefresh);

      await expect(
        service.refresh(2, refreshToken),
      ).rejects.toThrow(SardobaException);

      try {
        await service.refresh(2, refreshToken);
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.FORBIDDEN);
      }
    });
  });

  // ─── LOGOUT ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should set refresh_token to null in the database', async () => {
      userRepository.update.mockResolvedValue({ affected: 1 });

      await service.logout(1);

      expect(userRepository.update).toHaveBeenCalledWith(1, {
        refreshToken: null,
      });
    });
  });

  // ─── GET ME ─────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('should return user profile data', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getMe(1);

      expect(result).toEqual({
        id: 1,
        name: 'Test User',
        email: 'test@sardoba.uz',
        role: 'admin',
        property_id: 42,
        is_active: true,
        last_login_at: null,
        created_at: expect.any(String),
      });
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getMe(999)).rejects.toThrow(SardobaException);

      try {
        await service.getMe(999);
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
      }
    });
  });
});
