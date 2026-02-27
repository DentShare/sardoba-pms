'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@sardoba/shared';

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Map API response to User type (handles both snake_case and camelCase keys) */
function mapUser(raw: Record<string, unknown>): User {
  return {
    id: raw.id as number,
    propertyId: (raw.propertyId ?? raw.property_id) as number,
    name: raw.name as string,
    email: (raw.email ?? '') as string,
    role: raw.role as User['role'],
    isActive: (raw.isActive ?? raw.is_active ?? true) as boolean,
    lastLoginAt: raw.lastLoginAt ? new Date(raw.lastLoginAt as string) : undefined,
    createdAt: raw.createdAt ? new Date(raw.createdAt as string) : new Date(),
  };
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user on mount via the proxy route (cookies sent automatically)
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) {
          setUser(null);
          return;
        }
        const data = await res.json();
        setUser(mapUser(data as Record<string, unknown>));
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({})) as Record<string, unknown>;
      const errorMsg =
        (errorData.error as Record<string, string> | undefined)?.message ||
        (errorData.message as string) ||
        'Login failed';
      throw new Error(errorMsg);
    }

    const data = await res.json();
    setUser(mapUser(data.user as Record<string, unknown>));
  }, []);

  const register = useCallback(async (formData: Record<string, unknown>) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({})) as Record<string, unknown>;
      const errorMsg =
        (errorData.error as Record<string, string> | undefined)?.message ||
        (errorData.message as string) ||
        'Registration failed';
      throw new Error(errorMsg);
    }

    const data = await res.json();
    setUser(mapUser(data.user as Record<string, unknown>));
  }, []);

  const logout = useCallback(() => {
    // Call proxy logout endpoint (clears HttpOnly cookies server-side)
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    }).catch(() => {
      // Ignore errors during logout
    });

    setUser(null);
    window.location.href = '/login';
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
