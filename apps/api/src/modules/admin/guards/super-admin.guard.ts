import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { SardobaException, ErrorCode } from '@sardoba/shared';

/**
 * Guard that restricts access to super_admin role only.
 * Must be used after JwtAuthGuard.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user || user.role !== 'super_admin') {
      throw new SardobaException(
        ErrorCode.FORBIDDEN,
        undefined,
        'Super admin access required',
      );
    }

    return true;
  }
}
