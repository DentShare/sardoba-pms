import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../../database/entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Decorator that sets the required roles for an endpoint.
 * Used in conjunction with RolesGuard.
 *
 * Usage:
 *   @Roles('owner', 'admin')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   create() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
