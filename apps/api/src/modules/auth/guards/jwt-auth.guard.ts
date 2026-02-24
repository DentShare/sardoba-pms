import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SardobaException, ErrorCode } from '@sardoba/shared';

/**
 * Guard that requires a valid JWT access token.
 * Skips authentication for routes decorated with @Public().
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard)         // on a single route
 *   @UseGuards(JwtAuthGuard)         // on a controller class
 *
 * Or register globally in AuthModule to protect all routes by default.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * Override to throw SardobaException instead of generic UnauthorizedException.
   */
  handleRequest<TUser = any>(err: any, user: TUser, info: any): TUser {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new SardobaException(ErrorCode.TOKEN_EXPIRED, undefined, 'Access token has expired');
      }
      throw new SardobaException(ErrorCode.AUTH_REQUIRED, undefined, 'Authentication required');
    }
    return user;
  }
}
