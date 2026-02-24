import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../strategies/jwt.strategy';
import { UserRole } from '../../../database/entities/user.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';

/**
 * Guard that checks if the authenticated user has one of the required roles.
 * Must be used after JwtAuthGuard so that `request.user` is populated.
 *
 * Usage:
 *   @Roles('owner', 'admin')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   create() { ... }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator => allow all authenticated users
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new SardobaException(
        ErrorCode.FORBIDDEN,
        { requiredRoles },
        'Insufficient permissions',
      );
    }

    return true;
  }
}
