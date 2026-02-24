import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../strategies/jwt.strategy';

/**
 * Parameter decorator that extracts the authenticated user (JWT payload)
 * from the request object.
 *
 * Usage:
 *   @Get('me')
 *   getMe(@CurrentUser() user: JwtPayload) { ... }
 *
 *   @Get('me')
 *   getMe(@CurrentUser('sub') userId: number) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (data) {
      return user[data];
    }

    return user;
  },
);
