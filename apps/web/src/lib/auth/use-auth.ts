'use client';

import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './auth-context';

/**
 * Hook to access the authentication context.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Make sure your component is wrapped in <AuthProvider>.',
    );
  }

  return context;
}
