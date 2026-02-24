import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from './jwt.strategy';

/**
 * Payload returned by the refresh strategy.
 * Includes the raw refresh token for server-side validation.
 */
export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string;
}

/**
 * Passport JWT strategy for refresh token validation.
 * Uses JWT_REFRESH_SECRET and extracts the raw token
 * from the Authorization header for DB comparison.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  /**
   * Called by Passport after refresh token verification.
   * Extracts the raw token from the header so the service can
   * compare it with the hashed version stored in the DB.
   */
  validate(req: Request, payload: JwtPayload): JwtRefreshPayload {
    const authHeader = req.get('Authorization') ?? '';
    const refreshToken = authHeader.replace('Bearer', '').trim();

    return {
      sub: payload.sub,
      role: payload.role,
      propertyId: payload.propertyId,
      iat: payload.iat,
      exp: payload.exp,
      refreshToken,
    };
  }
}
