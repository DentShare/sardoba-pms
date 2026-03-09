'use client';

import { useAuth } from '@/lib/auth';

/**
 * Returns the current user's property ID from the auth context.
 *
 * The User object returned by GET /auth/me includes `propertyId`,
 * which is set when the user logs in. This hook provides a single
 * source of truth so that no page has to hardcode `PROPERTY_ID = 1`.
 *
 * Falls back to `null` when the user is not yet loaded or not
 * authenticated (callers should treat null as "not ready").
 */
export function usePropertyId(): number | null {
  const { user } = useAuth();
  return user?.propertyId ?? null;
}
