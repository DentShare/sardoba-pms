import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtPayload } from '../strategies/jwt.strategy';
import { SardobaException, ErrorCode } from '@sardoba/shared';

/**
 * Guard that ensures the authenticated user belongs to the property
 * referenced in the request (via URL params or body).
 *
 * Logic:
 * - Extracts `property_id` from `req.params.property_id` or `req.body.property_id`
 * - If no property_id in the request => pass (no restriction)
 * - If user role is 'owner' => pass (owners can access all properties)
 * - If user's propertyId matches the requested property_id => pass
 * - Otherwise => 403 FORBIDDEN
 *
 * Must be used after JwtAuthGuard so that `request.user` is populated.
 */
@Injectable()
export class PropertyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    // Extract property_id from params or body
    const propertyId = Number(
      request.params?.property_id ?? request.body?.property_id,
    );

    // No property_id in request => skip check
    if (!propertyId || isNaN(propertyId)) {
      return true;
    }

    // Owner role can access all properties
    if (user.role === 'owner') {
      return true;
    }

    // Check if user belongs to this property
    if (user.propertyId === propertyId) {
      return true;
    }

    throw new SardobaException(
      ErrorCode.FORBIDDEN,
      { userPropertyId: user.propertyId, requestedPropertyId: propertyId },
      'Access denied: you do not belong to this property',
    );
  }
}
