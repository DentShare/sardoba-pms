import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../../../database/entities/user.entity';

/**
 * JWT payload structure embedded in access tokens.
 */
export interface JwtPayload {
  sub: number;         // user.id
  role: UserRole;      // owner | admin | viewer
  propertyId: number;
  iat: number;
  exp: number;
}

/**
 * Passport JWT strategy for access token validation.
 * Extracts the JWT from the Authorization Bearer header,
 * verifies it against JWT_SECRET, and attaches the decoded
 * payload to `request.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Called by Passport after token verification.
   * The returned object is set as `request.user`.
   */
  validate(payload: JwtPayload): JwtPayload {
    return {
      sub: payload.sub,
      role: payload.role,
      propertyId: payload.propertyId,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
