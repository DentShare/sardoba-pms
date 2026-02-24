import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SardobaException, ErrorCode } from '@sardoba/shared';

/**
 * Guard for refresh token endpoints.
 * Uses the 'jwt-refresh' Passport strategy to validate refresh tokens.
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  handleRequest<TUser = any>(err: any, user: TUser, info: any): TUser {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new SardobaException(
          ErrorCode.REFRESH_TOKEN_EXPIRED,
          undefined,
          'Refresh token has expired',
        );
      }
      throw new SardobaException(
        ErrorCode.TOKEN_INVALID,
        undefined,
        'Invalid refresh token',
      );
    }
    return user;
  }
}
