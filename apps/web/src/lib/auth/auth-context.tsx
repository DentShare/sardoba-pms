'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';
import type { User } from '@sardoba/shared';

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Map API response to User type (interceptor handles snake→camel) */
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

  // Fetch current user on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(mapUser(data as Record<string, unknown>));
      })
      .catch(() => {
        // Token is invalid, clear auth state
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        document.cookie = 'access_token=; path=/; max-age=0';
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<Record<string, unknown>>('/auth/login', { email, password });

    // Global interceptor converts snake_case → camelCase, so use camelCase keys
    const raw = data as Record<string, unknown>;
    const accessToken = (raw.accessToken ?? raw.access_token) as string;
    const refreshToken = (raw.refreshToken ?? raw.refresh_token) as string;
    const expiresIn = (raw.expiresIn ?? raw.expires_in ?? 86400) as number;

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);

    // Set cookie for middleware
    document.cookie = `access_token=${accessToken}; path=/; max-age=${expiresIn}; SameSite=Strict; Secure`;

    setUser(mapUser(raw.user as Record<string, unknown>));
  }, []);

  const logout = useCallback(() => {
    // Call logout endpoint (fire-and-forget)
    api.post('/auth/logout').catch(() => {
      // Ignore errors during logout
    });

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    document.cookie = 'access_token=; path=/; max-age=0';
    setUser(null);
    window.location.href = '/login';
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
