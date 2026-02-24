import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator that marks a route as public (no authentication required).
 * When applied, JwtAuthGuard will skip token validation.
 *
 * Usage:
 *   @Public()
 *   @Post('login')
 *   login() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
